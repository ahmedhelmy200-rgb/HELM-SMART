import React, { useEffect, useMemo, useState } from 'react';
import { Client, LegalCase, Reminder } from '../../types';

type Props = {
  reminders: Reminder[];
  setReminders: (r: Reminder[]) => void;
  cases: LegalCase[];
  clients: Client[];
  focusReminderId?: string;
  onConsumeFocus?: () => void;
};

const isoToday = () => new Date().toISOString().slice(0, 10);

const makeId = () => `rem_${Date.now()}_${Math.random().toString(16).slice(2)}`;

function sortByDue(a: Reminder, b: Reminder) {
  const da = `${a.dueDate}T${a.dueTime || '00:00'}`;
  const db = `${b.dueDate}T${b.dueTime || '00:00'}`;
  return da.localeCompare(db);
}

export default function RemindersPage({ reminders, setReminders, cases, clients, focusReminderId, onConsumeFocus }: Props) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(isoToday());
  const [dueTime, setDueTime] = useState('09:00');
  const [note, setNote] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(true);

  // Focus from Global Search
  useEffect(() => {
    if (!focusReminderId) return;
    // Ensure the focused reminder is visible even if closed
    setOnlyOpen(false);
    setTimeout(() => {
      try {
        document.getElementById(`reminder-row-${focusReminderId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } catch {}
    }, 80);
    onConsumeFocus?.();
  }, [focusReminderId, onConsumeFocus]);

  const hasNotification = typeof window !== 'undefined' && 'Notification' in window;
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(hasNotification ? Notification.permission : 'unsupported');

  const requestNotif = async () => {
    if (!hasNotification) return;
    try {
      const p = await Notification.requestPermission();
      setNotifPerm(p);
      if (p === 'granted') alert('تم تفعيل إشعارات سطح المكتب.');
    } catch {
      // ignore
    }
  };

  const list = useMemo(() => {
    const base = [...reminders].sort(sortByDue);
    return onlyOpen ? base.filter(r => !r.done) : base;
  }, [reminders, onlyOpen]);

  const addManual = () => {
    if (!title.trim()) return;
    const r: Reminder = {
      id: makeId(),
      title: title.trim(),
      dueDate,
      dueTime: dueTime || undefined,
      note: note.trim() || undefined,
      priority: 'normal',
      done: false,
      createdAt: new Date().toISOString(),
      source: { type: 'manual' },
    };
    setReminders([r, ...reminders]);
    setTitle('');
    setNote('');
  };

  const toggleDone = (id: string) => {
    setReminders(reminders.map(r => (r.id === id ? { ...r, done: !r.done } : r)));
  };

  const del = (id: string) => {
    if (!confirm('حذف التذكير؟')) return;
    setReminders(reminders.filter(r => r.id !== id));
  };

  const syncFromCases = () => {
    const existingKeys = new Set(
      reminders
        .filter(r => r.source?.type !== 'manual')
        .map(r => JSON.stringify(r.source))
    );

    const generated: Reminder[] = [];

    // جلسات القضايا
    for (const c of cases) {
      if (c.nextHearingDate) {
        const src = { type: 'case_hearing' as const, caseId: c.id };
        const key = JSON.stringify(src);
        if (!existingKeys.has(key)) {
          generated.push({
            id: makeId(),
            title: `جلسة: ${c.title} (رقم ${c.caseNumber})`,
            dueDate: c.nextHearingDate,
            dueTime: '09:00',
            note: `موكل: ${c.clientName} | محكمة: ${c.court}`,
            priority: 'high',
            done: false,
            createdAt: new Date().toISOString(),
            source: src,
          });
        }
      }

      // تذكير مراجعة المستندات
      for (const d of c.documents || []) {
        if (d.reviewReminder) {
          const src = { type: 'doc_review' as const, caseId: c.id, docId: d.id };
          const key = JSON.stringify(src);
          if (!existingKeys.has(key)) {
            generated.push({
              id: makeId(),
              title: `مراجعة مستند: ${d.name}`,
              dueDate: d.reviewReminder,
              dueTime: '10:00',
              note: `قضية: ${c.title} (رقم ${c.caseNumber})`,
              priority: 'normal',
              done: false,
              createdAt: new Date().toISOString(),
              source: src,
            });
          }
        }
      }
    }

    if (generated.length === 0) {
      alert('لا يوجد عناصر جديدة لتوليد تذكيرات لها.');
      return;
    }

    setReminders([...generated, ...reminders]);
    alert(`تم توليد ${generated.length} تذكير تلقائي.`);
  };

  return (
    <div dir="rtl" className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900">التذكيرات</h2>
          <p className="text-sm text-slate-500 mt-1">يدوي + توليد تلقائي من (الجلسات / مراجعة المستندات)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={syncFromCases} className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#1a1a2e] font-black hover:opacity-90">
            توليد تلقائي
          </button>
          <button onClick={() => setOnlyOpen(v => !v)} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 font-bold hover:bg-slate-300">
            {onlyOpen ? 'عرض الكل' : 'عرض غير المنجز'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="md:col-span-2 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-slate-100" placeholder="عنوان التذكير" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-slate-100" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <input className="border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-slate-100" type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
          <input className="md:col-span-4 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-slate-100" placeholder="ملاحظة (اختياري)" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={addManual} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-black hover:opacity-90">
            إضافة تذكير
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {list.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 font-bold">لا يوجد تذكيرات.</div>
        ) : (
          list.map((r) => {
            const overdue = !r.done && r.dueDate < isoToday();
            return (
              <div id={`reminder-row-${r.id}`} key={r.id} className={`bg-white rounded-2xl border p-4 md:p-5 flex items-start justify-between gap-4 shadow-sm ${overdue ? 'border-rose-200' : 'border-slate-200'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-black ${r.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>{r.title}</h3>
                    {overdue && <span className="text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">متأخر</span>}
                    {r.source?.type !== 'manual' && <span className="text-[11px] font-black text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">تلقائي</span>}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    <span className="font-bold">الموعد:</span> {r.dueDate}{r.dueTime ? ` • ${r.dueTime}` : ''}
                  </div>
                  {r.note && <div className="mt-1 text-sm text-slate-500">{r.note}</div>}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => toggleDone(r.id)} className={`px-3 py-2 rounded-xl font-black ${r.done ? 'bg-slate-200 text-slate-700' : 'bg-emerald-600 text-white'}`}>
                    {r.done ? 'إرجاع' : 'تم'}
                  </button>
                  <button onClick={() => del(r.id)} className="px-3 py-2 rounded-xl font-black bg-rose-600 text-white">حذف</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
