// Cloud-Ready DB Service (Local-First)
// -------------------------------------------------
// هذا الملف يوفر واجهة موحدة للتخزين.
// حاليًا: LocalStorage.
// لاحقًا: يمكن إضافة Supabase/Firebase كـ Adapter بدون تغيير واجهة البرنامج.

export type StorageMode = 'local' | 'cloud' | 'hybrid';

export interface DbAdapter {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T): Promise<void>;
  del(key: string): Promise<void>;
}

class LocalStorageAdapter implements DbAdapter {
  async get<T = any>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // fallback for plain strings
      return raw as unknown as T;
    }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}

// Default adapter
let adapter: DbAdapter = new LocalStorageAdapter();

export const dbService = {
  setAdapter(newAdapter: DbAdapter) {
    adapter = newAdapter;
  },
  get: <T = any>(key: string) => adapter.get<T>(key),
  set: <T = any>(key: string, value: T) => adapter.set<T>(key, value),
  del: (key: string) => adapter.del(key),
};
