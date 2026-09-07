import { getCloudAuth, getCloudConfig, kvSetMany } from './cloudSync';

type PortalSmartPayload = {
  config?: any;
  clients?: any[];
  cases?: any[];
  invoices?: any[];
  expenses?: any[];
  receipts?: any[];
  logs?: any[];
  reminders?: any[];
  notes?: any[];
  portalMirror?: any;
  syncMeta?: any;
  syncVersion?: string;
  source?: string;
  syncedAt?: string;
};

const INBOUND_MESSAGE_TYPE = 'HELM_PORTAL_SYNC_DATA';
const OUTBOUND_MESSAGE_TYPE = 'HELM_SMART_DATA_CHANGED';
const ACK_TYPE = 'HELM_SMART_SYNC_ACK';
const LAST_SYNC_KEY = 'helm_portal_last_sync';
const SYNC_META_KEY = 'helm_portal_sync_meta';
const CLOUD_PERSISTED_AT_KEY = 'helm_portal_cloud_persisted_at';
const HYDRATED_FINGERPRINT_KEY = 'helm_portal_hydrated_fingerprint';
const SUPPRESS_OUTBOUND_UNTIL = 'helm_portal_bridge_suppress_outbound_until';
const MIRROR_DB_NAME = 'helm_smart_bridge';
const MIRROR_DB_STORE = 'snapshots';
const FULL_SNAPSHOT_KEY = 'helm_portal_full_snapshot';
const CLOUD_MIRROR_INDEX_KEY = 'helm_portal_mirror_index';
const CLOUD_MIRROR_PREFIX = 'helm_portal_mirror';
const CLOUD_CHUNK_SIZE = 250;
const CLOUD_BATCH_SIZE = 8;

const STORAGE_MAP: Record<string, keyof PortalSmartPayload> = {
  legalmaster_config: 'config',
  legalmaster_clients: 'clients',
  legalmaster_cases: 'cases',
  legalmaster_invoices: 'invoices',
  legalmaster_expenses: 'expenses',
  legalmaster_receipts: 'receipts',
  legalmaster_logs: 'logs',
  legalmaster_reminders: 'reminders',
  legalmaster_notes: 'notes',
};

const WATCHED_KEYS = new Set(Object.keys(STORAGE_MAP));
let outboundTimer: number | null = null;
let patched = false;

function isEmbeddedMode() {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('embedded') === '1' || window.parent !== window;
  } catch {
    return window.parent !== window;
  }
}

function safeJsonWrite(key: string, value: any) {
  if (value === undefined || value === null) return true;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[HELM Smart] Could not persist ${key} in localStorage:`, error);
    return false;
  }
}

function safeTextWrite(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeJsonRead<T = any>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isOutboundSuppressed() {
  const until = Number(sessionStorage.getItem(SUPPRESS_OUTBOUND_UNTIL) || '0');
  return Number.isFinite(until) && Date.now() < until;
}

function suppressOutbound(ms = 7000) {
  sessionStorage.setItem(SUPPRESS_OUTBOUND_UNTIL, String(Date.now() + ms));
}

function readCurrentPayload(changedKey?: string): PortalSmartPayload & { changedKey?: string } {
  const payload: PortalSmartPayload & { changedKey?: string } = {
    source: 'helm-smart',
    syncedAt: new Date().toISOString(),
  };

  Object.entries(STORAGE_MAP).forEach(([storageKey, payloadKey]) => {
    const fallback = payloadKey === 'config' ? null : [];
    (payload as any)[payloadKey] = safeJsonRead(storageKey, fallback as any);
  });

  if (changedKey) payload.changedKey = changedKey;
  return payload;
}

function isAnonymousAccessToken(token: string) {
  try {
    const raw = token.split('.')[1];
    if (!raw) return false;
    const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const claims = JSON.parse(atob(padded));
    return claims?.is_anonymous === true;
  } catch {
    return false;
  }
}

function openMirrorDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(MIRROR_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(MIRROR_DB_STORE)) db.createObjectStore(MIRROR_DB_STORE, { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function persistPortalMirrorToIndexedDb(mirror: any, syncedAt: string) {
  if (!mirror || typeof mirror !== 'object') return false;
  const db = await openMirrorDb();
  if (!db) return false;

  return await new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction(MIRROR_DB_STORE, 'readwrite');
      const store = tx.objectStore(MIRROR_DB_STORE);
      store.put({ key: FULL_SNAPSHOT_KEY, value: mirror, updatedAt: syncedAt });
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); resolve(false); };
      tx.onabort = () => { db.close(); resolve(false); };
    } catch {
      try { db.close(); } catch {}
      resolve(false);
    }
  });
}

function buildCloudMirrorRows(mirror: any, syncedAt: string) {
  if (!mirror || typeof mirror !== 'object') return [] as Array<{ key: string; value: any }>;

  const rows: Array<{ key: string; value: any }> = [];
  const index: any = {
    source: mirror.source || 'helm-portal',
    schemaVersion: mirror.schema_version || null,
    fingerprint: mirror.fingerprint || null,
    syncedAt,
    metadata: {},
    tables: {},
  };

  Object.entries(mirror).forEach(([key, value]) => {
    if (!Array.isArray(value)) {
      if (!['counts'].includes(key)) index.metadata[key] = value;
      return;
    }

    const chunks = Math.ceil(value.length / CLOUD_CHUNK_SIZE);
    index.tables[key] = { count: value.length, chunks };
    for (let i = 0; i < chunks; i += 1) {
      rows.push({
        key: `${CLOUD_MIRROR_PREFIX}:${key}:${String(i).padStart(4, '0')}`,
        value: value.slice(i * CLOUD_CHUNK_SIZE, (i + 1) * CLOUD_CHUNK_SIZE),
      });
    }
  });

  index.counts = mirror.counts || Object.fromEntries(Object.entries(index.tables).map(([key, info]: any) => [key, info.count]));
  rows.unshift({ key: CLOUD_MIRROR_INDEX_KEY, value: index });
  return rows;
}

async function persistPortalPayloadToCloud(payload: PortalSmartPayload) {
  const cfg = getCloudConfig();
  if (!cfg) return { mode: 'local' as const, cloudSaved: false, warning: 'cloud-not-configured' };

  const auth = getCloudAuth();
  if (!auth?.accessToken) return { mode: 'local' as const, cloudSaved: false, warning: 'cloud-auth-required' };
  if (isAnonymousAccessToken(auth.accessToken)) return { mode: 'local' as const, cloudSaved: false, warning: 'cloud-anonymous-auth-blocked' };

  const coreRows = Object.entries(STORAGE_MAP)
    .filter(([, payloadKey]) => payload[payloadKey] !== undefined && payload[payloadKey] !== null)
    .map(([storageKey, payloadKey]) => ({ key: storageKey, value: payload[payloadKey] }));

  coreRows.push({
    key: LAST_SYNC_KEY,
    value: {
      syncedAt: payload.syncedAt || new Date().toISOString(),
      source: payload.source || 'helm-portal',
      syncVersion: payload.syncVersion || 'legacy',
      fingerprint: payload.syncMeta?.fingerprint || null,
    },
  });
  coreRows.push({ key: SYNC_META_KEY, value: payload.syncMeta || null });

  try {
    await kvSetMany(coreRows as any, cfg as any);

    const mirrorRows = buildCloudMirrorRows(payload.portalMirror, payload.syncedAt || new Date().toISOString());
    for (let i = 0; i < mirrorRows.length; i += CLOUD_BATCH_SIZE) {
      await kvSetMany(mirrorRows.slice(i, i + CLOUD_BATCH_SIZE) as any, cfg as any);
    }

    const at = new Date().toISOString();
    safeTextWrite(CLOUD_PERSISTED_AT_KEY, at);
    return { mode: 'cloud' as const, cloudSaved: true, at, mirrorChunks: mirrorRows.length };
  } catch (error: any) {
    console.warn('[HELM Smart] Portal data saved locally but cloud persistence failed:', error?.message || error);
    return {
      mode: 'local' as const,
      cloudSaved: false,
      warning: error?.message || 'cloud-persist-failed',
    };
  }
}

async function applyPortalPayload(payload: PortalSmartPayload) {
  suppressOutbound(8000);
  const localFailures: string[] = [];

  Object.entries(STORAGE_MAP).forEach(([storageKey, payloadKey]) => {
    if (!safeJsonWrite(storageKey, payload[payloadKey])) localFailures.push(storageKey);
  });

  const syncedAt = payload.syncedAt || new Date().toISOString();
  safeTextWrite(LAST_SYNC_KEY, syncedAt);
  safeJsonWrite(SYNC_META_KEY, payload.syncMeta || null);
  safeTextWrite('helm_portal_bridge_enabled', '1');
  safeTextWrite('helm_portal_bridge_source', payload.source || 'helm-portal');
  safeTextWrite('helm_portal_bridge_version', payload.syncVersion || 'legacy');

  const indexedDbSaved = await persistPortalMirrorToIndexedDb(payload.portalMirror, syncedAt);
  const cloud = await persistPortalPayloadToCloud(payload);

  const fingerprint = String(payload.syncMeta?.fingerprint || '');
  const isFullMirror = String(payload.syncVersion || '').startsWith('full-portal-mirror-');
  const hydratedFingerprint = sessionStorage.getItem(HYDRATED_FINGERPRINT_KEY) || '';
  const shouldReload = Boolean(isFullMirror && fingerprint && fingerprint !== hydratedFingerprint);
  if (shouldReload) sessionStorage.setItem(HYDRATED_FINGERPRINT_KEY, fingerprint);

  return { syncedAt, cloud, indexedDbSaved, localFailures, fingerprint, shouldReload };
}

function postAck(status: 'ok' | 'error', message?: string, details?: Record<string, any>) {
  try {
    window.parent?.postMessage({ type: ACK_TYPE, status, message, at: new Date().toISOString(), ...(details || {}) }, '*');
  } catch {
    // ignore
  }
}

function postOutboundChange(changedKey?: string) {
  if (!isEmbeddedMode()) return;
  if (isOutboundSuppressed()) return;

  try {
    const payload = readCurrentPayload(changedKey);
    window.parent?.postMessage({
      type: OUTBOUND_MESSAGE_TYPE,
      payload,
      changedKey,
      at: new Date().toISOString(),
    }, '*');
  } catch {
    // ignore
  }
}

function scheduleOutboundChange(changedKey?: string) {
  if (isOutboundSuppressed()) return;
  if (outboundTimer) window.clearTimeout(outboundTimer);
  outboundTimer = window.setTimeout(() => postOutboundChange(changedKey), 1400);
}

function patchLocalStorageOutbound() {
  if (patched) return;
  patched = true;

  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  localStorage.setItem = (key: string, value: string) => {
    originalSetItem(key, value);
    if (WATCHED_KEYS.has(key)) scheduleOutboundChange(key);
  };

  localStorage.removeItem = (key: string) => {
    originalRemoveItem(key);
    if (WATCHED_KEYS.has(key)) scheduleOutboundChange(key);
  };
}

export function installPortalBridge() {
  if (!isEmbeddedMode()) return;
  if ((window as any).__HELM_PORTAL_BRIDGE_INSTALLED__) return;
  (window as any).__HELM_PORTAL_BRIDGE_INSTALLED__ = true;

  patchLocalStorageOutbound();

  window.addEventListener('message', async (event) => {
    const data = event?.data;
    if (!data || data.type !== INBOUND_MESSAGE_TYPE) return;

    try {
      const payload = data.payload as PortalSmartPayload;
      if (!payload || typeof payload !== 'object') throw new Error('Invalid portal payload');
      const result = await applyPortalPayload(payload);
      const message = result.cloud.cloudSaved
        ? 'portal-sync-stored-cloud'
        : result.cloud.warning === 'cloud-not-configured'
          ? 'portal-sync-stored-local'
          : result.cloud.warning === 'cloud-auth-required'
            ? 'portal-sync-stored-local-auth-required'
            : result.cloud.warning === 'cloud-anonymous-auth-blocked'
              ? 'portal-sync-stored-local-anonymous-blocked'
              : 'portal-sync-stored-local-cloud-warning';

      postAck('ok', message, {
        storage: result.cloud.cloudSaved ? 'cloud+local' : 'local',
        indexedDbSaved: result.indexedDbSaved,
        localFailures: result.localFailures,
        cloudWarning: result.cloud.warning || null,
        syncVersion: payload.syncVersion || 'legacy',
        syncMeta: payload.syncMeta || null,
      });

      // Only reload when the actual Portal dataset fingerprint changed.
      // Repeated background syncs with identical data do not disturb the user.
      if (result.shouldReload) {
        window.setTimeout(() => window.location.reload(), 80);
      }
    } catch (error: any) {
      postAck('error', error?.message || 'Failed to apply portal sync payload');
    }
  });

  // بعد التحميل الأول، أي تعديل داخل حلم سمارت سيُرسل إلى حلم بروتال تلقائياً.
  postAck('ok', 'bridge-ready');
}
