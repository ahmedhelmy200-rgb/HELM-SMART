
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CaseManagement from './components/CaseManagement';
import ClientManagement from './components/ClientManagement';
import Accounting from './components/Accounting';
import ImportantLinks from './components/ImportantLinks';
import Settings from './components/Settings'; // New Component
import RemindersPage from './components/reminders/RemindersPage';
import GlobalSearchModal from './components/GlobalSearchModal';
import MobileBottomNav from './components/MobileBottomNav';
import MobileMoreSheet from './components/MobileMoreSheet';
import NotebookPage from './components/NotebookPage';
import TemplatesCenter from './components/TemplatesCenter';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import PublicLanding from './components/PublicLanding';
import { getCloudConfig, kvGetMany, kvSetMany } from './services/cloudSync';
import { exportExcelXls, exportPdfViaPrint, exportPdfViaPrintWithLetterhead } from './services/exporter';
import { playReminderSound, ensureAudioReady } from './services/reminderSound';
import { DEFAULT_OFFICE_TEMPLATES } from './services/defaultTemplates';
import { LegalCase, CaseStatus, Client, Invoice, Expense, Receipt, UserRole, SystemConfig, SystemLog, Reminder, NotebookNote } from './types';

type FocusTarget =
  | { type: 'client'; id: string }
  | { type: 'case'; id: string }
  | { type: 'invoice'; id: string }
  | { type: 'receipt'; id: string }
  | { type: 'reminder'; id: string }
  | { type: 'note'; id: string }
  | null;


// ... (Data Initialization constants remain same as previous file, omitted for brevity but assumed present)
// Re-declaring constants for completeness in this file context:
const INITIAL_CLIENTS: Client[] = [
  { id: "c_164a4d4bf193", name: "احمد ثروت", type: "Individual", email: "", phone: "", emiratesId: "", address: "", createdAt: "01/01/2025", totalCases: 0, tags: [], notes: "", profileImage: "https://placehold.co/400x400/0f172a/d4af37?text=ID+Img" },
  { id: "eid_784199298525710", name: "احمد حلمي", type: "Individual", email: "ahmedhelmy200@gmail.com", phone: "0544144149", emiratesId: "784199298525710", address: "", createdAt: "01/01/2025", totalCases: 0, tags: [], notes: "نوع الوكالة: وكالة خاصة بالقضايا | رقم الطلب: 563081 | تاريخ التقديم: 2025-10-27 | حالة الطلب: منجزة" },
  // ... (Assume other clients are here)
];
const INITIAL_CASES: LegalCase[] = [];
const INITIAL_EXPENSES: Expense[] = [];
const INITIAL_INVOICES: Invoice[] = [];

const INITIAL_CONFIG: SystemConfig = {
  officeName: 'أحمد حلمي',
  officeSlogan: 'للمحاماة والاستشارات القانونية',
  officePhone: '0544144149',
  officeEmail: 'ahmedhelmy200@gmail.com',
  officeAddress: 'العين - الإمارات العربية المتحدة',
  officeWebsite: 'helm.ae',
  primaryColor: '#0f172a',
  secondaryColor: '#d4af37',
  backgroundColor: '#f8fafc',
  fontFamily: 'Cairo',
  logo: null,
  stamp: null,
  services: [
    { id: 'srv1', name: 'استشارات قانونية', description: 'استشارة شفهية لمدة ساعة في المكتب', price: 1000 },
    { id: 'srv2', name: 'صياغة العقود', description: 'صياغة العقود التجارية والمدنية', price: 2500 }
  ],
  caseTypes: [
    { id: 'ct_personal', name: 'أحوال شخصية' },
    { id: 'ct_labor', name: 'عمالي' },
    { id: 'ct_civil', name: 'مدني' },
    { id: 'ct_commercial', name: 'تجاري' },
    { id: 'ct_criminal', name: 'جنائي' },
  ],
  // Courts list is configurable from Settings. Stored as strings inside cases.
  courts: [
    { id: 'crt_dubai', name: 'محاكم دبي', emirate: 'دبي' },
    { id: 'crt_adjd', name: 'دائرة القضاء - أبوظبي', emirate: 'أبوظبي' },
    { id: 'crt_sharjah', name: 'محاكم الشارقة', emirate: 'الشارقة' },
    { id: 'crt_ajman', name: 'محاكم عجمان', emirate: 'عجمان' },
    { id: 'crt_rak', name: 'محاكم رأس الخيمة', emirate: 'رأس الخيمة' },
    { id: 'crt_fujairah', name: 'محاكم الفجيرة', emirate: 'الفجيرة' },
    { id: 'crt_uaq', name: 'محاكم أم القيوين', emirate: 'أم القيوين' },
    { id: 'crt_federal', name: 'المحاكم الاتحادية', emirate: 'اتحادي' },
    { id: 'crt_moj', name: 'وزارة العدل - خدمات القضايا (اتحادي)', emirate: 'اتحادي' },
    { id: 'crt_difc', name: 'محاكم مركز دبي المالي العالمي (DIFC)', emirate: 'دبي' },
    { id: 'crt_adgm', name: 'محاكم سوق أبوظبي العالمي (ADGM)', emirate: 'أبوظبي' },
    { id: 'crt_sharia', name: 'المحاكم الشرعية', emirate: 'متعدد' },
  ],
  invoiceTemplates: [
    { id: 'tpl_fees', title: 'دفعة أتعاب', content: 'دفعة من أتعاب المحاماة عن القضية رقم {caseNumber}' },
    { id: 'tpl_consult', title: 'استشارة قانونية', content: 'أتعاب استشارة قانونية بخصوص الموكل {clientName}' },
  ],
  smartTemplates: {
    whatsappInvoice:
      '*{officeName}*\n\nعزيزي/عزيزتي {clientName}،\nنرفق لكم تفاصيل الفاتورة رقم: {invoiceNumber}\nالقيمة: {amount} د.إ\nالبيان: {description}\n\nيرجى التكرم بالسداد، وشكرًا لثقتكم.\n{officeName}',
    whatsappPaymentReminder:
      '*{officeName}*\n\nعزيزي/عزيزتي {clientName}،\nنود تذكيركم بوجود مستحقات مالية بقيمة {due} د.إ.\nيرجى التواصل لتسوية المستحقات.\n\nمع التحية،\n{officeName}',
    whatsappSessionReminder:
      '*{officeName}*\n\nعزيزي/عزيزتي {clientName}،\nتذكير بموعد الجلسة القادمة.\nرقم القضية: {caseNumber}\nالمحكمة: {court}\nالتاريخ: {date}\n\nلأي استفسار، يرجى التواصل.\n{officeName}',
    whatsappGeneral:
      '*{officeName}*\n\nمرحبًا {clientName}،\nنود الاطمئنان عليكم. هل لديكم أي استفسارات قانونية؟\n\n{officeName}',
    invoiceLineNote:
      'دفعة أتعاب عن القضية رقم: {caseNumber}',
    invoiceFooter:
      'يرجى إرسال نسخة من إيصال السداد/التحويل على واتساب المكتب.\n{officePhone} | {officeEmail} | {officeWebsite}',
    receiptFooter:
      'هذا السند محرر بواسطة نظام حلم الذكي لإدارة المكتب.\n{officePhone} | {officeEmail} | {officeWebsite}',
  },
  officeTemplates: DEFAULT_OFFICE_TEMPLATES,
  reminderSettings: {
    enableSound: true,
    sound: 'chime',
    volume: 0.6,
  },
  cloudDocuments: {
    enableStorageSync: false,
    bucket: 'helm_docs',
  },
  invoiceFormatting: {
    prefix: 'INV-',
    suffix: '',
    nextSequence: 1001
  },
  features: {
    enableAI: false,
    enableAnalysis: false,
    enableWhatsApp: true
  }
};

const withSafeConfigDefaults = (saved: Partial<SystemConfig> | null): SystemConfig => {
  const merged: SystemConfig = saved ? ({ ...INITIAL_CONFIG, ...saved } as SystemConfig) : INITIAL_CONFIG;

  // Ensure non-empty, usable defaults even if user restored/cleared arrays
  if (!merged.caseTypes || merged.caseTypes.length === 0) merged.caseTypes = INITIAL_CONFIG.caseTypes;
  if (!merged.invoiceTemplates || merged.invoiceTemplates.length === 0) merged.invoiceTemplates = INITIAL_CONFIG.invoiceTemplates;
  if (!merged.courts || merged.courts.length === 0) merged.courts = INITIAL_CONFIG.courts;
  if (!merged.smartTemplates) merged.smartTemplates = INITIAL_CONFIG.smartTemplates;
  if (!merged.officeTemplates || merged.officeTemplates.length === 0) merged.officeTemplates = DEFAULT_OFFICE_TEMPLATES;
  if (!merged.reminderSettings) merged.reminderSettings = INITIAL_CONFIG.reminderSettings;
  if (!merged.cloudDocuments) merged.cloudDocuments = INITIAL_CONFIG.cloudDocuments;

  return merged;
};

// Robust localStorage parsing & data normalization
const safeParse = <T,>(key: string, raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    try { localStorage.removeItem(key); } catch {}
    return fallback;
  }
};

const asNumber = (v: any, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeInvoices = (arr: any, fallback: Invoice[]): Invoice[] => {
  if (!Array.isArray(arr)) return fallback;
  return arr
    .filter((x) => x && typeof x === 'object')
    .map((inv: any) => ({
      ...inv,
      amount: asNumber(inv.amount, 0),
      discountValue: inv.discountValue !== undefined ? asNumber(inv.discountValue, 0) : undefined,
      finalAmount: inv.finalAmount !== undefined ? asNumber(inv.finalAmount, asNumber(inv.amount, 0)) : undefined,
    }));
};

const normalizeExpenses = (arr: any, fallback: Expense[]): Expense[] => {
  if (!Array.isArray(arr)) return fallback;
  return arr
    .filter((x) => x && typeof x === 'object')
    .map((e: any) => ({
      ...e,
      amount: asNumber(e.amount, 0),
    }));
};

const normalizeCases = (arr: any, fallback: LegalCase[]): LegalCase[] => {
  if (!Array.isArray(arr)) return fallback;
  return arr
    .filter((x) => x && typeof x === 'object')
    .map((c: any) => ({
      ...c,
      documents: Array.isArray(c.documents) ? c.documents : [],
      totalFee: asNumber(c.totalFee, 0),
      paidAmount: asNumber(c.paidAmount, 0),
    }));
};

const normalizeClients = (arr: any, fallback: Client[]): Client[] => {
  if (!Array.isArray(arr)) return fallback;
  return arr.filter((x) => x && typeof x === 'object') as Client[];
};

const normalizeReminders = (arr: any): Reminder[] => {
  if (!Array.isArray(arr)) return [];
  return arr.filter((x) => x && typeof x === 'object') as Reminder[];
};

const normalizeReceipts = (arr: any): Receipt[] => {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x) => x && typeof x === 'object')
    .map((r: any) => ({
      ...r,
      amount: asNumber(r.amount, 0),
      date: String(r.date || ''),
      kind: r.kind === 'out' ? 'out' : 'in',
      method: r.method || 'Cash',
    }))
    .filter((r) => !!r.id && !!r.receiptNumber);
};

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loggedInClient, setLoggedInClient] = useState<Client | null>(null);

  // Public website + system unified entry.
  // Default: show office website first. Direct system access: add ?app=1
  const [authStage, setAuthStage] = useState<'landing' | 'login'>(() => {
    try {
      const p = window.location.pathname || '/';
      if (p === '/app' || p.startsWith('/app/')) return 'login';
      return new URLSearchParams(window.location.search).get('app') === '1' ? 'login' : 'landing';
    } catch {
      return 'landing';
    }
  });
  
  // Admin Profile State
  const [adminProfile, setAdminProfile] = useState<{name: string, title: string} | null>(null);
  
  // Data State
  const [cases, setCases] = useState<LegalCase[]>(() => {
    const saved = localStorage.getItem('legalmaster_cases');
    const parsed = safeParse<any>('legalmaster_cases', saved, INITIAL_CASES);
    return normalizeCases(parsed, INITIAL_CASES);
  });

    const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('legalmaster_clients');
    const parsed = safeParse<any>('legalmaster_clients', saved, INITIAL_CLIENTS);
    return normalizeClients(parsed, INITIAL_CLIENTS);
  });

    const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('legalmaster_invoices');
    const parsed = safeParse<any>('legalmaster_invoices', saved, INITIAL_INVOICES);
    return normalizeInvoices(parsed, INITIAL_INVOICES);
  });

    const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('legalmaster_expenses');
    const parsed = safeParse<any>('legalmaster_expenses', saved, INITIAL_EXPENSES);
    return normalizeExpenses(parsed, INITIAL_EXPENSES);
  });

  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    const saved = localStorage.getItem('legalmaster_receipts');
    const parsed = safeParse<any>('legalmaster_receipts', saved, []);
    return normalizeReceipts(parsed);
  });

    const [systemConfig, setSystemConfig] = useState<SystemConfig>(() => {
    const saved = localStorage.getItem('legalmaster_config');
    const parsed = safeParse<any>('legalmaster_config', saved, null);
    return withSafeConfigDefaults(parsed);
  });

  // SYSTEM LOGS STATE
    const [systemLogs, setSystemLogs] = useState<SystemLog[]>(() => {
    const savedLogs = localStorage.getItem('legalmaster_logs');
    return safeParse<SystemLog[]>('legalmaster_logs', savedLogs, []);
  });

  // REMINDERS STATE
    const [reminders, setReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem('legalmaster_reminders');
    const parsed = safeParse<any>('legalmaster_reminders', saved, []);
    return normalizeReminders(parsed);
  });

  // NOTEBOOK (quick notes)
  const [notes, setNotes] = useState<NotebookNote[]>(() => {
    const saved = localStorage.getItem('legalmaster_notes');
    return safeParse<NotebookNote[]>('legalmaster_notes', saved, []);
  });

  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const consumeFocus = () => setFocusTarget(null);

  // Cloud autosync toggle (stored locally)
  const [cloudAutoSync, setCloudAutoSync] = useState<boolean>(() => localStorage.getItem('helm_cloud_auto_sync') === '1');
  const [cloudLastSync, setCloudLastSync] = useState<string | null>(() => localStorage.getItem('helm_cloud_last_sync'));
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudDirty, setCloudDirty] = useState<boolean>(false);

  const [cloudCfgRev, setCloudCfgRev] = useState(0);
  useEffect(() => {
    const h = () => setCloudCfgRev(v => v + 1);
    try { window.addEventListener('helm_cloud_config_changed', h); } catch {}
    return () => {
      try { window.removeEventListener('helm_cloud_config_changed', h); } catch {}
    };
  }, []);
  const cloudDirtySkip = useRef(true);
  useEffect(() => {
    // لا تعتبر البيانات "غير متزامنة" عند أول تشغيل/تحميل.
    if (cloudDirtySkip.current) {
      cloudDirtySkip.current = false;
      return;
    }
    setCloudDirty(true);
  }, [clients, cases, invoices, expenses, receipts, systemConfig, systemLogs, reminders, notes]);


  const hasMounted = useRef(false);
  useEffect(() => {
    hasMounted.current = true;
  }, []);

  // Global Search hotkey: Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = (e.key || '').toLowerCase() === 'k';
      if (isK && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
      if ((e.key || '').toLowerCase() === 'escape') {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Persist Logic
  useEffect(() => localStorage.setItem('legalmaster_cases', JSON.stringify(cases)), [cases]);
  useEffect(() => localStorage.setItem('legalmaster_clients', JSON.stringify(clients)), [clients]);
  useEffect(() => localStorage.setItem('legalmaster_invoices', JSON.stringify(invoices)), [invoices]);
  useEffect(() => localStorage.setItem('legalmaster_expenses', JSON.stringify(expenses)), [expenses]);
  useEffect(() => localStorage.setItem('legalmaster_receipts', JSON.stringify(receipts)), [receipts]);
  useEffect(() => localStorage.setItem('legalmaster_config', JSON.stringify(systemConfig)), [systemConfig]);
  useEffect(() => localStorage.setItem('legalmaster_logs', JSON.stringify(systemLogs)), [systemLogs]);
  useEffect(() => localStorage.setItem('legalmaster_reminders', JSON.stringify(reminders)), [reminders]);
  useEffect(() => localStorage.setItem('legalmaster_notes', JSON.stringify(notes)), [notes]);
  useEffect(() => localStorage.setItem('helm_cloud_auto_sync', cloudAutoSync ? '1' : '0'), [cloudAutoSync]);



  // Background reminders notification (desktop/browser)
  const remindersRef = useRef<Reminder[]>(reminders);
  useEffect(() => { remindersRef.current = reminders; }, [reminders]);

  const configRef = useRef<SystemConfig>(systemConfig);
  useEffect(() => { configRef.current = systemConfig; }, [systemConfig]);

  // Ensure audio can play after first user gesture (mobile/browser restrictions)
  useEffect(() => {
    const onGesture = () => { void ensureAudioReady(); };
    window.addEventListener('pointerdown', onGesture, { once: true });
    return () => window.removeEventListener('pointerdown', onGesture);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const list = remindersRef.current;
      const dueIds: string[] = [];
      for (const r of list) {
        if (r.done) continue;
        if (r.notifiedAt) continue;
        const time = r.dueTime || '09:00';
        const dt = new Date(`${r.dueDate}T${time}:00`);
        if (!isNaN(dt.getTime()) && dt.getTime() <= now.getTime()) {
          dueIds.push(r.id);
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('تذكير', { body: `${r.title}\n${r.dueDate}${r.dueTime ? ' • ' + r.dueTime : ''}` });
            } catch {
              // ignore
            }
          }
        }
      }
      if (dueIds.length) {
        // صوت التذكير (مرة واحدة لكل دورة)
        try { playReminderSound(configRef.current); } catch {}
        setReminders(prev => prev.map(r => dueIds.includes(r.id) ? { ...r, notifiedAt: new Date().toISOString() } : r));
      }
    };

    tick();
    const id = window.setInterval(tick, 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  // Tab switching based on role
  useEffect(() => {
    if (userRole === UserRole.CLIENT) {
      setActiveTab('clients');
    } else if (userRole === UserRole.ADMIN) {
      setActiveTab('dashboard');
    }
  }, [userRole]);

  // LOGGER FUNCTION
  const logAction = (user: string, role: string, action: string) => {
    const newLog: SystemLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleString('en-AE'), // Use local time
      user,
      role,
      action
    };
    setSystemLogs(prev => [...prev, newLog]);
  };

  const enterSystem = () => {
    setAuthStage('login');
    try {
      const url = new URL(window.location.href);
      url.pathname = '/app';
      url.searchParams.delete('app');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch {}
  };

  const backToSite = () => {
    setAuthStage('landing');
    try {
      const url = new URL(window.location.href);
      url.pathname = '/';
      url.searchParams.delete('app');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch {}
  };

  // LOGIN HANDLER
  const handleLogin = (role: UserRole, data?: any) => {
    setUserRole(role);
    if (role === UserRole.CLIENT) {
      setLoggedInClient(data);
      setAdminProfile(null);
      logAction(data.name, 'Client', 'Portal Login');
    } else if (role === UserRole.ADMIN) {
      setLoggedInClient(null);
      if (data && data.name) {
        setAdminProfile({ name: data.name, title: data.title || 'المدير العام' });
        logAction(data.name, data.title || 'Admin', 'System Login');
      } else {
        setAdminProfile({ name: 'المدير العام', title: 'إدارة المكتب' });
        logAction('Unknown Admin', 'Admin', 'System Login');
      }
    }
  };

  // LOGOUT HANDLER
  const handleLogout = () => {
    if(adminProfile) logAction(adminProfile.name, 'Admin', 'Logout');
    else if(loggedInClient) logAction(loggedInClient.name, 'Client', 'Logout');
    
    setUserRole(null);
    setLoggedInClient(null);
    setAdminProfile(null);
    setActiveTab('dashboard');
  };


  // Action Handlers
  const handleAddCase = (newCase: LegalCase) => setCases([newCase, ...cases]);
  const handleUpdateCase = (updatedCase: LegalCase) => setCases(cases.map(c => c.id === updatedCase.id ? updatedCase : c));
  const handleDeleteCase = (caseId: string) => {
      setCases(cases.filter(c => c.id !== caseId));
      if(adminProfile) logAction(adminProfile.name, 'Admin', `Deleted Case ID: ${caseId}`);
  };

  const handleAddClient = (newClient: Client) => setClients([newClient, ...clients]);
  const handleUpdateClient = (updatedClient: Client) => setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
  
  const handleDeleteClient = (clientId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الموكل؟ سيتم حذف جميع القضايا والفواتير المرتبطة به.')) {
      setClients(clients.filter(c => c.id !== clientId));
      setCases(cases.filter(c => c.clientId !== clientId));
      setInvoices(invoices.filter(i => i.clientId !== clientId));
      if(adminProfile) logAction(adminProfile.name, 'Admin', `Deleted Client ID: ${clientId}`);
    }
  };

  const handleAddInvoice = (newInvoice: Invoice) => setInvoices([newInvoice, ...invoices]);
  const handleAddExpense = (newExp: Expense) => setExpenses([newExp, ...expenses]);
  const handleUpdateInvoice = (updatedInvoice: Invoice) => setInvoices(invoices.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
  const handleAddReceipt = (newReceipt: Receipt) => setReceipts([newReceipt, ...receipts]);

  const handleBackup = () => {
    const backupData = {
      backupVersion: 1,
      appName: 'HelmSmart',
      timestamp: new Date().toISOString(),
      config: systemConfig,
      clients,
      cases,
      invoices,
      expenses,
      receipts,
      logs: systemLogs,
      reminders,
      notes
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HelmSmart_Backup_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if(adminProfile) logAction(adminProfile.name, 'Admin', 'System Backup Downloaded');
  };


  const handleExportExcel = () => {
    try {
      const sections = [
        {
          title: 'الموكلين',
          headers: ['ID', 'الاسم', 'النوع', 'الهاتف', 'البريد', 'رقم الهوية', 'العنوان', 'تاريخ الإضافة', 'ملاحظات', 'عدد المستندات'],
          rows: clients.map(c => [
            c.id, c.name, c.type, c.phone || '', c.email || '', c.emiratesId || '',
            c.address || '', c.createdAt || '', c.notes || '', (c.documents || []).length
          ])
        },
        {
          title: 'القضايا',
          headers: ['ID', 'رقم القضية', 'عنوان القضية', 'الموكل', 'الخصم', 'المحكمة', 'الحالة', 'الجلسة القادمة', 'المحامي', 'الرسوم', 'المدفوع', 'عدد المستندات'],
          rows: cases.map(k => [
            k.id, k.caseNumber || '', k.title || '', k.clientName || '', k.opponentName || '',
            k.court || '', k.status || '', k.nextHearingDate || '', k.assignedLawyer || '',
            k.totalFee ?? 0, k.paidAmount ?? 0, (k.documents || []).length
          ])
        },
        {
          title: 'الفواتير',
          headers: ['ID', 'رقم الفاتورة', 'الموكل', 'القضية', 'المبلغ', 'التاريخ', 'الحالة', 'الوصف'],
          rows: invoices.map(i => [
            i.id, i.invoiceNumber, i.clientName, i.caseTitle, i.amount, i.date, i.status, i.description || ''
          ])
        },
        {
          title: 'الإيصالات',
          headers: ['ID', 'رقم السند', 'النوع', 'المبلغ', 'التاريخ', 'الطريقة', 'الموكل', 'القضية', 'بيان'],
          rows: receipts.map(r => [
            r.id,
            r.receiptNumber,
            r.kind === 'out' ? 'صرف' : 'قبض',
            r.amount,
            r.date,
            r.method || '',
            r.clientName || '',
            r.caseTitle || '',
            r.note || ''
          ])
        },
        {
          title: 'المصروفات',
          headers: ['ID', 'التاريخ', 'التصنيف', 'القيمة', 'الحالة', 'البيان'],
          rows: expenses.map(e => [
            e.id, e.date, e.category, e.amount, e.status, e.description || ''
          ])
        },
        {
          title: 'التذكيرات',
          headers: ['ID', 'العنوان', 'التاريخ', 'الوقت', 'الأولوية', 'تم', 'ملاحظات'],
          rows: reminders.map(r => [
            r.id, r.title, r.dueDate, r.dueTime || '', r.priority || '', r.done ? 'نعم' : 'لا', r.note || ''
          ])
        }
      ];

      exportExcelXls(`HelmSmart_Export_${new Date().toISOString().slice(0,10)}`, sections);
    } catch (e: any) {
      alert('فشل تصدير Excel.');
    }
  };

  const handleExportPdf = () => {
    const esc = (s: any) => String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const table = (title: string, headers: string[], rows: any[][]) => {
      const thead = `<tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>`;
      const tbody = rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
      return `
        <h1 style="font-size:18px;margin:18px 0 10px">${esc(title)}</h1>
        <table dir="rtl">
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      `;
    };

    const style = `
      <style>
        table{border-collapse:collapse;width:100%;font-size:12px;margin:8px 0 18px}
        th,td{border:1px solid #ddd;padding:6px;vertical-align:top;white-space:pre-wrap}
        th{background:#f3f4f6;font-weight:700}
      </style>
    `;

    const html =
      style +
      `<div dir="rtl">
        <h1 style="font-size:22px;margin:0 0 4px">${esc(systemConfig.officeName || 'تقرير')}</h1>
        <div style="color:#6b7280;font-size:12px;margin-bottom:14px">تاريخ التصدير: ${esc(new Date().toLocaleString('en-AE'))}</div>
        ${table('الموكلين', ['الاسم','الهاتف','البريد','الهوية','ملاحظات'], clients.map(c => [c.name, c.phone||'', c.email||'', c.emiratesId||'', c.notes||'']))}
        ${table('القضايا', ['رقم القضية','العنوان','الموكل','المحكمة','الحالة','الجلسة'], cases.map(k => [k.caseNumber||'', k.title||'', k.clientName||'', k.court||'', k.status||'', k.nextHearingDate||'']))}
        ${table('الفواتير', ['رقم','الموكل','القضية','المبلغ','التاريخ','الحالة'], invoices.map(i => [i.invoiceNumber, i.clientName, i.caseTitle, i.amount, i.date, i.status]))}
        ${table('الإيصالات', ['رقم','النوع','المبلغ','التاريخ','الطريقة','الموكل','القضية','البيان'], receipts.map(r => [r.receiptNumber, r.kind==='out'?'صرف':'قبض', r.amount, r.date, r.method||'', r.clientName||'', r.caseTitle||'', r.note||'']))}
        ${table('المصروفات', ['التاريخ','التصنيف','القيمة','الحالة','البيان'], expenses.map(e => [e.date, e.category, e.amount, e.status, e.description||'']))}
        ${table('التذكيرات', ['العنوان','التاريخ','الوقت','الأولوية','تم'], reminders.map(r => [r.title, r.dueDate, r.dueTime||'', r.priority||'', r.done?'نعم':'لا']))}
      </div>`;

    exportPdfViaPrintWithLetterhead('تقرير البرنامج', html, {
      officeName: systemConfig.officeName,
      officeSlogan: systemConfig.officeSlogan,
      officePhone: systemConfig.officePhone,
      officeEmail: systemConfig.officeEmail,
      officeAddress: systemConfig.officeAddress,
      officeWebsite: systemConfig.officeWebsite,
      primaryColor: systemConfig.primaryColor,
      secondaryColor: systemConfig.secondaryColor,
      logo: systemConfig.logo,
      stamp: systemConfig.stamp,
      fontFamily: systemConfig.fontFamily,
    });
  };

  const handleRestore = (data: any) => {
    // Restore is intentionally tolerant: it accepts both the new backup format
    // and older backups that might not contain all fields.
    try {
      const restoredConfig = data?.config ? withSafeConfigDefaults(data.config) : systemConfig;
      const restoredClients = Array.isArray(data?.clients) ? data.clients : clients;
      const restoredCases = Array.isArray(data?.cases) ? data.cases : cases;
      const restoredInvoices = Array.isArray(data?.invoices) ? data.invoices : invoices;
      const restoredExpenses = Array.isArray(data?.expenses) ? data.expenses : expenses;
      const restoredReceipts = Array.isArray(data?.receipts) ? data.receipts : receipts;
      const restoredLogs = Array.isArray(data?.logs) ? data.logs : systemLogs;
      const restoredReminders = Array.isArray(data?.reminders) ? data.reminders : reminders;
      const restoredNotes = Array.isArray(data?.notes) ? data.notes : notes;

      setSystemConfig(restoredConfig);
      setClients(restoredClients);
      setCases(restoredCases);
      setInvoices(restoredInvoices);
      setExpenses(restoredExpenses);
      setReceipts(restoredReceipts);
      setSystemLogs(restoredLogs);
      setReminders(restoredReminders);
      setNotes(restoredNotes);

      logAction(adminProfile?.name || 'Admin', 'Admin', 'System Backup Restored');
      alert('✅ تم استعادة النسخة الاحتياطية بنجاح.');
    } catch (e) {
      alert('تعذر استعادة النسخة. تأكد من صحة ملف JSON.');
    }
  };


  // CLOUD SYNC (Supabase KV)
  const handleCloudUpload = async (silent = false) => {
    try {
      setCloudError(null);
      const cfg = getCloudConfig();
      if (!cfg) {
        if (!silent) alert('لم يتم إعداد التخزين السحابي. أدخل بيانات Supabase من الإعدادات.');
        return;
      }

      const rows = [
        { key: 'legalmaster_config', value: systemConfig },
        { key: 'legalmaster_clients', value: clients },
        { key: 'legalmaster_cases', value: cases },
        { key: 'legalmaster_invoices', value: invoices },
        { key: 'legalmaster_expenses', value: expenses },
        { key: 'legalmaster_receipts', value: receipts },
        { key: 'legalmaster_logs', value: systemLogs },
        { key: 'legalmaster_reminders', value: reminders },
        { key: 'legalmaster_notes', value: notes },
      ];

      await kvSetMany(rows as any, cfg as any);
      const t = new Date().toISOString();
      localStorage.setItem('helm_cloud_last_sync', t);
      setCloudLastSync(t);
      setCloudDirty(false);
      if (!silent) alert('تم رفع البيانات إلى السحابة بنجاح.');
    } catch (e: any) {
      const msg = e?.message || 'Cloud sync failed';
      setCloudError(msg);
      if (!silent) alert(`فشل رفع البيانات للسحابة: ${msg}`);
    }
  };

  const handleCloudRestore = async () => {
    try {
      setCloudError(null);
      const cfg = getCloudConfig();
      if (!cfg) return alert('لم يتم إعداد التخزين السحابي.');

      const keys = [
        'legalmaster_config',
        'legalmaster_clients',
        'legalmaster_cases',
        'legalmaster_invoices',
        'legalmaster_expenses',
        'legalmaster_receipts',
        'legalmaster_logs',
        'legalmaster_reminders',
        'legalmaster_notes',
      ];
      const rows = await kvGetMany(keys, cfg as any);
      const map = new Map(rows.map(r => [r.key, (r as any).value]));

      const payload = {
        config: map.get('legalmaster_config'),
        clients: map.get('legalmaster_clients'),
        cases: map.get('legalmaster_cases'),
        invoices: map.get('legalmaster_invoices'),
        expenses: map.get('legalmaster_expenses'),
        receipts: map.get('legalmaster_receipts'),
        logs: map.get('legalmaster_logs'),
        reminders: map.get('legalmaster_reminders'),
        notes: map.get('legalmaster_notes'),
      };

      if (confirm('سيتم استبدال البيانات الحالية بما هو موجود في السحابة. هل تود الاستمرار؟')) {
        handleRestore(payload);
        setCloudDirty(false);
        alert('تمت الاستعادة من السحابة.');
      }
    } catch (e: any) {
      const msg = e?.message || 'Cloud restore failed';
      setCloudError(msg);
      alert(`فشل الاستعادة من السحابة: ${msg}`);
    }
  };

  // Auto Sync (debounced)
  const cloudSyncTimer = useRef<number | null>(null);
  const cloudSyncBusy = useRef(false);

  useEffect(() => {
    if (!cloudAutoSync) return;
    if (!getCloudConfig()) return;

    if (cloudSyncTimer.current) window.clearTimeout(cloudSyncTimer.current);
    cloudSyncTimer.current = window.setTimeout(async () => {
      if (cloudSyncBusy.current) return;
      cloudSyncBusy.current = true;
      try {
        await handleCloudUpload(true);
      } finally {
        cloudSyncBusy.current = false;
      }
    }, 3000);

    return () => {
      if (cloudSyncTimer.current) window.clearTimeout(cloudSyncTimer.current);
    };
  }, [cloudAutoSync, clients, cases, invoices, expenses, receipts, systemConfig, systemLogs, reminders]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        if (userRole === UserRole.CLIENT)
          return <div className="text-center p-20 font-bold text-slate-500">غير مصرح بالدخول لهذه الصفحة</div>;
        return <Dashboard cases={cases} clients={clients} invoices={invoices} expenses={expenses} userRole={userRole} config={systemConfig} onNavigate={(t) => setActiveTab(t)} />;

      case 'cases':
        if (userRole === UserRole.CLIENT)
          return <div className="text-center p-20 font-bold text-slate-500">غير مصرح بالدخول لهذه الصفحة</div>;
        return (
          <CaseManagement
            cases={cases}
            clients={clients}
            config={systemConfig}
            onAddCase={handleAddCase}
            onUpdateCase={handleUpdateCase}
            onDeleteCase={handleDeleteCase}
            onAddClient={handleAddClient}
            focusCaseId={focusTarget?.type === 'case' ? focusTarget.id : undefined}
            onConsumeFocus={consumeFocus}
          />
        );

      case 'clients':
        if (userRole === UserRole.CLIENT && loggedInClient) {
          return (
            <ClientManagement
              clients={clients}
              cases={cases}
              invoices={invoices}
              config={systemConfig}
              onAddClient={handleAddClient}
              onAddCase={handleAddCase}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={() => {}}
              onAddInvoice={() => {}}
              viewOnlyClientId={loggedInClient.id}
              focusClientId={focusTarget?.type === 'client' ? focusTarget.id : undefined}
              onConsumeFocus={consumeFocus}
            />
          );
        }
        return (
          <ClientManagement
            clients={clients}
            cases={cases}
            invoices={invoices}
            config={systemConfig}
            onAddClient={handleAddClient}
            onAddCase={handleAddCase}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
            onAddInvoice={handleAddInvoice}
          />
        );

      case 'reminders':
        return <RemindersPage reminders={reminders} setReminders={setReminders} cases={cases} clients={clients} focusReminderId={focusTarget?.type === 'reminder' ? focusTarget.id : undefined} onConsumeFocus={consumeFocus} />;

      case 'templates':
        if (userRole !== UserRole.ADMIN) return <div className="p-20 text-center font-bold text-red-500">غير مصرح بالدخول للنماذج</div>;
        return <TemplatesCenter config={systemConfig} onUpdateConfig={setSystemConfig} />;

      case 'notebook':
        if (userRole === UserRole.CLIENT) return <div className="p-20 text-center font-bold text-slate-500">غير مصرح بالدخول لهذه الصفحة</div>;
        return <NotebookPage config={systemConfig} onNotesChanged={setNotes} focusNoteId={focusTarget?.type === 'note' ? focusTarget.id : undefined} onConsumeFocus={consumeFocus} />;

      case 'accounting':
        if (userRole === UserRole.CLIENT)
          return <div className="text-center p-20 font-bold text-slate-500">غير مصرح بالدخول لهذه الصفحة</div>;
        return (
          <Accounting
            invoices={invoices}
            cases={cases}
            expenses={expenses}
            receipts={receipts}
            clients={clients}
            onAddInvoice={handleAddInvoice}
            onUpdateInvoice={handleUpdateInvoice}
            onAddExpense={handleAddExpense}
            onAddReceipt={handleAddReceipt}
            onUpdateClient={handleUpdateClient}
            config={systemConfig}
            onUpdateConfig={setSystemConfig}
            focusInvoiceId={focusTarget?.type === 'invoice' ? focusTarget.id : undefined}
            focusReceiptId={focusTarget?.type === 'receipt' ? focusTarget.id : undefined}
            onConsumeFocus={consumeFocus}
          />
        );

      case 'links':
        return <ImportantLinks />;

      case 'settings':
        if (userRole !== UserRole.ADMIN) return <div className="p-20 text-center font-bold text-red-500">غير مصرح بالدخول للإعدادات</div>;
        return (
          <Settings
            config={systemConfig}
            onUpdateConfig={(newConf) => {
              setSystemConfig(newConf);
              logAction(adminProfile?.name || 'Admin', 'Admin', 'Updated System Settings');
            }}
            onBackup={handleBackup}
            onRestore={handleRestore}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            logs={systemLogs}
            onCloudUpload={handleCloudUpload}
            onCloudRestore={handleCloudRestore}
            cloudAutoSync={cloudAutoSync}
            setCloudAutoSync={setCloudAutoSync}
            cloudLastSync={cloudLastSync}
            cloudError={cloudError}
          />
        );

      default:
        return <Dashboard cases={cases} clients={clients} invoices={invoices} expenses={expenses} userRole={userRole} config={systemConfig} />;
    }
  };


  if (!userRole) {
    if (authStage === 'landing') {
      return <PublicLanding config={systemConfig} onEnterSystem={enterSystem} />;
    }

    return (
      <div className="relative">
        <button
          onClick={backToSite}
          className="fixed top-4 left-4 z-50 px-4 py-2 rounded-xl text-xs font-black bg-black/40 backdrop-blur border"
          style={{ borderColor: `${systemConfig.secondaryColor || '#d4af37'}66`, color: systemConfig.secondaryColor || '#d4af37' }}
        >
          العودة للموقع
        </button>
        <Login onLogin={handleLogin} clients={clients} config={systemConfig} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div 
      className="min-h-screen flex flex-col transition-all duration-500"
      style={{ 
        fontFamily: systemConfig.fontFamily || 'Cairo', 
        backgroundColor: systemConfig.backgroundColor || '#f8fafc' 
      }}
    >
      
      {/* Top Navigation Bar for Admin */}
      {userRole !== UserRole.CLIENT && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          config={systemConfig}
          onLogout={handleLogout}
          userRole={(userRole === UserRole.ADMIN ? 'ADMIN' : 'STAFF') as any}
          cloudStatus={{ configured: !!getCloudConfig(), dirty: cloudDirty, lastSync: cloudLastSync, error: cloudError }}
          onOpenSearch={() => setGlobalSearchOpen(true)}
        />
      )}
      
      {/* Client Portal Header */}
      {userRole === UserRole.CLIENT && (
        <header className="bg-[#0f172a] text-white p-6 shadow-xl border-b-4 border-[#d4af37]">
           <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
              <div>
                 <h1 className="text-xl font-black text-[#d4af37]">بوابة الموكلين</h1>
                 <p className="text-xs text-slate-400">مكتب المستشار أحمد حلمي</p>
              </div>
              <button onClick={() => { if(confirm('تسجيل الخروج؟')) handleLogout(); }} className="text-sm bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20">خروج</button>
           </div>
        </header>
      )}
      
      {/* Main Content Area - Adjusted top padding to accommodate fixed header */}
      <main 
        className={`flex-1 w-full max-w-screen-2xl mx-auto overflow-x-hidden relative pb-28 md:pb-10 transition-all duration-300 ${userRole !== UserRole.CLIENT ? 'pt-28' : ''}`}
      >
        {renderContent()}
      </main>

      {/* Mobile Bottom Navigation (Admin/Staff) */}
      {userRole !== UserRole.CLIENT && (
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenSearch={() => setGlobalSearchOpen(true)}
          onOpenMore={() => setMobileMoreOpen(true)}
          config={systemConfig}
        />
      )}

      <MobileMoreSheet
        open={mobileMoreOpen}
        onClose={() => setMobileMoreOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
        onOpenSearch={() => setGlobalSearchOpen(true)}
        onLogout={handleLogout}
        isAdmin={userRole === UserRole.ADMIN}
        config={systemConfig}
      />

      <GlobalSearchModal
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        onSelect={(r) => {
          setGlobalSearchOpen(false);
          setFocusTarget({ type: r.type, id: r.id });
          if (r.type === 'client') setActiveTab('clients');
          else if (r.type === 'case') setActiveTab('cases');
          else if (r.type === 'invoice' || r.type === 'receipt') setActiveTab('accounting');
          else if (r.type === 'reminder') setActiveTab('reminders');
          else if (r.type === 'note') setActiveTab('notebook');
        }}
        config={systemConfig}
        clients={clients}
        cases={cases}
        invoices={invoices}
        receipts={receipts}
        reminders={reminders}
        notes={notes}
      />
      
      {/* Admin Footer Info (Optional, kept minimal) */}
      {userRole === UserRole.ADMIN && (
        <div className="fixed bottom-4 left-4 z-40 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-slate-100 text-[10px] font-bold text-slate-400 print:hidden">
           Logged in as: {adminProfile?.name} ({adminProfile?.title})
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
};

export default App;