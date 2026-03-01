export type RequestPayload = {
  name?: string;
  phone?: string;
  type?: string;
  caseNumber?: string;
  details?: string;
};

declare global {
  interface Window {
    HELM_DB?: {
      kvSet: (key: string, value: any) => Promise<boolean>;
      kvGet: (key: string) => Promise<any>;
      kvDel: (key: string) => Promise<boolean>;
      requestsAdd: (payload: RequestPayload) => Promise<any>;
      requestsList: () => Promise<any[]>;
    };
  }
}

export const DesktopDB = {
  isAvailable(): boolean {
    return typeof window !== "undefined" && !!window.HELM_DB;
  },
  async kvSet(key: string, value: any): Promise<boolean> {
    if (!window.HELM_DB) throw new Error("Desktop DB not available");
    return window.HELM_DB.kvSet(key, value);
  },
  async kvGet<T = any>(key: string): Promise<T | null> {
    if (!window.HELM_DB) throw new Error("Desktop DB not available");
    return window.HELM_DB.kvGet(key);
  },
  async kvDel(key: string): Promise<boolean> {
    if (!window.HELM_DB) throw new Error("Desktop DB not available");
    return window.HELM_DB.kvDel(key);
  },
  async requestsAdd(payload: RequestPayload): Promise<any> {
    if (!window.HELM_DB) throw new Error("Desktop DB not available");
    return window.HELM_DB.requestsAdd(payload);
  },
  async requestsList(): Promise<any[]> {
    if (!window.HELM_DB) throw new Error("Desktop DB not available");
    return window.HELM_DB.requestsList();
  },
};
