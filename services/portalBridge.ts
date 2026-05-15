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
  source?: string;
  syncedAt?: string;
};

const MESSAGE_TYPE = 'HELM_PORTAL_SYNC_DATA';
const ACK_TYPE = 'HELM_SMART_SYNC_ACK';
const LAST_SYNC_KEY = 'helm_portal_last_sync';

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

function applyPortalPayload(payload: PortalSmartPayload) {
  Object.entries(STORAGE_MAP).forEach(([storageKey, payloadKey]) => {
    safeJsonWrite(storageKey, payload[payloadKey]);
  });

  localStorage.setItem(LAST_SYNC_KEY, payload.syncedAt || new Date().toISOString());
  localStorage.setItem('helm_portal_bridge_enabled', '1');
  localStorage.setItem('helm_portal_bridge_source', payload.source || 'helm-portal');
}

function postAck(status: 'ok' | 'error', message?: string) {
  try {
    window.parent?.postMessage({ type: ACK_TYPE, status, message, at: new Date().toISOString() }, '*');
  } catch {
    // ignore
  }
}

export function installPortalBridge() {
  if (!isEmbeddedMode()) return;
  if ((window as any).__HELM_PORTAL_BRIDGE_INSTALLED__) return;
  (window as any).__HELM_PORTAL_BRIDGE_INSTALLED__ = true;

  window.addEventListener('message', (event) => {
    const data = event?.data;
    if (!data || data.type !== MESSAGE_TYPE) return;

    try {
      const payload = data.payload as PortalSmartPayload;
      if (!payload || typeof payload !== 'object') throw new Error('Invalid portal payload');
      applyPortalPayload(payload);
      postAck('ok');

      // Reload once so App.tsx rehydrates its localStorage-backed state.
      if (!sessionStorage.getItem('helm_portal_bridge_reloaded')) {
        sessionStorage.setItem('helm_portal_bridge_reloaded', '1');
        window.location.reload();
      }
    } catch (error: any) {
      postAck('error', error?.message || 'Failed to apply portal sync payload');
    }
  });

  postAck('ok', 'bridge-ready');
}
