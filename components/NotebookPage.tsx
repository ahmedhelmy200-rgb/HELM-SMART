import React, { useEffect, useMemo, useState } from 'react';
import { NotebookNote, SystemConfig } from '../types';

const LS_KEY = 'legalmaster_notes';

function nowIso() {
  return new Date().toISOString();
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uid(prefix = 'n_') {
  return `${prefix}${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

type Props = {
  config?: SystemConfig;
  onNotesChanged?: (notes: NotebookNote[]) => void;
  focusNoteId?: string;
  onConsumeFocus?: () => void;
};

const NotebookPage: React.FC<Props> = ({ config, onNotesChanged, focusNoteId, onConsumeFocus }) => {
  const primary = config?.primaryColor || '#0f172a';
  const fontFamily = config?.fontFamily || 'Cairo';

  const [notes, setNotes] = useState<NotebookNote[]>(() => {
    return safeParse<NotebookNote[]>(localStorage.getItem(LS_KEY), []);
  });
  const [query, setQuery] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...notes];
    list.sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt);
    });
    if (!q) return list;
    return list.filter((n) =>
      `${n.title}\n${n.content}`.toLowerCase().includes(q)
    );
  }, [notes, query]);

  const persist = (next: NotebookNote[]) => {
    setNotes(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    onNotesChanged?.(next);
  };

  const startNew = () => {
    setEditingId(null);
    setDraftTitle('');
    setDraftContent('');
  };

  const edit = (n: NotebookNote) => {
    setEditingId(n.id);
    setDraftTitle(n.title);
    setDraftContent(n.content);
  };

  const save = () => {
    const title = draftTitle.trim() || 'ملاحظة';
    const content = draftContent.trim();
    const ts = nowIso();
    if (!content && !draftTitle.trim()) return;

    if (editingId) {
      const next = notes.map((n) =>
        n.id === editingId ? { ...n, title, content, updatedAt: ts } : n
      );
      persist(next);
      return;
    }

    const note: NotebookNote = {
      id: uid(),
      title,
      content,
      createdAt: ts,
      updatedAt: ts,
      pinned: false,
    };
    persist([note, ...notes]);
    startNew();
  };

  const remove = (id: string) => {
    if (!confirm('حذف الملاحظة؟')) return;
    persist(notes.filter((n) => n.id !== id));
    if (editingId === id) startNew();
  };

  const togglePin = (id: string) => {
    const next = notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
    persist(next);
  };

  return (
    <div className="space-y-6" style={{ fontFamily }}>
      <div className="bg-white rounded-2xl shadow p-4 border border-slate-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-lg font-black" style={{ color: primary }}>المفكرة</div>
            <div className="text-xs text-slate-500 mt-1">ملاحظات سريعة داخل البرنامج (محليًا)</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startNew}
              className="px-4 py-2 rounded-xl font-black text-white"
              style={{ background: primary }}
            >
              ملاحظة جديدة
            </button>
          </div>
        </div>
        <div className="mt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث داخل الملاحظات..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2"
            style={{ boxShadow: 'none' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow p-4 border border-slate-100">
          <div className="text-sm font-black text-slate-700 mb-3">{editingId ? 'تعديل الملاحظة' : 'إضافة ملاحظة'}</div>
          <div className="space-y-3">
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="العنوان"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2"
            />
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="اكتب الملاحظة هنا..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 min-h-[180px]"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={save}
                className="px-4 py-2 rounded-xl font-black text-white"
                style={{ background: primary }}
              >
                حفظ
              </button>
              {editingId && (
                <button
                  onClick={startNew}
                  className="px-4 py-2 rounded-xl font-black border border-slate-200"
                >
                  إلغاء
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm font-black text-slate-700">الملاحظات</div>
            <div className="text-xs text-slate-500">{filtered.length} عنصر</div>
          </div>
          <div className="max-h-[520px] overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">لا توجد ملاحظات.</div>
            ) : (
              filtered.map((n) => (
                <div id={`note-card-${n.id}`} key={n.id} className="p-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-black text-slate-800 truncate">{n.title}</div>
                        {n.pinned && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-black">مثبت</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">آخر تعديل: {new Date(n.updatedAt).toLocaleString('en-GB')}</div>
                      {n.content && (
                        <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap line-clamp-4">{n.content}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => togglePin(n.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-black border border-slate-200 hover:bg-slate-50"
                      >
                        {n.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                      </button>
                      <button
                        onClick={() => edit(n)}
                        className="px-3 py-1.5 rounded-lg text-xs font-black border border-slate-200 hover:bg-slate-50"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => remove(n.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-black border border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotebookPage;
