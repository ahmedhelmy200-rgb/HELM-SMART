import React, { useMemo, useState } from 'react';
import { CaseDocument } from '../types';
import { applyTemplate, todayISO } from '../services/templateEngine';

type Props = {
  open: boolean;
  onClose: () => void;
  templates: CaseDocument[];
  context: Record<string, string | number | undefined | null>;
  defaultTitle?: string;
  onSave: (doc: CaseDocument) => void;
};

const TemplateToDocumentModal: React.FC<Props> = ({ open, onClose, templates, context, defaultTitle, onSave }) => {
  const safeTemplates = useMemo(() => (Array.isArray(templates) ? templates : []), [templates]);
  const [templateId, setTemplateId] = useState<string>(() => safeTemplates[0]?.id || '');
  const selected = safeTemplates.find(t => t.id === templateId) || null;

  const initialTitle = defaultTitle || selected?.name || 'مستند';
  const [docTitle, setDocTitle] = useState(initialTitle);

  const computed = useMemo(() => {
    const base = selected?.content || '';
    return applyTemplate(base, { ...context, date: todayISO() });
  }, [selected?.content, context]);

  const [content, setContent] = useState(computed);

  // keep content updated when template changes
  React.useEffect(() => {
    setDocTitle(defaultTitle || selected?.name || 'مستند');
    setContent(computed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, computed]);

  if (!open) return null;

  const save = () => {
    const id = `doc_${Math.random().toString(36).slice(2, 10)}`;
    const doc: CaseDocument = {
      id,
      name: docTitle.trim() || 'مستند',
      type: 'Document',
      mimeType: 'text/plain',
      category: 'generated',
      uploadDate: todayISO(),
      status: 'Draft',
      content,
    };
    onSave(doc);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-[#1a1a2e] p-5 text-white flex justify-between items-center">
          <div className="font-black">إنشاء مستند من نموذج</div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-600">النموذج</label>
              <select className="w-full mt-2 border border-slate-200 rounded-2xl px-4 py-3 font-bold outline-none" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {safeTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-600">عنوان المستند</label>
              <input className="w-full mt-2 border border-slate-200 rounded-2xl px-4 py-3 font-bold outline-none" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-600">النص (قابل للتعديل)</label>
            <textarea className="w-full mt-2 border border-slate-200 rounded-2xl px-4 py-4 font-bold outline-none min-h-[320px]" value={content} onChange={(e) => setContent(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button onClick={onClose} className="px-6 py-3 rounded-2xl font-black text-slate-500 hover:bg-slate-50">إلغاء</button>
            <button onClick={save} className="px-7 py-3 rounded-2xl font-black text-white" style={{ backgroundColor: '#0f172a' }}>حفظ المستند</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateToDocumentModal;
