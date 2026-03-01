
export enum UserRole {
  ADMIN = 'ADMIN',
  FINANCE = 'FINANCE',
  CLIENT = 'CLIENT'
}

export enum CaseStatus {
  ACTIVE = 'نشط',
  PENDING = 'قيد الانتظار',
  CLOSED = 'مغلق',
  APPEAL = 'استئناف',
  JUDGMENT = 'حكم',
  LITIGATION = 'مرافعة'
}

export enum CourtType {
  DUBAI = 'محاكم دبي',
  ADJD = 'محاكم أبوظبي',
  FEDERAL = 'المحاكم الاتحادية',
  DIFC = 'محاكم مركز دبي المالي العالمي',
  SHARIAH = 'المحاكم الشرعية'
}

// Dynamic court list configured from Settings. Used for case entry dropdowns.
export interface CourtConfig {
  id: string;
  name: string;
  emirate?: string; // e.g. دبي، أبوظبي ... (optional)
}

export interface CaseDocument {
  id: string;
  name: string;
  type: string;
  // MIME type (e.g. application/pdf, image/png). Optional for backward compatibility.
  mimeType?: string;
  // Optional classification to make client document libraries easier to manage.
  category?: string;
  uploadDate: string;
  content?: string;
  status?: 'Signed' | 'Draft';
  description?: string;
  reviewReminder?: string;
  // File key for IndexedDB local storage (optional)
  fileKey?: string;
  // Storage metadata for cloud/local
  storage?: {
    provider: 'indexeddb' | 'supabase';
    bucket?: string;
    path?: string;
    size?: number;
  };
}

export interface LegalCase {
  id: string;
  caseNumber: string;
  title: string;
  // Optional dynamic type (configured from Settings).
  caseType?: string;
  clientId: string;
  clientName: string;
  opponentName: string;
  // Court is stored as a string for forward/backward compatibility.
  // Older data may contain values from CourtType enum.
  court: string;
  status: CaseStatus;
  nextHearingDate: string;
  assignedLawyer: string;
  createdAt: string;
  documents: CaseDocument[];
  totalFee: number;
  paidAmount: number;
  reminderPreferences?: {
    sevenDays: boolean;
    oneDay: boolean;
  };
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  caseId: string;
  caseTitle: string;
  clientId: string;
  clientName: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Unpaid' | 'Partial';
  description: string;

  // Optional advanced invoicing fields (backward compatible)
  discountValue?: number;
  discountType?: 'percent' | 'fixed';
  finalAmount?: number;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  status: 'Paid' | 'Pending';
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  kind: 'in' | 'out';
  date: string; // YYYY-MM-DD
  amount: number;
  method?: string; // Cash/Transfer/Card/etc
  note?: string;

  // Links (optional)
  clientId?: string;
  clientName?: string;
  caseId?: string;
  caseNumber?: string;
  caseTitle?: string;
  linkedInvoiceId?: string;
  linkedExpenseId?: string;
}

// Notebook / quick notes (local-first, safe to sync as plain JSON)
export interface NotebookNote {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  pinned?: boolean;
}


export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  emiratesId: string;
  address?: string;
  platformAccount?: string;
  dateOfBirth?: string;
  profileImage?: string;
  type: 'Individual' | 'Corporate';
  totalCases: number;
  createdAt: string;
  notes?: string;
  tags?: string[];
  documents?: CaseDocument[];
  // Optional client category to separate office clients from other contacts.
  category?: 'office' | 'other';
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price?: number;
}

// Invoice templates (used in Settings to create reusable billing descriptions)
export interface InvoiceTemplate {
  id: string;
  title: string;
  content: string;
}

// Dynamic case types configured from Settings
export interface CaseTypeConfig {
  id: string;
  name: string;
}

// New Interface for System Logs
export interface SystemLog {
  id: string;
  timestamp: string;
  user: string;
  action: string; // e.g., "Login", "Update Settings", "Export Backup"
  role: string;
}

// Enhanced System Config
export interface SystemConfig {
  officeName: string;
  officeSlogan: string;

  // Optional contact fields to appear on PDFs / reports
  officePhone?: string;
  officeEmail?: string;
  officeAddress?: string;
  officeWebsite?: string;

  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string; // New: App Background Color
  fontFamily: string;      // New: App Font Family
  logo: string | null;
  stamp: string | null;
  services: ServiceItem[];

  // Dynamic lists (safe defaults are applied in App.tsx)
  caseTypes?: CaseTypeConfig[];
  invoiceTemplates?: InvoiceTemplate[];
  courts?: CourtConfig[];

  /**
   * Smart templates used across WhatsApp messages and PDF/print outputs.
   * Token placeholders supported (examples):
   * {officeName} {clientName} {caseNumber} {caseTitle} {invoiceNumber} {amount} {due} {date}
   */
  smartTemplates?: {
    whatsappInvoice: string;
    whatsappPaymentReminder: string;
    whatsappSessionReminder: string;
    whatsappGeneral: string;
    invoiceLineNote: string;
    invoiceFooter: string;
    receiptFooter: string;
  };

  officeTemplates: CaseDocument[];
  invoiceFormatting: {
    prefix: string;
    suffix: string;
    nextSequence: number;
  };
  // Feature Flags for modular control
  features: {
    enableAI: boolean;
    enableAnalysis: boolean;
    enableWhatsApp: boolean;
  };


  // Reminder sounds/settings
  reminderSettings?: {
    enableSound: boolean;
    sound: 'beep' | 'chime' | 'bell';
    volume: number; // 0..1
  };

  // Cloud documents storage (Supabase Storage) - optional
  cloudDocuments?: {
    enableStorageSync: boolean;
    bucket: string;
  };
}


export type ReminderSource =
  | { type: 'manual' }
  | { type: 'case_hearing'; caseId: string }
  | { type: 'doc_review'; caseId: string; docId: string };

export interface Reminder {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM (optional)
  note?: string;
  priority?: 'low' | 'normal' | 'high';
  done?: boolean;
  createdAt: string;
  source: ReminderSource;
  notifiedAt?: string; // ISO
}
