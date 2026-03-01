import React, { useMemo, useState } from 'react';
import { CaseDocument, SystemConfig } from '../types';

type Props = {
  config: SystemConfig;
  onUpdateConfig: (next: SystemConfig) => void;
};

const TOKENS = [
  '{officeName}', '{officePhone}', '{officeEmail}', '{officeAddress}', '{officeWebsite}',
  '{clientName}', '{clientPhone}', '{clientEmail}', '{emiratesId}',
  '{caseNumber}', '{caseTitle}', '{opponentName}', '{court}', '{nextHearingDate}',
  '{date}', '{amount}', '{invoiceNumber}'
];

function nowDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const TemplatesCenter: React.FC<Props> = ({ config, onUpdateConfig }) => {
  const templates = useMemo(() => (Array.isArray(config.officeTemplates) ? config.officeTemplates : []), [config.officeTemplates]);
  const [selectedId, setSelectedId] = useState<string>(() => templates[0]?.id || '');

  const selected = templates.find(t => t.id === selectedId) || null;

  const updateTemplates = (next: CaseDocument[]) => {
    onUpdateConfig({ ...config, officeTemplates: next });
  };

  const addNew = () => {
    const id = `tpl_${Math.random().toString(36).slice(2, 10)}`;
    const t: CaseDocument = {
      id,
      name: 'نموذج جديد',
      type: 'template',
      mimeType: 'text/plain',
      category: 'template',
      uploadDate: nowDate(),
      content: 'اكتب هنا نص النموذج...'
    };
    updateTemplates([t, ...templates]);
    setSelectedId(id);
  };

  const remove = (id: string) => {
    if (!confirm('حذف هذا النموذج؟')) return;
    const next = templates.filter(t => t.id !== id);
    updateTemplates(next);
    setSelectedId(next[0]?.id || '');
  };

  const patchSelected = (patch: Partial<CaseDocument>) => {
    if (!selected) return;
    const next = templates.map(t => t.id === selected.id ? { ...t, ...patch } : t);
    updateTemplates(next);
  };

  return (
    <div className="p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800">مكتبة النماذج</h2>
          <p className="text-xs text-slate-500 font-bold mt-1">نماذج جاهزة قابلة للتعديل، ويمكن استخدامها من صفحات الموكلين والقضايا.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addNew} className="px-5 py-3 rounded-2xl font-black text-white shadow-lg" style={{ backgroundColor: config.primaryColor }}>+ إضافة نموذج</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="font-black text-slate-700">النماذج</div>
            <div className="text-[10px] font-bold text-slate-400">{templates.length}</div>
          </div>
          <div className="p-2 max-h-[520px] overflow-auto">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-right px-4 py-3 rounded-2xl mb-2 border transition ${selectedId === t.id ? 'bg-slate-50 border-slate-200' : 'border-transparent hover:bg-slate-50'}`}
              >
                <div className="font-black text-slate-800 text-sm">{t.name}</div>
                <div className="text-[10px] text-slate-400 font-bold mt-1">آخر تعديل: {t.uploadDate || '-'}</div>
              </button>
            ))}
            {templates.length === 0 && (
              <div className="text-center text-slate-400 font-bold py-10">لا توجد نماذج.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-800">تحرير النموذج</div>
              <div className="text-[10px] font-bold text-slate-400 mt-1">الرموز المتاحة: {TOKENS.join(' ')}</div>
            </div>
            {selected && (
              <div className="flex gap-2">
                <button onClick={() => remove(selected.id)} className="px-4 py-2 rounded-xl font-black bg-red-50 text-red-700 border border-red-100">حذف</button>
              </div>
            )}
          </div>

          {!selected && (
            <div className="p-8 text-center text-slate-400 font-bold">اختر نموذجاً من القائمة أو اضغط إضافة نموذج.</div>
          )}

          {selected && (
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-slate-600">عنوان النموذج</label>
                <input
                  className="w-full mt-2 bg-white border border-slate-200 rounded-2xl px-5 py-3 font-bold text-slate-800 outline-none focus:border-[#d4af37]"
                  value={selected.name}
                  onChange={(e) => patchSelected({ name: e.target.value, uploadDate: nowDate() })}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-600">النص</label>
                <textarea
                  className="w-full mt-2 bg-white border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37] min-h-[340px]"
                  value={selected.content || ''}
                  onChange={(e) => patchSelected({ content: e.target.value, uploadDate: nowDate() })}
                />
              </div>

              <div className="text-[10px] text-slate-400 font-bold leading-relaxed">
                ملاحظة: هذه النماذج تُستخدم كنص قابل للطباعة/الحفظ داخل مستندات الموكلين والقضايا. عند إنشاء مستند من نموذج سيتم استبدال الرموز (مثل {`{clientName}`}) تلقائياً.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplatesCenter;
