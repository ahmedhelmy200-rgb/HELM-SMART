import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Client, Invoice, LegalCase, NotebookNote, Receipt, Reminder, SystemConfig } from '../types';

type Result =
  | { type: 'client'; id: string; title: string; subtitle?: string }
  | { type: 'case'; id: string; title: string; subtitle?: string }
  | { type: 'invoice'; id: string; title: string; subtitle?: string }
  | { type: 'receipt'; id: string; title: string; subtitle?: string }
  | { type: 'reminder'; id: string; title: string; subtitle?: string }
  | { type: 'note'; id: string; title: string; subtitle?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (r: Result) => void;
  config?: SystemConfig;
  clients: Client[];
  cases: LegalCase[];
  invoices: Invoice[];
  receipts: Receipt[];
  reminders: Reminder[];
  notes: NotebookNote[];
};

function norm(s: any) {
  return String(s ?? '').toLowerCase();
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: any;
  return (...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const GlobalSearchModal: React.FC<Props> = ({
  open,
  onClose,
  onSelect,
  config,
  clients,
  cases,
  invoices,
  receipts,
  reminders,
  notes,
}) => {
  const primary = config?.primaryColor || '#0f172a';
  const fontFamily = config?.fontFamily || 'Cairo';
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  // Debounce input -> query
  const setDebounced = useMemo(() => debounce((v: string) => setQuery(v), 250), []);

  useEffect(() => {
    setDebounced(q);
  }, [q, setDebounced]);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setQuery('');
    setActiveIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [] as Result[];

    const out: Result[] = [];

    for (const c of clients) {
      const hay = `${c.name} ${c.phone} ${c.email} ${c.emiratesId}`.toLowerCase();
      if (hay.includes(term)) {
        out.push({ type: 'client', id: c.id, title: c.name, subtitle: c.phone || c.email || c.emiratesId });
      }
    }
    for (const cs of cases) {
      const hay = `${cs.caseNumber} ${cs.title} ${cs.clientName} ${cs.court} ${cs.opponentName}`.toLowerCase();
      if (hay.includes(term)) {
        out.push({ type: 'case', id: cs.id, title: `${cs.caseNumber} — ${cs.title}`, subtitle: `${cs.clientName} | ${cs.court}` });
      }
    }
    for (const inv of invoices) {
      const hay = `${inv.invoiceNumber} ${inv.clientName} ${inv.caseTitle} ${inv.description}`.toLowerCase();
      if (hay.includes(term)) {
        out.push({ type: 'invoice', id: inv.id, title: `فاتورة ${inv.invoiceNumber}`, subtitle: `${inv.clientName} | ${inv.amount} د.إ` });
      }
    }
    for (const r of receipts) {
      const hay = `${r.receiptNumber} ${r.clientName || ''} ${r.caseNumber || ''} ${r.note || ''}`.toLowerCase();
      if (hay.includes(term)) {
        out.push({ type: 'receipt', id: r.id, title: `سند ${r.receiptNumber}`, subtitle: `${r.amount} د.إ | ${r.kind === 'in' ? 'قبض' : 'صرف'}` });
      }
    }
    for (const rm of reminders) {
      const hay = `${rm.title || ''} ${rm.note || ''} ${rm.dueDate || ''} ${rm.dueTime || ''}`.toLowerCase();
      if (hay.includes(term)) {
        const when = `${rm.dueDate || ''}${rm.dueTime ? ` • ${rm.dueTime}` : ''}`.trim();
        out.push({ type: 'reminder', id: rm.id, title: rm.title || 'تذكير', subtitle: when });
      }
    }
    for (const n of notes) {
      const hay = `${n.title} ${n.content}`.toLowerCase();
      if (hay.includes(term)) {
        out.push({ type: 'note', id: n.id, title: n.title, subtitle: (n.content || '').slice(0, 80) });
      }
    }

    return out.slice(0, 60);
  }, [query, clients, cases, invoices, receipts, reminders, notes]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const pick = (idx: number) => {
    const r = results[idx];
    if (!r) return;
    onSelect(r);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-3 md:p-6 bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ fontFamily }}
    >
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black" style={{ background: primary }}>K</div>
          <div className="flex-1">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث في كل الأقسام... (Ctrl+K)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2"
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveIndex((i) => Math.min(i + 1, results.length - 1));
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIndex((i) => Math.max(i - 1, 0));
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  pick(activeIndex);
                }
              }}
            />
            <div className="text-[11px] text-slate-500 mt-1">موكلين • قضايا • فواتير • إيصالات • تذكيرات • مفكرة</div>
          </div>
          <button onClick={onClose} className="px-3 py-2 rounded-xl border border-slate-200 font-black">إغلاق</button>
        </div>

        <div className="max-h-[62vh] overflow-auto">
          {results.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">اكتب للبحث…</div>
          ) : (
            results.map((r, idx) => (
              <button
                key={`${r.type}:${r.id}`}
                onClick={() => pick(idx)}
                className={`w-full text-right p-4 border-b border-slate-100 hover:bg-slate-50 transition ${idx === activeIndex ? 'bg-slate-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black text-slate-800 truncate">{r.title}</div>
                    {r.subtitle && <div className="text-xs text-slate-500 mt-1 truncate">{r.subtitle}</div>}
                  </div>
                  <div className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-black shrink-0">
                    {r.type === 'client'
                      ? 'موكل'
                      : r.type === 'case'
                      ? 'قضية'
                      : r.type === 'invoice'
                      ? 'فاتورة'
                      : r.type === 'receipt'
                      ? 'سند'
                      : r.type === 'reminder'
                      ? 'تذكير'
                      : 'ملاحظة'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
