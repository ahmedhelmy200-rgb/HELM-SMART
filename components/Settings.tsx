
import React, { useState, useRef } from 'react';
import { SystemConfig, ServiceItem, CaseDocument, SystemLog, CaseTypeConfig, InvoiceTemplate, CourtConfig } from '../types';
import { getCloudConfig, setCloudConfig, clearCloudConfig, getCloudAuth, cloudSignInWithPassword, cloudSignOut } from '../services/cloudSync';
import { ICONS } from '../constants';
import { playReminderSound } from '../services/reminderSound';

interface SettingsProps {
  config: SystemConfig;
  onUpdateConfig: (newConfig: SystemConfig) => void;
  onBackup: () => void;
  onRestore: (data: any) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  logs: SystemLog[];
  onCloudUpload: (silent?: boolean) => Promise<void>;
  onCloudRestore: () => Promise<void>;
  cloudAutoSync: boolean;
  setCloudAutoSync: (v: boolean) => void;
  cloudLastSync: string | null;
  cloudError: string | null;
}

const Settings: React.FC<SettingsProps> = ({ config, onUpdateConfig, onBackup, onRestore, onExportExcel, onExportPdf, logs, onCloudUpload, onCloudRestore, cloudAutoSync, setCloudAutoSync, cloudLastSync, cloudError }) => {
  const [activeSection, setActiveSection] = useState<'general' | 'branding' | 'caseTypes' | 'courts' | 'financial' | 'logs' | 'database'>('general');
  const [localConfig, setLocalConfig] = useState<SystemConfig>(config);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const [newCaseType, setNewCaseType] = useState('');
  const [newCourtName, setNewCourtName] = useState('');
  const [newCourtEmirate, setNewCourtEmirate] = useState('');

  const addCourt = () => {
    const name = newCourtName.trim();
    if (!name) return;
    const exists = (localConfig.courts || []).some(c => c.name.trim() === name);
    if (exists) return alert('هذه المحكمة موجودة بالفعل.');
    const next: CourtConfig[] = [
      ...(localConfig.courts || []),
      { id: `crt_${Math.random().toString(36).slice(2, 10)}`, name, emirate: newCourtEmirate.trim() || undefined }
    ];
    updateField('courts', next);
    setNewCourtName('');
    setNewCourtEmirate('');
  };

  // Cloud config (Supabase)
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
  const envAnon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";
  const hasEnv = !!envUrl && !!envAnon;
  const hasLocalStored = typeof localStorage !== "undefined" && !!(localStorage.getItem("helm_cloud_url") && localStorage.getItem("helm_cloud_anon"));
  const [cloudMode, setCloudMode] = useState<"local" | "env">(() => (hasEnv && !hasLocalStored ? "env" : "local"));

  const initialCloud = getCloudConfig();
  const [cloudUrl, setCloudUrl] = useState<string>(() => (typeof localStorage !== 'undefined' ? (localStorage.getItem('helm_cloud_url') || '') : '') || (initialCloud?.url || ''));
  const [cloudAnon, setCloudAnon] = useState<string>(() => (typeof localStorage !== 'undefined' ? (localStorage.getItem('helm_cloud_anon') || '') : '') || (initialCloud?.anonKey || ''));
  const [cloudTable, setCloudTable] = useState<string>(() => (typeof localStorage !== 'undefined' ? (localStorage.getItem('helm_cloud_table') || '') : '') || (initialCloud?.table || 'kv_store'));

  // Cloud Auth (Supabase Auth) - يُستخدم فقط إذا كنت فعّلت RLS (وهو الوضع المُوصى به)
  const [cloudAuthEmail, setCloudAuthEmail] = useState<string>(() => (typeof localStorage !== 'undefined' ? (localStorage.getItem('helm_cloud_user_email') || '') : '') );
  const [cloudAuthPassword, setCloudAuthPassword] = useState<string>('');
  const [cloudSignedIn, setCloudSignedIn] = useState<boolean>(() => !!getCloudAuth());

  const [newTemplate, setNewTemplate] = useState<{title: string, content: string}>({ title: '', content: '' });

  const updateSmartTemplate = (key: keyof NonNullable<SystemConfig['smartTemplates']>, value: string) => {
    const current = localConfig.smartTemplates || {
      whatsappInvoice: '',
      whatsappPaymentReminder: '',
      whatsappSessionReminder: '',
      whatsappGeneral: '',
      invoiceLineNote: '',
      invoiceFooter: '',
      receiptFooter: ''
    };
    updateField('smartTemplates', { ...current, [key]: value });
  };

  const updateField = (field: keyof SystemConfig, value: any) => {
    const updated = { ...localConfig, [field]: value };
    setLocalConfig(updated);
    onUpdateConfig(updated);
  };

  const saveCloud = (next?: Partial<{ url: string; anonKey: string; table: string }>) => {
    const url = next?.url ?? cloudUrl;
    const anonKey = next?.anonKey ?? cloudAnon;
    const table = next?.table ?? cloudTable;
    setCloudConfig({ url, anonKey, table });
  };

  const useEnvOnly = () => {
    if (!hasEnv) return alert('لا توجد مفاتيح Supabase في ملف env.');
    clearCloudConfig();
                                cloudSignOut();
                                setCloudSignedIn(false);
    setCloudUrl(envUrl);
    setCloudAnon(envAnon);
    setCloudTable('kv_store');
    setCloudMode('env');
    alert('تم تفعيل وضع ENV (بدون حفظ محلي).\nملاحظة: قيم ENV ثابتة حسب وقت البناء. إذا غيّرت env يجب إعادة build.');
  };

  const copyEnvToLocal = () => {
    if (!hasEnv) return alert('لا توجد مفاتيح Supabase في ملف env.');
    setCloudMode('local');
    setCloudUrl(envUrl);
    setCloudAnon(envAnon);
    const table = cloudTable || 'kv_store';
    setCloudTable(table);
    setCloudConfig({ url: envUrl, anonKey: envAnon, table });
    alert('تم نسخ مفاتيح ENV إلى إعدادات هذا الجهاز.');
  };

  const enableLocalMode = () => {
    setCloudMode('local');
    saveCloud();
  };


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'stamp') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert('الحد الأقصى للصور 2 ميجابايت لضمان سرعة أداء النظام.');
      const reader = new FileReader();
      reader.onloadend = () => updateField(type, reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (confirm('تنبيه: استعادة النسخة سيؤدي لاستبدال كافة البيانات الحالية. هل تود الاستمرار؟')) {
            onRestore(json);
          }
        } catch (err) {
          alert('الملف غير صالح للاستعادة.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent, type: 'logo' | 'stamp') => {
      e.stopPropagation();
      if(confirm('هل أنت متأكد من حذف هذه الصورة الرسمية؟')) updateField(type, null);
  };

  const handleAddCaseType = () => {
    if(newCaseType.trim()) {
        const newType: CaseTypeConfig = { id: Math.random().toString(36).substr(2, 9), name: newCaseType.trim() };
        const updatedTypes = [...(localConfig.caseTypes || []), newType];
        updateField('caseTypes', updatedTypes);
        setNewCaseType('');
    }
  };

  const handleAddInvoiceTemplate = () => {
    if(newTemplate.title.trim() && newTemplate.content.trim()) {
        const newTpl: InvoiceTemplate = { id: Math.random().toString(36).substr(2, 9), ...newTemplate };
        const updatedTpls = [...(localConfig.invoiceTemplates || []), newTpl];
        updateField('invoiceTemplates', updatedTpls);
        setNewTemplate({ title: '', content: '' });
    }
  };

  const fonts = [
    { name: 'Cairo', label: 'خط كايرو (أساسي)' },
    { name: 'Tajawal', label: 'خط تجول' },
    { name: 'Almarai', label: 'خط المراعي' },
    { name: 'IBM Plex Sans Arabic', label: 'IBM Plex Sans' }
  ];

  return (
    <div className="p-8 lg:p-12 animate-in fade-in duration-500 bg-transparent min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-200">
        <div className="flex items-center gap-6">
            <div className="w-20 h-20 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-colors duration-500" style={{ backgroundColor: localConfig.primaryColor }}>
                <ICONS.Logo className="w-12 h-12" />
            </div>
            <div>
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">إعدادات النظام الشاملة</h2>
                <p className="text-slate-500 font-bold mt-1">التحكم في الهوية، المظهر، والقواعد التشغيلية للمكتب</p>
            </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/4 space-y-3">
            {[ 
                { id: 'general', label: 'بيانات المكتب', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' }, 
                { id: 'branding', label: 'الهوية والمظهر', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' }, 
                { id: 'caseTypes', label: 'تصنيفات القضايا', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' }, 
                { id: 'courts', label: 'قائمة المحاكم', icon: 'M3 21h18M4 10h16v11H4V10zM3 7l9-4 9 4M8 14v3m4-3v3m4-3v3' }, 
                { id: 'financial', label: 'المالية والفواتير', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }, 
                { id: 'logs', label: 'سجل العمليات', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }, 
                { id: 'database', label: 'البيانات والنسخ', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' } 
            ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveSection(tab.id as any)} 
                  className={`w-full flex items-center gap-4 p-5 rounded-[2rem] font-black text-sm transition-all shadow-sm ${activeSection === tab.id ? 'text-[#d4af37] shadow-xl translate-x-[-4px]' : 'bg-white text-slate-400 hover:bg-slate-50'}`} 
                  style={activeSection === tab.id ? { backgroundColor: localConfig.primaryColor } : {}}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon}></path></svg>
                    {tab.label}
                </button>
            ))}
        </div>

        <div className="lg:w-3/4 bg-white rounded-[4rem] p-12 shadow-xl border border-slate-100 min-h-[650px] animate-in fade-in slide-in-from-left duration-300">
            {activeSection === 'general' && (
                <div className="space-y-12">
                    <section>
                        <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-6 mb-8 uppercase tracking-widest">المعلومات الأساسية للمكتب</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">اسم المكتب الرسمي</label>
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37] transition-all" value={localConfig.officeName} onChange={(e) => updateField('officeName', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">الشعار اللفظي (Slogan)</label>
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37] transition-all" value={localConfig.officeSlogan} onChange={(e) => updateField('officeSlogan', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">رقم الهاتف</label>
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37] transition-all" value={localConfig.officePhone || ''} onChange={(e) => updateField('officePhone', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">البريد الإلكتروني</label>
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37] transition-all" value={localConfig.officeEmail || ''} onChange={(e) => updateField('officeEmail', e.target.value)} />
                            </div>
                            <div className="col-span-full space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">العنوان الكامل</label>
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37] transition-all" value={localConfig.officeAddress || ''} onChange={(e) => updateField('officeAddress', e.target.value)} />
                            </div>
                        </div>
                    </section>

                    <section className="bg-slate-50 rounded-[2.5rem] border border-slate-200 p-8">
                      <h4 className="text-lg font-black text-slate-800 mb-2">إعدادات صوت التذكيرات</h4>
                      <p className="text-xs font-bold text-slate-500 mb-6">يعمل الصوت عند حلول موعد التذكير (قد يتطلب أول مرة تفاعل/نقرة بسبب قيود المتصفح).</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4">
                          <input
                            type="checkbox"
                            checked={!!localConfig.reminderSettings?.enableSound}
                            onChange={(e) => {
                              const cur = localConfig.reminderSettings || { enableSound: true, sound: 'beep' as const, volume: 0.6 };
                              updateField('reminderSettings', { ...cur, enableSound: e.target.checked });
                            }}
                          />
                          <span className="font-black text-slate-800">تفعيل الصوت</span>
                        </label>

                        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4">
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">نوع الصوت</div>
                          <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none"
                            value={localConfig.reminderSettings?.sound || 'beep'}
                            onChange={(e) => {
                              const cur = localConfig.reminderSettings || { enableSound: true, sound: 'beep' as const, volume: 0.6 };
                              updateField('reminderSettings', { ...cur, sound: e.target.value as any });
                            }}
                          >
                            <option value="beep">Beep</option>
                            <option value="chime">Chime</option>
                            <option value="bell">Bell</option>
                          </select>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4">
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">مستوى الصوت</div>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={typeof localConfig.reminderSettings?.volume === 'number' ? localConfig.reminderSettings?.volume : 0.6}
                            onChange={(e) => {
                              const cur = localConfig.reminderSettings || { enableSound: true, sound: 'beep' as const, volume: 0.6 };
                              updateField('reminderSettings', { ...cur, volume: Number(e.target.value) });
                            }}
                            className="w-full"
                          />
                          <div className="text-[11px] font-bold text-slate-500 mt-1">{Math.round(((localConfig.reminderSettings?.volume ?? 0.6) as number) * 100)}%</div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2 justify-end">
                        <button
                          onClick={() => playReminderSound(localConfig)}
                          className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black hover:opacity-90"
                        >
                          تجربة الصوت
                        </button>
                      </div>
                    </section>
                </div>
            )}

            {activeSection === 'branding' && (
                <div className="space-y-12">
                    <section>
                        <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-6 mb-8 uppercase tracking-widest">تخصيص المظهر والهوية</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Color Pickers */}
                            <div className="space-y-8">
                                <h4 className="text-sm font-black text-slate-700">الألوان الرسمية</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">اللون الأساسي</label>
                                        <div className="flex items-center gap-4">
                                            <input type="color" className="w-12 h-12 rounded-xl cursor-pointer border-none" value={localConfig.primaryColor} onChange={(e) => updateField('primaryColor', e.target.value)} />
                                            <span className="font-mono text-xs font-bold text-slate-500 uppercase">{localConfig.primaryColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">اللون الثانوي</label>
                                        <div className="flex items-center gap-4">
                                            <input type="color" className="w-12 h-12 rounded-xl cursor-pointer border-none" value={localConfig.secondaryColor} onChange={(e) => updateField('secondaryColor', e.target.value)} />
                                            <span className="font-mono text-xs font-bold text-slate-500 uppercase">{localConfig.secondaryColor}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-6 border-t border-slate-100">
                                    <label className="text-xs font-black text-slate-700 uppercase tracking-widest">الخط العربي المستخدم</label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37]"
                                        value={localConfig.fontFamily}
                                        onChange={(e) => updateField('fontFamily', e.target.value)}
                                    >
                                        {fonts.map(font => (
                                            <option key={font.name} value={font.name} style={{ fontFamily: font.name }}>{font.label}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400 font-medium">سيتم تطبيق الخط المختار على كافة نصوص النظام والتقارير.</p>
                                </div>
                            </div>

                            {/* Appearance Preview */}
                            <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-200 flex flex-col items-center justify-center text-center">
                                <h4 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest">معاينة الألوان والخط</h4>
                                <div className="w-full space-y-4">
                                    <div className="p-4 rounded-2xl shadow-lg transition-colors duration-500" style={{ backgroundColor: localConfig.primaryColor }}>
                                        <p className="text-white font-black" style={{ fontFamily: localConfig.fontFamily }}>نص بالخط المختار (لون أساسي)</p>
                                    </div>
                                    <div className="p-4 rounded-2xl shadow-lg border-2 transition-colors duration-500" style={{ borderColor: localConfig.secondaryColor, color: localConfig.secondaryColor }}>
                                        <p className="font-black" style={{ fontFamily: localConfig.fontFamily }}>نص بالخط المختار (لون ثانوي)</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-12 pt-12 border-t border-slate-100">
                            {/* Logo Manager */}
                            <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-dashed border-slate-200 text-center hover:border-[#d4af37] transition-all cursor-pointer group relative" onClick={() => logoInputRef.current?.click()}>
                                <h4 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest">شعار المكتب (Logo)</h4>
                                <div className="w-48 h-48 mx-auto bg-white rounded-3xl shadow-inner flex items-center justify-center overflow-hidden relative group-hover:scale-[1.02] transition-transform border border-slate-100">
                                    {localConfig.logo ? (
                                        <div className="relative w-full h-full p-6">
                                            <img src={localConfig.logo} className="w-full h-full object-contain" />
                                            <button onClick={(e) => handleRemoveImage(e, 'logo')} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center opacity-20">
                                            <ICONS.Logo className="w-20 h-20" />
                                            <p className="text-[10px] font-black mt-2">اضغط للرفع</p>
                                        </div>
                                    )}
                                </div>
                                <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                            </div>
                            
                            {/* Stamp Manager */}
                            <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-dashed border-slate-200 text-center hover:border-[#d4af37] transition-all cursor-pointer group relative" onClick={() => stampInputRef.current?.click()}>
                                <h4 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest">الختم الرسمي (Stamp)</h4>
                                <div className="w-48 h-48 mx-auto bg-white rounded-full shadow-inner flex items-center justify-center overflow-hidden relative group-hover:scale-[1.02] transition-transform border border-slate-100">
                                    {localConfig.stamp ? (
                                        <div className="relative w-full h-full p-8">
                                            <img src={localConfig.stamp} className="w-full h-full object-contain" />
                                            <button onClick={(e) => handleRemoveImage(e, 'stamp')} className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center opacity-20">
                                            <div className="w-20 h-20 border-4 border-dashed border-slate-300 rounded-full"></div>
                                            <p className="text-[10px] font-black mt-2">اضغط للرفع</p>
                                        </div>
                                    )}
                                </div>
                                <input ref={stampInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'stamp')} />
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {activeSection === 'caseTypes' && (
              <div className="space-y-10">
                <h3 className="text-2xl font-black text-slate-800 border-b pb-6">تصنيفات القضايا</h3>

                <div className="bg-slate-50 rounded-[2.5rem] border border-slate-200 p-8">
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <input
                      className="flex-1 bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37]"
                      placeholder="أضف تصنيف جديد (مثال: تنفيذ / جزائي / مدني...)"
                      value={newCaseType}
                      onChange={(e) => setNewCaseType(e.target.value)}
                    />
                    <button
                      onClick={handleAddCaseType}
                      className="px-10 py-4 rounded-2xl font-black text-white shadow-lg hover:scale-[1.02] transition-all"
                      style={{ backgroundColor: localConfig.primaryColor }}
                    >
                      إضافة
                    </button>
                  </div>

                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(localConfig.caseTypes || []).map(ct => (
                      <div key={ct.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
                        <div className="font-black text-slate-700">{ct.name}</div>
                        <button
                          onClick={() => {
                            const updated = (localConfig.caseTypes || []).filter(x => x.id !== ct.id);
                            updateField('caseTypes', updated);
                          }}
                          className="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-black hover:bg-red-100"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                    {(localConfig.caseTypes || []).length === 0 && (
                      <div className="text-center text-slate-400 font-bold py-10 md:col-span-2">لا توجد تصنيفات. أضف أول تصنيف من الأعلى.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'courts' && (
              <div className="space-y-10">
                <h3 className="text-2xl font-black text-slate-800 border-b pb-6">قائمة المحاكم</h3>

                <div className="bg-slate-50 rounded-[2.5rem] border border-slate-200 p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      className="md:col-span-2 bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37]"
                      placeholder="اسم المحكمة (مثال: محاكم دبي / دائرة القضاء أبوظبي ...)"
                      value={newCourtName}
                      onChange={(e) => setNewCourtName(e.target.value)}
                    />
                    <input
                      className="bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37]"
                      placeholder="الإمارة (اختياري)"
                      value={newCourtEmirate}
                      onChange={(e) => setNewCourtEmirate(e.target.value)}
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={addCourt}
                      className="px-10 py-4 rounded-2xl font-black text-white shadow-lg hover:scale-[1.02] transition-all"
                      style={{ backgroundColor: localConfig.primaryColor }}
                    >
                      إضافة
                    </button>
                  </div>

                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(localConfig.courts || []).map((c) => (
                      <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-black text-slate-700">{c.name}</div>
                          {c.emirate && <div className="text-[11px] font-bold text-slate-400 mt-1">{c.emirate}</div>}
                        </div>
                        <button
                          onClick={() => {
                            const updated = (localConfig.courts || []).filter(x => x.id !== c.id);
                            updateField('courts', updated);
                          }}
                          className="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-black hover:bg-red-100"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                    {(localConfig.courts || []).length === 0 && (
                      <div className="text-center text-slate-400 font-bold py-10 md:col-span-2">لا توجد محاكم. أضف أول محكمة من الأعلى.</div>
                    )}
                  </div>

                  <div className="mt-8 p-6 bg-white rounded-2xl border border-slate-200">
                    <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">ملاحظة</div>
                    <div className="text-xs font-bold text-slate-600 leading-relaxed">
                      يتم استخدام هذه القائمة في إدخال القضايا (اختيار المحكمة). البيانات القديمة ستظل تعمل حتى لو كانت المحكمة غير موجودة بالقائمة.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'financial' && (
              <div className="space-y-12">
                <h3 className="text-2xl font-black text-slate-800 border-b pb-6">المالية والفواتير والنماذج</h3>

                {/* Invoice/Receipt Printing Identity */}
                <section className="bg-slate-50 rounded-[2.5rem] border border-slate-200 p-8">
                  <h4 className="text-lg font-black text-slate-800 mb-4">هوية الطباعة (الفواتير/الإيصالات)</h4>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed">
                    الشعار والختم يتم سحبهما من قسم الهوية. هنا يمكنك تخصيص النصوص الذكية التي تظهر أسفل المستندات ورسائل الواتساب.
                  </p>

                  <div className="mt-8 grid grid-cols-1 gap-6">
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">نص أسفل الفاتورة (Footer)</label>
                      <textarea
                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37] mt-2 min-h-[110px]"
                        value={localConfig.smartTemplates?.invoiceFooter || ''}
                        onChange={(e) => updateSmartTemplate('invoiceFooter', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">نص أسفل الإيصال (Footer)</label>
                      <textarea
                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37] mt-2 min-h-[110px]"
                        value={localConfig.smartTemplates?.receiptFooter || ''}
                        onChange={(e) => updateSmartTemplate('receiptFooter', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">ملاحظة سطر الفاتورة (Line Note)</label>
                      <input
                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37] mt-2"
                        value={localConfig.smartTemplates?.invoiceLineNote || ''}
                        onChange={(e) => updateSmartTemplate('invoiceLineNote', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-8 p-6 bg-white rounded-2xl border border-slate-200">
                    <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">الرموز المتاحة</div>
                    <div className="text-xs font-bold text-slate-600 leading-relaxed">
                      {'{officeName} {officePhone} {officeEmail} {officeWebsite} {clientName} {caseNumber} {caseTitle} {invoiceNumber} {amount} {due} {date} {court} {description}'}
                    </div>
                  </div>
                </section>

                {/* WhatsApp Templates */}
                <section className="bg-slate-50 rounded-[2.5rem] border border-slate-200 p-8">
                  <h4 className="text-lg font-black text-slate-800 mb-4">نماذج رسائل واتساب</h4>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">رسالة إرسال فاتورة</label>
                      <textarea className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37] mt-2 min-h-[130px]" value={localConfig.smartTemplates?.whatsappInvoice || ''} onChange={(e) => updateSmartTemplate('whatsappInvoice', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">رسالة تذكير مستحقات</label>
                      <textarea className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37] mt-2 min-h-[130px]" value={localConfig.smartTemplates?.whatsappPaymentReminder || ''} onChange={(e) => updateSmartTemplate('whatsappPaymentReminder', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">رسالة تذكير جلسة</label>
                      <textarea className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37] mt-2 min-h-[130px]" value={localConfig.smartTemplates?.whatsappSessionReminder || ''} onChange={(e) => updateSmartTemplate('whatsappSessionReminder', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">رسالة عامة</label>
                      <textarea className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37] mt-2 min-h-[110px]" value={localConfig.smartTemplates?.whatsappGeneral || ''} onChange={(e) => updateSmartTemplate('whatsappGeneral', e.target.value)} />
                    </div>
                  </div>
                </section>

                {/* Invoice Templates List */}
                <section className="bg-slate-50 rounded-[2.5rem] border border-slate-200 p-8">
                  <h4 className="text-lg font-black text-slate-800 mb-4">نماذج بنود الفواتير (الوصف)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input className="bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37]" placeholder="عنوان النموذج" value={newTemplate.title} onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))} />
                    <input className="bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#d4af37]" placeholder="محتوى النموذج" value={newTemplate.content} onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))} />
                  </div>
                  <button onClick={handleAddInvoiceTemplate} className="mt-4 px-10 py-4 rounded-2xl font-black text-white shadow-lg hover:scale-[1.02] transition-all" style={{ backgroundColor: localConfig.primaryColor }}>إضافة نموذج</button>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(localConfig.invoiceTemplates || []).map(tpl => (
                      <div key={tpl.id} className="bg-white border border-slate-200 rounded-2xl p-6">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-black text-slate-800">{tpl.title}</div>
                            <div className="text-xs font-bold text-slate-500 mt-2 leading-relaxed">{tpl.content}</div>
                          </div>
                          <button
                            onClick={() => updateField('invoiceTemplates', (localConfig.invoiceTemplates || []).filter(x => x.id !== tpl.id))}
                            className="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-black hover:bg-red-100"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    ))}
                    {(localConfig.invoiceTemplates || []).length === 0 && (
                      <div className="text-center text-slate-400 font-bold py-10 md:col-span-2">لا توجد نماذج. أضف أول نموذج من الأعلى.</div>
                    )}
                  </div>
                </section>
              </div>
            )}
            {activeSection === 'database' && (
                <div className="space-y-10">
                    <h3 className="text-2xl font-black text-slate-800 border-b pb-6">إدارة البيانات والنسخ الاحتياطي</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Export Card */}
                        <div className="p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden transition-colors duration-500 flex flex-col justify-between" style={{ backgroundColor: localConfig.primaryColor }}>
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <div className="relative z-10">
                                <h4 className="text-2xl font-black mb-3">تصدير قاعدة البيانات</h4>
                                <p className="text-slate-400 text-xs font-medium leading-relaxed mb-8">قم بحفظ نسخة كاملة من كافة الموكلين والقضايا والحسابات في ملف خارجي للرجوع إليه.</p>
                                <div className="space-y-3">
                                  <button onClick={onBackup} className="w-full bg-[#d4af37] text-[#0f172a] py-5 rounded-2xl font-black shadow-xl hover:scale-[1.02] transition-all">تحميل ملف النسخة (JSON)</button>
                                  <button onClick={onExportExcel} className="w-full bg-white/10 border border-white/20 text-white py-4 rounded-2xl font-black hover:bg-white/15 transition-all">تصدير Excel (XLS)</button>
                                  <button onClick={onExportPdf} className="w-full bg-white/10 border border-white/20 text-white py-4 rounded-2xl font-black hover:bg-white/15 transition-all">تصدير PDF (تقرير)</button>
                                </div>
                            </div>
                        </div>

                        {/* Import Card */}
                        <div className="p-10 rounded-[3rem] bg-white border-2 border-dashed border-slate-200 shadow-sm hover:border-[#d4af37] transition-all flex flex-col justify-between group">
                            <div>
                                <h4 className="text-2xl font-black text-slate-800 mb-3">استيراد / استعادة نسخة</h4>
                                <p className="text-slate-400 text-xs font-medium leading-relaxed mb-8">اختر ملف النسخة الاحتياطية من جهازك لاستعادة كافة السجلات والإعدادات المحفوظة.</p>
                            </div>
                            <input 
                              ref={restoreInputRef} 
                              type="file" 
                              accept=".json" 
                              className="hidden" 
                              onChange={handleRestoreFile} 
                            />
                            <button 
                              onClick={() => restoreInputRef.current?.click()}
                              className="w-full bg-slate-50 text-slate-600 py-5 rounded-2xl font-black hover:bg-slate-100 transition-all border border-slate-100 group-hover:border-[#d4af37]/20"
                            >
                              رفع الملف واستعادة السجلات
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 p-10 rounded-[3rem] bg-slate-50 border border-slate-200 shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                          <h4 className="text-2xl font-black text-slate-800">التخزين السحابي (Supabase)</h4>
                          <p className="text-slate-500 text-xs font-bold mt-1">
                            يرفع نفس بيانات النظام (الموكلين/القضايا/الفواتير/المصروفات/الإعدادات/السجل/التذكيرات) إلى السحابة.
                          </p>
                        </div>
                        <div className="text-xs font-bold text-slate-600">
                          <div>آخر مزامنة: {cloudLastSync ? new Date(cloudLastSync).toLocaleString('en-AE') : '—'}</div>
                          {cloudError && <div className="text-rose-600 mt-1">خطأ: {cloudError}</div>}
                        </div>
                      </div>

                      {hasEnv && (
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5 p-4 rounded-2xl bg-white border border-slate-200">
                          <div className="text-xs font-black text-slate-700">
                            مصدر المفاتيح: <span className="text-slate-900">{cloudMode === 'env' ? 'ENV (وقت البناء)' : 'هذا الجهاز (محلي)'}</span>
                            {cloudMode === 'env' && (
                              <div className="text-[11px] font-bold text-slate-500 mt-1">
                                ملاحظة: تغيير ملف env بعد البناء لا يؤثر على EXE إلا بعد إعادة build.
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={useEnvOnly}
                              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-black hover:opacity-90"
                            >
                              استخدام ENV فقط
                            </button>
                            <button
                              onClick={copyEnvToLocal}
                              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-black hover:bg-slate-100"
                            >
                              نسخ ENV للمحلي
                            </button>
                            <button
                              onClick={enableLocalMode}
                              className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#0f172a] font-black hover:opacity-90"
                            >
                              تفعيل المحلي
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Supabase URL</label>
                          <input
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-[#d4af37]"
                            placeholder="https://xxxx.supabase.co"
                            value={cloudUrl}
                            readOnly={cloudMode === 'env'}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCloudUrl(v);
                              if (cloudMode === 'local') saveCloud({ url: v });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anon Key</label>
                          <input
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-[#d4af37]"
                            placeholder="eyJhbGciOi..."
                            value={cloudAnon}
                            readOnly={cloudMode === 'env'}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCloudAnon(v);
                              if (cloudMode === 'local') saveCloud({ anonKey: v });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Table</label>
                          <input
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-[#d4af37]"
                            placeholder="kv_store"
                            value={cloudTable}
                            readOnly={cloudMode === 'env'}
                            onChange={(e) => {
                              const v = e.target.value || 'kv_store';
                              setCloudTable(v);
                              if (cloudMode === 'local') saveCloud({ table: v });
                            }}
                          />
                        </div>
                      </div>


                      <div className="mt-6 p-4 rounded-2xl bg-white border border-slate-200">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="text-xs font-black text-slate-800">
                            Cloud Auth (مُوصى به مع RLS)
                            <div className="text-[11px] font-bold text-slate-500 mt-1">
                              الحالة: {cloudSignedIn ? `مسجّل (${cloudAuthEmail || 'بدون بريد'})` : 'غير مسجّل'}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {!cloudSignedIn ? (
                              <button
                                onClick={async () => {
                                  try {
                                    const cfg = getCloudConfig();
                                    if (!cfg) return alert('أدخل Supabase URL و Anon Key أولاً.');
                                    if (!cloudAuthEmail || !cloudAuthPassword) return alert('أدخل البريد وكلمة المرور.');
                                    await cloudSignInWithPassword(cloudAuthEmail.trim(), cloudAuthPassword, cfg as any);
                                    setCloudAuthPassword('');
                                    setCloudSignedIn(true);
                                    alert('تم تسجيل الدخول للسحابة بنجاح.');
                                  } catch (e: any) {
                                    alert(e?.message || 'فشل تسجيل الدخول للسحابة.');
                                  }
                                }}
                                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-black hover:opacity-90"
                              >
                                تسجيل دخول
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  cloudSignOut();
                                  setCloudSignedIn(false);
                                  alert('تم تسجيل الخروج.');
                                }}
                                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-black hover:bg-slate-100"
                              >
                                تسجيل خروج
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</label>
                            <input
                              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-[#d4af37]"
                              placeholder="email@example.com"
                              value={cloudAuthEmail}
                              onChange={(e) => setCloudAuthEmail(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                            <input
                              type="password"
                              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-[#d4af37]"
                              placeholder="********"
                              value={cloudAuthPassword}
                              onChange={(e) => setCloudAuthPassword(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="mt-3 text-[11px] font-bold text-slate-500 leading-relaxed">
                          إذا فعّلت RLS في Supabase (كما في supabase_schema.sql)، لازم تسجّل دخول هنا قبل (رفع/استعادة).
                          إذا لم تستخدم Auth وتريد وضع مفتوح، عطّل RLS على الجدول (غير مُوصى به).
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-6">
                        <label className="flex items-center gap-3 font-black text-slate-700">
                          <input
                            type="checkbox"
                            checked={cloudAutoSync}
                            onChange={(e) => setCloudAutoSync(e.target.checked)}
                            className="w-5 h-5 accent-[#d4af37]"
                          />
                          مزامنة تلقائية (بعد أي تعديل)
                        </label>

                        <div className="flex gap-2">
                          <button
                            onClick={() => onCloudUpload()}
                            className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black hover:opacity-90"
                          >
                            رفع إلى السحابة
                          </button>
                          <button
                            onClick={() => onCloudRestore()}
                            className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black hover:bg-slate-100"
                          >
                            استعادة من السحابة
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('مسح إعدادات السحابة من هذا الجهاز فقط؟')) {
                                clearCloudConfig();
                                cloudSignOut();
                                setCloudSignedIn(false);
                                setCloudUrl('');
                                setCloudAnon('');
                                setCloudTable('kv_store');
                                alert('تم مسح الإعدادات المحلية للسحابة.');
                              }
                            }}
                            className="px-5 py-3 rounded-2xl bg-rose-600 text-white font-black hover:opacity-90"
                          >
                            مسح الإعدادات
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 text-[11px] font-bold text-slate-500 leading-relaxed">
                        ملاحظة: إذا كانت البيانات تحتوي على مستندات كبيرة (Base64) قد تتجاوز حدود صف JSON في قاعدة البيانات.
                        في هذه الحالة نحتاج نقل الملفات إلى Supabase Storage وربطها كرابط بدل المحتوى.
                      </div>
                    </div>
                </div>
            )}
            {/* Other sections (caseTypes, financial, logs) remain logic-consistent with initial implementation */}
            {activeSection === 'logs' && (
                <div className="space-y-10">
                    <h3 className="text-2xl font-black text-slate-800 border-b pb-6">سجل العمليات الأخير</h3>
                    <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden">
                        <table className="w-full text-right text-xs">
                            <thead className="bg-[#0f172a] text-white" style={{ backgroundColor: localConfig.primaryColor }}>
                                <tr>
                                    <th className="p-5 font-black uppercase tracking-widest">المستخدم</th>
                                    <th className="p-5 font-black uppercase tracking-widest">العملية</th>
                                    <th className="p-5 font-black uppercase tracking-widest">التوقيت</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {logs.slice(-15).reverse().map(log => (
                                    <tr key={log.id} className="hover:bg-white transition-all">
                                        <td className="p-5 font-black text-slate-700">{log.user} <span className="text-[10px] text-slate-400 block">{log.role}</span></td>
                                        <td className="p-5 font-bold text-slate-600">{log.action}</td>
                                        <td className="p-5 font-mono text-slate-400">{log.timestamp}</td>
                                    </tr>
                                ))}
                                {logs.length === 0 && <tr><td colSpan={3} className="p-10 text-center text-slate-400 font-bold">لا توجد عمليات مسجلة حالياً</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
