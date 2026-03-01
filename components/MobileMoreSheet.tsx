import React, { useEffect } from 'react';
import { SystemConfig } from '../types';

type Item = {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  hidden?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onOpenSearch: () => void;
  onLogout: () => void;
  isAdmin?: boolean;
  config?: SystemConfig;
};

const MobileMoreSheet: React.FC<Props> = ({ open, onClose, onNavigate, onOpenSearch, onLogout, isAdmin, config }) => {
  const primary = config?.primaryColor || '#0f172a';
  const secondary = config?.secondaryColor || '#d4af37';
  const fontFamily = config?.fontFamily || 'Cairo';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const items: Item[] = [
    {
      id: 'reminders',
      label: 'التذكيرات',
      subtitle: 'اليوم والقادم والمتأخر',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      ),
    },
    {
      id: 'notebook',
      label: 'المفكرة',
      subtitle: 'ملاحظات سريعة داخل البرنامج',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        </svg>
      ),
    },
    {
      id: 'accounting',
      label: 'المالية',
      subtitle: 'فواتير / إيصالات / تقارير',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 1v22" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17 5H9.5a3.5 3.5 0 000 7H14a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
    {
      id: 'links',
      label: 'روابط مهمة',
      subtitle: 'دليل الروابط القانونية والخدمات',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 00-7.07-7.07L10 4" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M14 11a5 5 0 00-7.07 0L5.52 12.4a5 5 0 007.07 7.07L14 20" />
        </svg>
      ),
    },
    {
      id: 'templates',
      label: 'النماذج',
      subtitle: 'مركز النماذج (Admin)',
      hidden: !isAdmin,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 13h8" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 17h8" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'الإعدادات',
      subtitle: 'الهوية / المحاكم / النسخ / السحابة',
      hidden: !isAdmin,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 1v2" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 21v2" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4.22 4.22l1.42 1.42" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18.36 18.36l1.42 1.42" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M1 12h2" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 12h2" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4.22 19.78l1.42-1.42" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18.36 5.64l1.42-1.42" />
          <circle cx="12" cy="12" r="4" strokeWidth="2" />
        </svg>
      ),
    },
  ];

  const visible = items.filter((x) => !x.hidden);

  return (
    <div
      className="fixed inset-0 z-[120] md:hidden print:hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ fontFamily }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="absolute left-0 right-0 bottom-0">
        <div className="mx-auto max-w-[980px]">
          <div className="m-2 rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-black" style={{ color: primary }}>المزيد</div>
                <div className="text-[11px] text-slate-500 mt-0.5">تنقل سريع وخدمات إضافية</div>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-xl font-black border border-slate-200"
              >
                إغلاق
              </button>
            </div>

            <div className="p-3">
              <button
                onClick={() => {
                  onClose();
                  onOpenSearch();
                }}
                className="w-full mb-3 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: primary }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="11" cy="11" r="8" strokeWidth="2" />
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-800">بحث شامل</div>
                    <div className="text-[11px] text-slate-500">Ctrl + K</div>
                  </div>
                </div>
                <div className="text-xs font-black" style={{ color: secondary }}>فتح</div>
              </button>

              <div className="grid grid-cols-1 gap-2">
                {visible.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => {
                      onClose();
                      onNavigate(it.id);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${secondary}22`, color: primary }}
                      >
                        {it.icon}
                      </div>
                      <div className="text-right min-w-0">
                        <div className="text-sm font-black text-slate-800 truncate">{it.label}</div>
                        {it.subtitle && <div className="text-[11px] text-slate-500 truncate">{it.subtitle}</div>}
                      </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    onClose();
                    if (confirm('تسجيل الخروج؟')) onLogout();
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-rose-600 text-white font-black"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMoreSheet;
