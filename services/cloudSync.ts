/**
 * Cloud Sync via Supabase PostgREST (secure, minimal deps)
 * -------------------------------------------------------
 * - يدعم وضعين:
 *   1) Secure (مُوصى به): Supabase Auth + RLS (Authorization: Bearer <access_token>)
 *   2) Open (غير مُوصى به): بدون Auth (يستخدم anonKey كـ Bearer) ويتطلب RLS = OFF
 */

export type CloudConfig = {
  url: string;        // https://xxxx.supabase.co
  anonKey: string;    // anon public key (مسموح داخل العميل)
  table?: string;     // default: kv_store
};

export type KvRow<T = any> = {
  key: string;
  value: T;
  updated_at?: string;
};

type AuthState = {
  accessToken: string;
  refreshToken?: string;
  email?: string;
};

const LS_URL = "helm_cloud_url";
const LS_KEY = "helm_cloud_anon";
const LS_TABLE = "helm_cloud_table";

const LS_ACCESS = "helm_cloud_access_token";
const LS_REFRESH = "helm_cloud_refresh_token";
const LS_EMAIL = "helm_cloud_user_email";

export function getCloudConfig(): CloudConfig | null {
  const url =
    (typeof localStorage !== "undefined" ? localStorage.getItem(LS_URL) : null) ||
    (import.meta as any).env?.VITE_SUPABASE_URL;

  const anonKey =
    (typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEY) : null) ||
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  const table =
    (typeof localStorage !== "undefined" ? localStorage.getItem(LS_TABLE) : null) || "kv_store";

  if (!url || !anonKey) return null;
  return { url, anonKey, table };
}

export function setCloudConfig(cfg: Partial<CloudConfig>) {
  if (typeof localStorage === "undefined") return;
  if (cfg.url !== undefined) localStorage.setItem(LS_URL, cfg.url);
  if (cfg.anonKey !== undefined) localStorage.setItem(LS_KEY, cfg.anonKey);
  if (cfg.table !== undefined) localStorage.setItem(LS_TABLE, cfg.table);
  try { (window as any)?.dispatchEvent?.(new Event('helm_cloud_config_changed')); } catch {}
}

export function clearCloudConfig() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LS_URL);
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_TABLE);
  try { (window as any)?.dispatchEvent?.(new Event('helm_cloud_config_changed')); } catch {}
}

export function getCloudAuth(): AuthState | null {
  if (typeof localStorage === "undefined") return null;
  const accessToken = localStorage.getItem(LS_ACCESS) || "";
  if (!accessToken) return null;
  const refreshToken = localStorage.getItem(LS_REFRESH) || undefined;
  const email = localStorage.getItem(LS_EMAIL) || undefined;
  return { accessToken, refreshToken, email };
}

export function clearCloudAuth() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LS_ACCESS);
  localStorage.removeItem(LS_REFRESH);
  localStorage.removeItem(LS_EMAIL);
}

function setCloudAuth(state: AuthState) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LS_ACCESS, state.accessToken);
  if (state.refreshToken) localStorage.setItem(LS_REFRESH, state.refreshToken);
  if (state.email) localStorage.setItem(LS_EMAIL, state.email);
}

/**
 * تسجيل دخول Supabase (Email/Password) - يحتاج أن Auth مفعّل في المشروع
 */
export async function cloudSignInWithPassword(email: string, password: string, cfg?: CloudConfig) {
  const c = cfg || getCloudConfig();
  if (!c) throw new Error("Cloud not configured");

  const url = `${c.url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: c.anonKey,
      Authorization: `Bearer ${c.anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const txt = await safeText(res);
    throw new Error(`Auth sign-in failed: HTTP ${res.status}${txt ? " - " + txt : ""}`);
  }

  const data = await res.json();
  const accessToken = data?.access_token as string;
  const refreshToken = data?.refresh_token as string | undefined;
  if (!accessToken) throw new Error("Auth sign-in failed: no access_token");
  setCloudAuth({ accessToken, refreshToken, email });
  return { accessToken, refreshToken };
}

export async function cloudRefreshToken(cfg?: CloudConfig) {
  const c = cfg || getCloudConfig();
  if (!c) throw new Error("Cloud not configured");

  const st = getCloudAuth();
  const refreshToken = st?.refreshToken;
  if (!refreshToken) throw new Error("No refresh token");

  const url = `${c.url.replace(/\/$/, "")}/auth/v1/token?grant_type=refresh_token`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: c.anonKey,
      Authorization: `Bearer ${c.anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    const txt = await safeText(res);
    throw new Error(`Auth refresh failed: HTTP ${res.status}${txt ? " - " + txt : ""}`);
  }

  const data = await res.json();
  const accessToken = data?.access_token as string;
  const newRefreshToken = (data?.refresh_token as string | undefined) || refreshToken;
  if (!accessToken) throw new Error("Auth refresh failed: no access_token");
  setCloudAuth({ accessToken, refreshToken: newRefreshToken, email: st?.email });
  return { accessToken, refreshToken: newRefreshToken };
}

export function cloudSignOut() {
  // logout endpoint اختياري؛ للأمان هنا نمسح التوكنات محلياً
  clearCloudAuth();
}

function baseRestUrl(cfg: CloudConfig) {
  const table = cfg.table || "kv_store";
  return `${cfg.url.replace(/\/$/, "")}/rest/v1/${encodeURIComponent(table)}`;
}

function authHeader(cfg: CloudConfig): string {
  const token = getCloudAuth()?.accessToken;
  // إذا لم يوجد توكن: fallback للوضع المفتوح (يتطلب RLS = OFF)
  return `Bearer ${token || cfg.anonKey}`;
}

function headers(cfg: CloudConfig): HeadersInit {
  return {
    apikey: cfg.anonKey,
    Authorization: authHeader(cfg),
    "Content-Type": "application/json",
  };
}

async function safeText(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return (t || "").slice(0, 600);
  } catch {
    return "";
  }
}

async function fetchWithAutoRefresh(cfg: CloudConfig, input: RequestInfo, init: RequestInit, context: string) {
  const res = await fetch(input, init);
  if (res.status !== 401) return res;

  // إذا 401 ومعنا refreshToken: جرّب Refresh مرة واحدة ثم أعد الطلب
  if (!getCloudAuth()?.refreshToken) return res;

  try {
    await cloudRefreshToken(cfg);
  } catch {
    return res;
  }

  const retryInit: RequestInit = {
    ...init,
    headers: {
      ...(init.headers as any),
      Authorization: authHeader(cfg),
    },
  };
  return await fetch(input, retryInit);
}

function assertOk(res: Response, context: string) {
  if (res.ok) return;
  // رسالة مفيدة لو RLS شغال بدون Auth
  if (res.status === 401) {
    throw new Error(
      `${context}: Unauthorized (401). إذا فعّلت RLS في Supabase لازم تسجّل دخول Supabase من الإعدادات (Cloud Auth).`
    );
  }
  throw new Error(`${context}: HTTP ${res.status}`);
}

export async function kvGet<T = any>(key: string, cfg?: CloudConfig): Promise<KvRow<T> | null> {
  const c = cfg || getCloudConfig();
  if (!c) throw new Error("Cloud not configured");

  const url = new URL(baseRestUrl(c));
  url.searchParams.set("select", "key,value,updated_at");
  url.searchParams.set("key", `eq.${key}`);

  const res = await fetchWithAutoRefresh(c, url.toString(), { headers: headers(c) }, "kvGet");
  assertOk(res, "kvGet");
  const arr = (await res.json()) as KvRow<T>[];
  return arr?.[0] || null;
}

export async function kvGetMany<T = any>(keys: string[], cfg?: CloudConfig): Promise<KvRow<T>[]> {
  const c = cfg || getCloudConfig();
  if (!c) throw new Error("Cloud not configured");
  if (keys.length === 0) return [];

  const url = new URL(baseRestUrl(c));
  url.searchParams.set("select", "key,value,updated_at");
  // PostgREST: key=in.("a","b")
  const inList = keys.map((k) => JSON.stringify(k)).join(",");
  url.searchParams.set("key", `in.(${inList})`);

  const res = await fetchWithAutoRefresh(c, url.toString(), { headers: headers(c) }, "kvGetMany");
  assertOk(res, "kvGetMany");
  return (await res.json()) as KvRow<T>[];
}

export async function kvSetMany(rows: KvRow[], cfg?: CloudConfig): Promise<KvRow[]> {
  const c = cfg || getCloudConfig();
  if (!c) throw new Error("Cloud not configured");
  if (rows.length === 0) return [];

  // Upsert: on_conflict يدعم schema الجديد (owner,key). لو الجدول قديم سيُجرّب key فقط.
  const tryUpsert = async (onConflict: string) => {
    const url = new URL(baseRestUrl(c));
    url.searchParams.set("on_conflict", onConflict);
    const res = await fetchWithAutoRefresh(
      c,
      url.toString(),
      {
        method: "POST",
        headers: {
          ...headers(c),
          Prefer: "resolution=merge-duplicates,return=representation",
        } as any,
        body: JSON.stringify(rows.map((r) => ({ key: r.key, value: r.value }))),
      },
      "kvSetMany"
    );
    return res;
  };

  let res = await tryUpsert("owner,key");
  if (!res.ok) {
    // fallback للـ schema القديم (key فقط)
    res = await tryUpsert("key");
  }
  if (res.ok) return (await res.json()) as KvRow[];

  // Fallback أخير: PATCH per-row
  const out: KvRow[] = [];
  for (const r of rows) {
    const u = new URL(baseRestUrl(c));
    u.searchParams.set("key", `eq.${r.key}`);
    const rres = await fetchWithAutoRefresh(
      c,
      u.toString(),
      {
        method: "PATCH",
        headers: { ...headers(c), Prefer: "return=representation" } as any,
        body: JSON.stringify({ value: r.value }),
      },
      "kvSetMany/PATCH"
    );
    assertOk(rres, "kvSetMany/PATCH");
    const arr = (await rres.json()) as KvRow[];
    out.push(arr?.[0] || r);
  }
  return out;
}

export async function kvDelete(key: string, cfg?: CloudConfig): Promise<void> {
  const c = cfg || getCloudConfig();
  if (!c) throw new Error("Cloud not configured");

  const url = new URL(baseRestUrl(c));
  url.searchParams.set("key", `eq.${key}`);

  const res = await fetchWithAutoRefresh(c, url.toString(), { method: "DELETE", headers: headers(c) }, "kvDelete");
  assertOk(res, "kvDelete");
}

// ------------------------------
// Supabase Storage helpers (documents)
// ------------------------------

function encPath(p: string) {
  return p.split('/').map(s => encodeURIComponent(s)).join('/');
}

export async function storageUploadObject(
  bucket: string,
  path: string,
  file: Blob,
  mimeType: string,
  cfg?: CloudConfig
): Promise<void> {
  const c = cfg || getCloudConfig();
  if (!c) throw new Error('Cloud not configured');
  const url = `${c.url.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(bucket)}/${encPath(path)}`;

  const res = await fetchWithAutoRefresh(
    c,
    url,
    {
      method: 'PUT',
      headers: {
        apikey: c.anonKey,
        Authorization: authHeader(c),
        'Content-Type': mimeType || 'application/octet-stream',
        'x-upsert': 'true',
      } as any,
      body: file,
    },
    'storageUploadObject'
  );

  assertOk(res, 'storageUploadObject');
}

export async function storageRemoveObject(bucket: string, path: string, cfg?: CloudConfig): Promise<void> {
  const c = cfg || getCloudConfig();
  if (!c) throw new Error('Cloud not configured');
  const url = `${c.url.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(bucket)}/${encPath(path)}`;

  const res = await fetchWithAutoRefresh(
    c,
    url,
    {
      method: 'DELETE',
      headers: {
        apikey: c.anonKey,
        Authorization: authHeader(c),
      } as any,
    },
    'storageRemoveObject'
  );
  assertOk(res, 'storageRemoveObject');
}

// Create a short-lived signed URL for opening/downloading in browser/mobile
export async function storageCreateSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 120,
  cfg?: CloudConfig
): Promise<string> {
  const c = cfg || getCloudConfig();
  if (!c) throw new Error('Cloud not configured');

  const url = `${c.url.replace(/\/$/, '')}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encPath(path)}`;
  const res = await fetchWithAutoRefresh(
    c,
    url,
    {
      method: 'POST',
      headers: {
        apikey: c.anonKey,
        Authorization: authHeader(c),
        'Content-Type': 'application/json',
      } as any,
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    },
    'storageCreateSignedUrl'
  );

  assertOk(res, 'storageCreateSignedUrl');
  const data = await res.json();
  // response typically: { signedURL: "..." }
  const signed = (data?.signedURL || data?.signedUrl || data?.signed_url) as string;
  if (!signed) throw new Error('storageCreateSignedUrl: missing signedURL');
  // signedURL may be relative
  if (signed.startsWith('http')) return signed;
  return `${c.url.replace(/\/$/, '')}${signed}`;
}
