import { getCloudConfig, kvSetMany } from './cloudSync';

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
const FULL_SNAPSHOT_KEY = 'helm_portal_full_snapshot';
const CLOUD_PERSISTED_AT_KEY = 'helm_portal_cloud_persisted_at';
const SUPPRESS_OUTBOUND_UNTIL = 'helm_portal_bridge_suppress_outbound_until';

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
  [FULL_SNAPSHOT_KEY]: 'portalMirror',
};

// The full raw Portal mirror is backup/reference data. Do not send it back on
// every localStorage change because it can be large; Smart's mapped datasets
// remain the outbound editable surface.
const WATCHED_KEYS = new Set(Object.keys(STORAGE_MAP).filter((key) => key !== FULL_SNAPSHOT_KEY));
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
  if (value === undefined || value === null) return;
  localStorage.setItem(key, JSON.stringify(value));
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
    if (payloadKey === 'portalMirror') return;
    const fallback = payloadKey === 'config' ? null : [];
    (payload as any)[payloadKey] = safeJsonRead(storageKey, fallback as any);
  });

  if (changedKey) payload.changedKey = changedKey;
  return payload;
}

async function persistPortalPayloadToCloud(payload: PortalSmartPayload) {
  const cfg = getCloudConfig();
  if (!cfg) return { mode: 'local' as const, cloudSaved: false, warning: 'cloud-not-configured' };

  const rows = Object.entries(STORAGE_MAP)
    .filter(([, payloadKey]) => payload[payloadKey] !== undefined && payload[payloadKey] !== null)
    .map(([storageKey, payloadKey]) => ({ key: storageKey, value: payload[payloadKey] }));

  rows.push({
    key: LAST_SYNC_KEY,
    value: {
      syncedAt: payload.syncedAt || new Date().toISOString(),
      source: payload.source || 'helm-portal',
      syncVersion: payload.syncVersion || 'legacy',
    },
  });

  rows.push({
    key: SYNC_META_KEY,
    value: payload.syncMeta || null,
  });

  try {
    await kvSetMany(rows as any, cfg as any);
    const at = new Date().toISOString();
    localStorage.setItem(CLOUD_PERSISTED_AT_KEY, at);
    return { mode: 'cloud' as const, cloudSaved: true, at };
  } catch (error: any) {
    console.warn('[HELM Smart] Portal mirror saved locally but cloud persistence failed:', error?.message || error);
    return {
      mode: 'local' as const,
      cloudSaved: false,
      warning: error?.message || 'cloud-persist-failed',
    };
  }
}

async function applyPortalPayload(payload: PortalSmartPayload) {
  suppressOutbound(8000);
  Object.entries(STORAGE_MAP).forEach(([storageKey, payloadKey]) => {
    safeJsonWrite(storageKey, payload[payloadKey]);
  });

  const syncedAt = payload.syncedAt || new Date().toISOString();
  localStorage.setItem(LAST_SYNC_KEY, syncedAt);
  safeJsonWrite(SYNC_META_KEY, payload.syncMeta || null);
  localStorage.setItem('helm_portal_bridge_enabled', '1');
  localStorage.setItem('helm_portal_bridge_source', payload.source || 'helm-portal');
  localStorage.setItem('helm_portal_bridge_version', payload.syncVersion || 'legacy');

  const cloud = await persistPortalPayloadToCloud(payload);
  return { syncedAt, cloud };
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
          : 'portal-sync-stored-local-cloud-warning';
      postAck('ok', message, {
        storage: result.cloud.cloudSaved ? 'cloud+local' : 'local',
        cloudWarning: result.cloud.warning || null,
        syncVersion: payload.syncVersion || 'legacy',
        syncMeta: payload.syncMeta || null,
      });

      // Reload once so App.tsx rehydrates its localStorage-backed state.
      if (!sessionStorage.getItem('helm_portal_bridge_reloaded')) {
        sessionStorage.setItem('helm_portal_bridge_reloaded', '1');
        window.location.reload();
      }
    } catch (error: any) {
      postAck('error', error?.message || 'Failed to apply portal sync payload');
    }
  });

  // بعد التحميل الأول، أي تعديل داخل حلم سمارت سيُرسل إلى حلم بروتال تلقائياً.
  postAck('ok', 'bridge-ready');
}
