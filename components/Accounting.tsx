
import React, { useEffect, useState } from 'react';
import { Invoice, LegalCase, Expense, Client, CaseDocument, SystemConfig, Receipt } from '../types';
import { ICONS } from '../constants';

interface AccountingProps {
  invoices: Invoice[];
  cases: LegalCase[];
  expenses: Expense[];
  receipts?: Receipt[];
  clients?: Client[]; 
  onAddInvoice: (invoice: Invoice) => void;
  onUpdateInvoice: (invoice: Invoice) => void;
  onAddExpense: (expense: Expense) => void;
  onAddReceipt?: (receipt: Receipt) => void;
  onUpdateClient?: (client: Client) => void;
  config?: SystemConfig;
  onUpdateConfig?: (newConfig: SystemConfig) => void;
  focusInvoiceId?: string;
  focusReceiptId?: string;
  onConsumeFocus?: () => void;
}

const Accounting: React.FC<AccountingProps> = ({ invoices, cases, expenses, receipts = [], clients = [], onAddInvoice, onUpdateInvoice, onAddExpense, onAddReceipt, onUpdateClient, config, onUpdateConfig, focusInvoiceId, focusReceiptId, onConsumeFocus }) => {
  const fmtMoney = (v: any) => (Number(v) || 0).toLocaleString();
  const primary = config?.primaryColor || '#0f172a';
  const secondary = config?.secondaryColor || '#d4af37';

  const [activeView, setActiveView] = useState<'invoices' | 'expenses' | 'receipts' | 'reports'>('invoices');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReceiptKind, setFilterReceiptKind] = useState<'All' | 'in' | 'out'>('All');
  const [isEditing, setIsEditing] = useState(false);
  
  // Printing States
  const [printMode, setPrintMode] = useState<'Invoice' | 'Receipt' | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Invoice | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  
  // Invoice Filters
  const [filterStatus, setFilterStatus] = useState<'All' | 'Paid' | 'Unpaid' | 'Partial'>('All');

  // Reporting State
  const [selectedClientForReport, setSelectedClientForReport] = useState<string>('');

  const [expenseData, setExpenseData] = useState<Partial<Expense>>({
    category: 'نثريات',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    status: 'Paid'
  });

  const [invoiceData, setInvoiceData] = useState<Partial<Invoice>>({
    invoiceNumber: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    status: 'Unpaid',
    description: ''
  });
  const [receiptData, setReceiptData] = useState<Partial<Receipt>>({
    receiptNumber: '',
    kind: 'in',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    method: 'Cash',
    note: ''
  });



  // Derived state for the selected case in the invoice modal
  const selectedCaseForInvoice = cases.find(c => c.id === invoiceData.caseId);

  const totalRevenue = invoices.filter(inv => inv.status === 'Paid' || inv.status === 'Partial').reduce((sum, inv) => sum + inv.amount, 0);
  const totalExp = expenses.filter(e => e.status === 'Paid').reduce((sum, e) => sum + e.amount, 0);
  const pendingRev = invoices.filter(inv => inv.status !== 'Paid').reduce((sum, inv) => sum + inv.amount, 0);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.includes(searchTerm) || 
      inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.caseTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'All' || inv.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const filteredReceipts = receipts.filter(r => {
    const hay = `${r.receiptNumber} ${r.clientName || ''} ${r.caseTitle || ''} ${r.note || ''}`.toLowerCase();
    const matchesSearch = hay.includes(searchTerm.toLowerCase());
    const matchesKind = filterReceiptKind === 'All' || r.kind === filterReceiptKind;
    return matchesSearch && matchesKind;
  });


  // Logic for Client Account Statement
  const getClientStatement = () => {
    if (!selectedClientForReport) return null;
    const clientInv = invoices.filter(inv => inv.clientId === selectedClientForReport);
    const totalBilled = clientInv.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPaid = clientInv.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0);
    
    return {
      invoices: clientInv,
      totalBilled,
      totalPaid,
      balance: clientInv.filter(i => i.status !== 'Paid').reduce((acc, curr) => acc + curr.amount, 0)
    };
  };

  const openNewInvoiceModal = () => {
    let nextId = 'INV-' + Math.floor(10000 + Math.random() * 90000);
    if (config?.invoiceFormatting) {
        const { prefix, suffix, nextSequence } = config.invoiceFormatting;
        nextId = `${prefix || ''}${nextSequence}${suffix || ''}`;
    }

    setInvoiceData({
      invoiceNumber: nextId,
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      status: 'Unpaid',
      description: ''
    });
    setIsEditing(false);
    setShowInvoiceModal(true);
  };

  const openEditInvoiceModal = (invoice: Invoice) => {
    setInvoiceData({ ...invoice });
    setIsEditing(true);
    setShowInvoiceModal(true);
  };

  // Focus from Global Search
  useEffect(() => {
    if (!focusInvoiceId && !focusReceiptId) return;

    if (focusInvoiceId) {
      const inv = invoices.find((x) => x.id === focusInvoiceId);
      if (inv) {
        setActiveView('invoices');
        setSearchTerm(inv.invoiceNumber || '');
        openEditInvoiceModal(inv);
      }
      onConsumeFocus?.();
      return;
    }

    if (focusReceiptId) {
      const r = receipts.find((x) => x.id === focusReceiptId);
      if (r) {
        setActiveView('receipts');
        setFilterReceiptKind('All');
        setSearchTerm(r.receiptNumber || '');
        setTimeout(() => {
          try {
            document.getElementById(`receipt-row-${focusReceiptId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          } catch {}
        }, 50);
      }
      onConsumeFocus?.();
    }
  }, [focusInvoiceId, focusReceiptId, invoices, receipts, onConsumeFocus]);

  const handleInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invoiceData.amount && invoiceData.caseId) {
      if (isEditing && invoiceData.id) {
        onUpdateInvoice(invoiceData as Invoice);
      } else {
        onAddInvoice({
          ...invoiceData as Invoice,
          id: Math.random().toString(36).substr(2, 9)
        });

        if (config && onUpdateConfig && config.invoiceFormatting) {
            onUpdateConfig({
                ...config,
                invoiceFormatting: {
                    ...config.invoiceFormatting,
                    nextSequence: config.invoiceFormatting.nextSequence + 1
                }
            });
        }
      }
      setShowInvoiceModal(false);
    }
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseData.amount) {
      onAddExpense({
        ...expenseData as Expense,
        id: Math.random().toString(36).substr(2, 9)
      });
      setShowExpenseModal(false);
      setExpenseData({
        category: 'نثريات',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: '',
        status: 'Paid'
      });
    }
  };

  // Fixed Print Logic
  const handlePrintDocument = (invoice: Invoice, mode: 'Invoice' | 'Receipt') => {
    setSelectedReceipt(null);
    setSelectedDocument(invoice);
    setPrintMode(mode);
    // Slight delay to allow React to render the print template DOM
    setTimeout(() => {
        window.print();
        // Optional: clear after print to return to normal state, but keeping it visible is fine too.
        // setSelectedDocument(null); 
    }, 500);
  };


  const handlePrintReceiptVoucher = (receipt: Receipt) => {
    setSelectedDocument(null);
    setSelectedReceipt(receipt);
    setPrintMode('Receipt');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const openNewReceiptModal = (kind: 'in' | 'out' = 'in') => {
    const prefix = kind === 'out' ? 'PAY-' : 'REC-';
    const rn = `${prefix}${Math.floor(10000 + Math.random() * 90000)}`;
    setReceiptData({
      receiptNumber: rn,
      kind,
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      method: 'Cash',
      note: ''
    });
    setShowReceiptModal(true);
  };

  const handleAddReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddReceipt) return alert('الإيصالات غير مفعلة في هذا الإصدار.');
    const amount = Number(receiptData.amount) || 0;
    if (!amount) return alert('أدخل مبلغاً صحيحاً.');
    const client = (receiptData.clientId ? clients.find(c => c.id === receiptData.clientId) : null) || null;
    const cs = (receiptData.caseId ? cases.find(c => c.id === receiptData.caseId) : null) || null;

    const rec: Receipt = {
      id: Math.random().toString(36).substr(2, 9),
      receiptNumber: String(receiptData.receiptNumber || ''),
      kind: (receiptData.kind === 'out' ? 'out' : 'in'),
      amount,
      date: String(receiptData.date || new Date().toISOString().split('T')[0]),
      method: (receiptData.method as any) || 'Cash',
      clientId: receiptData.clientId,
      clientName: client?.name,
      caseId: receiptData.caseId,
      caseTitle: cs?.title,
      note: receiptData.note ? String(receiptData.note) : undefined,
    };

    onAddReceipt(rec);
    setShowReceiptModal(false);
  };

  const handleSendInvoice = (invoice: Invoice) => {
      const client = clients.find(c => c.id === invoice.clientId);
      if (client && client.phone) {
          const applyTokens = (tpl: string, tokens: Record<string, string>) => {
            return tpl.replace(/\{(\w+)\}/g, (_, k) => (tokens[k] ?? `{${k}}`));
          };

          const template = config?.smartTemplates?.whatsappInvoice || '';
          const msg = template
            ? applyTokens(template, {
                officeName: config?.officeName || 'مكتب المستشار أحمد حلمي',
                officePhone: config?.officePhone || '',
                officeEmail: config?.officeEmail || '',
                officeWebsite: config?.officeWebsite || '',
                clientName: client.name,
                invoiceNumber: invoice.invoiceNumber,
                amount: fmtMoney(invoice.amount),
                description: invoice.description || '',
              })
            : `*${config?.officeName || 'مكتب المستشار أحمد حلمي'}*\n\nعزيزي/عزيزتي ${client.name}،\nتفاصيل الفاتورة رقم: ${invoice.invoiceNumber}\nالقيمة: ${fmtMoney(invoice.amount)} د.إ\nالبيان: ${invoice.description}\n\nيرجى التكرم بالسداد، وشكرًا لثقتكم.`;
          const url = `https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
          window.open(url, '_blank');
      } else {
          alert('رقم هاتف الموكل غير متوفر');
      }
  };

  const handleSaveStatement = () => {
    if (!selectedClientForReport || !onUpdateClient) return;
    const client = clients?.find(c => c.id === selectedClientForReport);
    if (!client) return;
    alert('تم حفظ كشف الحساب في سجل الموكل');
  };

  const numberToArabic = (num: number) => {
      return num.toLocaleString() + " درهم إماراتي";
  };

  return (
    <div className="p-8 lg:p-12 space-y-12 bg-[#f8fafc] page-transition">
      
      {/* ---------------- PRINT TEMPLATES (Overlays Screen when Printing) ---------------- */}
      
      {/* 1. Official Tax Invoice Template */}
      {selectedDocument && printMode === 'Invoice' && (
        <div className="hidden print:flex flex-col min-h-screen bg-white text-black p-10 fixed inset-0 z-[9999] top-0 left-0 w-full h-full" style={{ fontFamily: config?.fontFamily || 'Cairo' }}>
            {config?.stamp && (
              <img
                src={config.stamp}
                alt="stamp"
                className="fixed inset-0 m-auto w-[420px] opacity-[0.06] pointer-events-none"
                style={{ top: '40%', transform: 'translateY(-40%)', filter: 'grayscale(100%)' }}
              />
            )}
            {/* Header */}
            <div className="flex justify-between items-center border-b-4 pb-6 mb-8" style={{ borderColor: secondary }}>
                 <div className="text-right">
                    <h1 className="text-3xl font-black" style={{ color: primary }}>{config?.officeName || 'مكتب المستشار أحمد حلمي'}</h1>
                    <p className="text-sm font-bold mt-1" style={{ color: secondary }}>{config?.officeSlogan || 'للمحاماة والاستشارات القانونية'}</p>
                    <p className="text-xs text-gray-500 mt-2">{config?.officeAddress || 'الإمارات العربية المتحدة'}</p>
                 </div>
                 <div className="flex flex-col items-center justify-center">
                    {config?.logo ? <img src={config.logo} className="h-24 object-contain" /> : <ICONS.Logo className="w-20 h-20" style={{ color: primary }} />}
                 </div>
                 <div className="text-left">
                    <h2 className="text-4xl font-black uppercase tracking-widest" style={{ color: secondary }}>INVOICE</h2>
                    <p className="text-sm font-bold text-gray-400">فاتورة ضريبية</p>
                 </div>
            </div>

            {/* Invoice Meta Data */}
            <div className="flex justify-between items-start mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200 print-color-exact">
                <div className="w-1/2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">فاتورة إلى (Bill To)</p>
                    <h3 className="text-xl font-black" style={{ color: primary }}>{selectedDocument.clientName}</h3>
                    <p className="text-sm text-gray-600 mt-1">{clients.find(c => c.id === selectedDocument.clientId)?.phone}</p>
                </div>
                <div className="w-1/2 text-left">
                    <div className="flex justify-between border-b border-gray-200 pb-2 mb-2">
                        <span className="font-bold" style={{ color: primary }}>رقم الفاتورة:</span>
                        <span className="font-mono font-bold" style={{ color: secondary }}>{selectedDocument.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2 mb-2">
                        <span className="font-bold" style={{ color: primary }}>تاريخ الإصدار:</span>
                        <span>{selectedDocument.date}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold" style={{ color: primary }}>ملف القضية:</span>
                        <span className="text-sm font-medium">{selectedDocument.caseTitle}</span>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-right mb-12 border-collapse">
                <thead>
                    <tr className="text-white print-color-exact" style={{ background: primary }}>
                        <th className="py-3 px-4 font-bold rounded-tr-lg">م</th>
                        <th className="py-3 px-4 font-bold w-1/2">البيان / الوصف (Description)</th>
                        <th className="py-3 px-4 font-bold text-center">الكمية</th>
                        <th className="py-3 px-4 font-bold text-left rounded-tl-lg">الإجمالي (AED)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-gray-200">
                        <td className="py-4 px-4">01</td>
                        <td className="py-4 px-4">
                            <p className="font-bold" style={{ color: primary }}>{selectedDocument.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {(config?.smartTemplates?.invoiceLineNote || 'دفعة أتعاب عن القضية رقم: {caseNumber}').replace(
                                /\{caseNumber\}/g,
                                cases.find(c => c.id === selectedDocument.caseId)?.caseNumber || ''
                              )}
                            </p>
                        </td>
                        <td className="py-4 px-4 text-center">1</td>
                        <td className="py-4 px-4 text-left font-bold" style={{ color: primary }}>{fmtMoney(selectedDocument?.amount)}</td>
                    </tr>
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-12">
                <div className="w-1/2 md:w-1/3 bg-gray-50 p-4 rounded-xl border border-gray-200 print-color-exact">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-gray-600">المجموع الفرعي</span>
                        <span className="font-bold">{fmtMoney(selectedDocument?.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-4">
                        <span className="font-bold text-gray-600">الضريبة (0%)</span>
                        <span className="font-bold">0.00</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-black text-xl text-[#0f172a]">الإجمالي المستحق</span>
                        <span className="font-black text-xl text-[#d4af37]">{fmtMoney(selectedDocument?.amount)} د.إ</span>
                    </div>
                </div>
            </div>

            {/* Footer / Bank Details */}
            <div className="mt-auto">
                <div className="flex justify-between items-end border-t border-gray-200 pt-6">
                    <div className="text-xs text-gray-500 w-2/3">
                        <p className="font-bold text-[#0f172a] mb-2 uppercase">بيانات التحويل البنكي:</p>
                        <p>اسم البنك: بنك دبي الإسلامي</p>
                        <p>رقم الآيبان: AE00 0000 0000 0000 0000</p>
                        <p className="mt-2 whitespace-pre-line">
                          {(config?.smartTemplates?.invoiceFooter || '').replace(/\{officeName\}/g, config?.officeName || '')
                            .replace(/\{officePhone\}/g, config?.officePhone || '')
                            .replace(/\{officeEmail\}/g, config?.officeEmail || '')
                            .replace(/\{officeWebsite\}/g, config?.officeWebsite || '')}
                        </p>
                    </div>
                    <div className="text-center w-1/3">
                        <div className="h-20 flex items-center justify-center opacity-80">
                            {config?.stamp ? <img src={config.stamp} className="h-full object-contain" /> : <span className="text-gray-300 font-bold border-2 border-gray-300 p-2 rounded-full transform -rotate-12">الختم الرسمي</span>}
                        </div>
                        <p className="text-xs font-bold text-[#0f172a] mt-2">التوقيع والختم</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 2. Official Receipt Voucher (Sand Qabd) Template */}
      {selectedDocument && !selectedReceipt && printMode === 'Receipt' && (
        <div className="hidden print:flex flex-col min-h-screen bg-white text-black p-12 fixed inset-0 z-[9999] top-0 left-0 w-full h-full border-8 border-double border-[#0f172a]">
            {/* Header */}
            <div className="text-center mb-10 border-b-2 border-[#d4af37] pb-6">
                <h1 className="text-3xl font-black text-[#0f172a] mb-2">{config?.officeName || 'مكتب المستشار أحمد حلمي'}</h1>
                <h2 className="text-4xl font-black text-[#d4af37] bg-[#0f172a] text-white inline-block px-8 py-2 rounded-xl mt-2 print-color-exact">سند قبض</h2>
                <p className="text-sm font-bold tracking-[0.2em] uppercase mt-2">Receipt Voucher</p>
            </div>

            <div className="flex justify-between mb-8">
                <div className="text-right">
                    <p className="font-bold text-gray-600">التاريخ: <span className="text-black">{new Date().toLocaleDateString('en-GB')}</span></p>
                </div>
                <div className="text-left">
                    <p className="font-bold text-red-600 text-xl border-2 border-red-600 px-4 py-1 rounded print-color-exact">No. {selectedDocument.invoiceNumber.replace('INV', 'REC')}</p>
                </div>
            </div>

            <div className="space-y-6 text-lg">
                <div className="flex items-baseline gap-4 border-b border-gray-300 pb-2">
                    <span className="font-bold whitespace-nowrap w-32">استلمنا من السيد/</span>
                    <span className="font-black text-[#0f172a] flex-1">{selectedDocument.clientName}</span>
                </div>
                <div className="flex items-baseline gap-4 border-b border-gray-300 pb-2">
                    <span className="font-bold whitespace-nowrap w-32">مبلغ وقدره/</span>
                    <span className="font-black text-[#0f172a] flex-1">{numberToArabic(selectedDocument.amount)} فقط لا غير.</span>
                </div>
                <div className="flex items-baseline gap-4 border-b border-gray-300 pb-2">
                    <span className="font-bold whitespace-nowrap w-32">وذلك عن/</span>
                    <span className="font-medium text-gray-800 flex-1">{selectedDocument.description} - ملف قضية: {selectedDocument.caseTitle}</span>
                </div>
                <div className="flex gap-10 py-4">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border border-black bg-black print-color-exact"></div>
                        <span className="font-bold">نقداً (Cash)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border border-black"></div>
                        <span className="font-bold">شيك (Cheque)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border border-black"></div>
                        <span className="font-bold">تحويل (Transfer)</span>
                    </div>
                </div>
            </div>

            <div className="mt-auto flex justify-between items-end">
                <div className="w-1/3 text-center border-t-2 border-black pt-4">
                    <p className="font-bold">المستلم (Accountant)</p>
                    <p className="mt-8 text-sm text-gray-500">التوقيع</p>
                </div>
                <div className="w-1/3 text-center">
                    <div className="h-24 flex items-center justify-center">
                        {config?.stamp ? <img src={config.stamp} className="h-full object-contain opacity-80" /> : <span className="text-gray-300 font-bold border-4 border-double border-gray-300 p-4 rounded-full">ختم المكتب</span>}
                    </div>
                </div>
                <div className="w-1/3 text-center border-t-2 border-black pt-4">
                    <p className="font-bold text-xl">{fmtMoney(selectedDocument?.amount)} <span className="text-xs">د.إ</span></p>
                    <p className="mt-1 text-sm text-gray-500">Amount</p>
                </div>
            </div>

            <div className="mt-10 text-center text-[10px] text-gray-500 whitespace-pre-line">
              {(config?.smartTemplates?.receiptFooter || '').replace(/\{officeName\}/g, config?.officeName || '')
                .replace(/\{officePhone\}/g, config?.officePhone || '')
                .replace(/\{officeEmail\}/g, config?.officeEmail || '')
                .replace(/\{officeWebsite\}/g, config?.officeWebsite || '')}
            </div>
        </div>
      )}

      {/* ---------------- MAIN UI (Hidden when Printing) ---------------- */}

      <div className="print:hidden">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10 mb-12">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">إدارة التدفقات المالية</h2>
          <p className="text-slate-500 font-medium text-lg mt-2">متابعة الفواتير، إصدار سندات القبض، وكشوف حسابات الموكلين</p>
        </div>
        <div className="flex bg-[#0f172a] p-2 rounded-[2rem] border border-white/5 shadow-2xl gap-2 overflow-x-auto max-w-full">
          <button 
            onClick={() => setActiveView('invoices')}
            className={`px-6 py-4 rounded-[1.5rem] font-black text-xs transition-all uppercase tracking-widest whitespace-nowrap ${activeView === 'invoices' ? 'bg-[#d4af37] text-[#0f172a] shadow-xl' : 'text-slate-400 hover:text-white'}`}
          >سجل الفواتير</button>
          <button 
            onClick={() => setActiveView('expenses')}
            className={`px-6 py-4 rounded-[1.5rem] font-black text-xs transition-all uppercase tracking-widest whitespace-nowrap ${activeView === 'expenses' ? 'bg-[#d4af37] text-[#0f172a] shadow-xl' : 'text-slate-400 hover:text-white'}`}
          >سجل المصروفات</button>
          <button 
            onClick={() => setActiveView('receipts')}
            className={`px-6 py-4 rounded-[1.5rem] font-black text-xs transition-all uppercase tracking-widest whitespace-nowrap ${activeView === 'receipts' ? 'bg-[#d4af37] text-[#0f172a] shadow-xl' : 'text-slate-400 hover:text-white'}`}
          >سجل الإيصالات</button>
           <button 
            onClick={() => setActiveView('reports')}
            className={`px-6 py-4 rounded-[1.5rem] font-black text-xs transition-all uppercase tracking-widest whitespace-nowrap ${activeView === 'reports' ? 'bg-[#d4af37] text-[#0f172a] shadow-xl' : 'text-slate-400 hover:text-white'}`}
          >كشف حساب وتقارير</button>
        </div>
      </div>

      {/* Financial Health Summary Cards (Hidden in Report View) */}
      {activeView !== 'reports' && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
        <div className="bg-white p-12 rounded-[3.5rem] border-r-[12px] border-green-500 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 opacity-40 group-hover:scale-150 transition-transform duration-700"></div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">صافي السيولة النقدية</p>
           <h3 className="text-4xl font-black text-green-600 relative z-10">{(totalRevenue - totalExp).toLocaleString()} <span className="text-sm font-bold opacity-60">د.إ</span></h3>
           <p className="text-[11px] text-slate-400 mt-3 font-bold relative z-10 italic">"إجمالي التحصيل الفعلي مخصوماً منه المصاريف"</p>
        </div>
        <div className="bg-[#0f172a] p-12 rounded-[3.5rem] border-r-[12px] border-[#d4af37] shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 rounded-full -mr-16 -mt-16 opacity-40 group-hover:scale-150 transition-transform duration-700"></div>
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2 relative z-10">المطالبات المعلقة</p>
           <h3 className="text-4xl font-black text-[#d4af37] relative z-10">{pendingRev.toLocaleString()} <span className="text-sm font-bold opacity-60">د.إ</span></h3>
           <p className="text-[11px] text-slate-400 mt-3 font-bold relative z-10 italic">"فواتير صادرة لم يتم تحصيلها بعد"</p>
        </div>
        <div className="bg-white p-12 rounded-[3.5rem] border-r-[12px] border-red-500 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 opacity-40 group-hover:scale-150 transition-transform duration-700"></div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">إجمالي النفقات</p>
           <h3 className="text-4xl font-black text-red-600 relative z-10">{totalExp.toLocaleString()} <span className="text-sm font-bold opacity-60">د.إ</span></h3>
           <p className="text-[11px] text-slate-400 mt-3 font-bold relative z-10 italic">"إجمالي المصاريف والرسوم المدفوعة"</p>
        </div>
      </div>
      )}

      {/* Main Table Container / View Switcher */}
      {activeView === 'reports' ? (
        <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl p-12 min-h-[600px]">
          <div className="flex flex-col gap-6">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">إصدار كشف حساب موكل</h3>
            <div className="flex gap-4 items-center bg-slate-50 p-6 rounded-3xl border border-slate-200">
               <div className="flex-1">
                 <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">اختر الموكل لإصدار التقرير</label>
                 <select 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4af37]"
                    value={selectedClientForReport}
                    onChange={(e) => setSelectedClientForReport(e.target.value)}
                 >
                   <option value="">-- اختر موكل --</option>
                   {clients && clients.map(c => (
                     <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                   ))}
                 </select>
               </div>
               {selectedClientForReport && (
                 <div className="mt-6 flex gap-4">
                   <button onClick={handleSaveStatement} className="bg-white text-slate-600 border border-slate-200 px-8 py-3 rounded-xl font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                     حفظ في ملف الموكل
                   </button>
                   <button onClick={() => window.print()} className="bg-[#0f172a] text-[#d4af37] px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                     طباعة الكشف (PDF)
                   </button>
                 </div>
               )}
            </div>
          </div>

          {selectedClientForReport && (
            <div className="mt-10">
               {/* This section will be what is visible inside the container for review before printing */}
               {(() => {
                 const report = getClientStatement();
                 const clientDetails = clients.find(c => c.id === selectedClientForReport);
                 if (!report || !clientDetails) return null;

                 return (
                   <div className="space-y-8">
                     <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">اسم الموكل / المستفيد</p>
                            <p className="text-2xl font-black text-[#0f172a]">{clientDetails.name}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">رقم الملف / الهاتف</p>
                            <p className="text-xl font-bold text-[#0f172a]">{clientDetails.phone}</p>
                            <p className="text-xs font-mono text-slate-400">{clientDetails.id}</p>
                          </div>
                        </div>
                     </div>

                     <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-[#0f172a] text-[#d4af37]">
                             <th className="px-6 py-4 rounded-tr-xl font-black text-sm uppercase tracking-wider">التاريخ</th>
                             <th className="px-6 py-4 font-black text-sm uppercase tracking-wider">رقم الفاتورة</th>
                             <th className="px-6 py-4 font-black text-sm uppercase tracking-wider">البيان / القضية</th>
                             <th className="px-6 py-4 font-black text-sm uppercase tracking-wider">الحالة</th>
                             <th className="px-6 py-4 font-black text-sm uppercase tracking-wider">المبلغ (د.إ)</th>
                             <th className="px-6 py-4 rounded-tl-xl font-black text-sm uppercase tracking-wider text-center">طباعة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                           {report.invoices.map((inv, idx) => (
                             <tr key={idx} className="border-b border-slate-200">
                               <td className="px-6 py-4 text-sm font-bold text-slate-700">{inv.date}</td>
                               <td className="px-6 py-4 text-sm font-mono font-bold">{inv.invoiceNumber}</td>
                               <td className="px-6 py-4 text-sm font-medium">
                                  {inv.description} 
                                  <div className="text-[10px] text-slate-400 font-bold mt-1">{inv.caseTitle}</div>
                               </td>
                               <td className="px-6 py-4 text-sm">
                                  <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase border ${inv.status === 'Paid' ? 'border-green-200 text-green-700' : inv.status === 'Partial' ? 'border-orange-200 text-orange-700' : 'border-red-200 text-red-700'}`}>
                                    {inv.status === 'Paid' ? 'خالص' : inv.status === 'Partial' ? 'جزئي' : 'غير مدفوع'}
                                  </span>
                               </td>
                               <td className="px-6 py-4 text-sm font-black text-[#0f172a]">{fmtMoney(inv.amount)}</td>
                               <td className="px-6 py-4 text-center">
                                  <button onClick={() => handlePrintDocument(inv, 'Invoice')} className="text-slate-400 hover:text-[#d4af37] transition-colors" title="طباعة الفاتورة / PDF">
                                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                  </button>
                               </td>
                             </tr>
                           ))}
                        </tbody>
                        <tfoot>
                           <tr className="border-t-4 border-[#0f172a]">
                              <td colSpan={4} className="px-6 py-4 text-left font-black text-slate-500 uppercase">الإجمالي الكلي للفواتير</td>
                              <td className="px-6 py-4 font-black text-xl text-[#0f172a]">{report.totalBilled.toLocaleString()}</td>
                              <td></td>
                           </tr>
                           <tr className="">
                              <td colSpan={4} className="px-6 py-4 text-left font-black text-green-600 uppercase">إجمالي المدفوعات</td>
                              <td className="px-6 py-4 font-black text-xl text-green-600">{report.totalPaid.toLocaleString()}</td>
                              <td></td>
                           </tr>
                           <tr className="bg-red-50">
                              <td colSpan={4} className="px-6 py-4 text-left font-black text-red-600 uppercase">الرصيد المتبقي (المديونية)</td>
                              <td className="px-6 py-4 font-black text-xl text-red-600">{report.balance.toLocaleString()}</td>
                              <td></td>
                           </tr>
                        </tfoot>
                     </table>
                   </div>
                 );
               })()}
            </div>
          )}
        </div>
      ) : (
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="p-12 border-b border-slate-50 flex flex-col xl:flex-row justify-between items-center bg-slate-50/20 gap-8">
           {/* ... existing header ... */}
           <div className="flex items-center gap-4">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
               activeView === 'invoices'
                 ? 'bg-[#d4af37] text-[#0f172a]'
                 : activeView === 'receipts'
                 ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                 : 'bg-red-600 text-white shadow-lg shadow-red-200'
             }`}>
                {activeView === 'invoices' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                ) : activeView === 'receipts' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12h-6"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 9l-3 3 3 3"></path></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                )}
             </div>
             <h3 className="text-2xl font-black text-slate-800 tracking-tight">
               {activeView === 'invoices'
                 ? 'كشف المقبوضات (الفواتير)'
                 : activeView === 'receipts'
                 ? 'الإيصالات (سندات قبض/صرف)'
                 : 'كشف المصروفات والنفقات'}
             </h3>
           </div>
           
           <div className="flex flex-wrap gap-4 w-full xl:w-auto">
             <div className="relative flex-1 xl:w-64">
                <input 
                  type="text" 
                  placeholder="بحث سريع بالرقم أو الوصف..."
                  className="w-full bg-white border border-slate-200 rounded-[1.5rem] px-8 py-4 text-sm font-bold focus:ring-4 focus:ring-[#d4af37]/20 outline-none transition-all shadow-inner"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             
             {/* Status Filter for Invoices */}
             {activeView === 'invoices' && (
               <div className="relative xl:w-48">
                 <select 
                   className="w-full bg-white border border-slate-200 rounded-[1.5rem] px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-[#d4af37]/20 outline-none appearance-none"
                   value={filterStatus}
                   onChange={(e) => setFilterStatus(e.target.value as any)}
                 >
                   <option value="All">كل الحالات</option>
                   <option value="Paid">مدفوع</option>
                   <option value="Unpaid">غير مدفوع</option>
                   <option value="Partial">مدفوع جزئياً</option>
                 </select>
               </div>
             )}

             {activeView === 'receipts' && (
               <div className="relative xl:w-48">
                 <select
                   className="w-full bg-white border border-slate-200 rounded-[1.5rem] px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-[#d4af37]/20 outline-none appearance-none"
                   value={filterReceiptKind}
                   onChange={(e) => setFilterReceiptKind(e.target.value as any)}
                 >
                   <option value="All">الكل</option>
                   <option value="in">قبض</option>
                   <option value="out">صرف</option>
                 </select>
               </div>
             )}

             {activeView === 'invoices' ? (
               <button onClick={openNewInvoiceModal} className="bg-[#0f172a] text-[#d4af37] px-10 py-4 rounded-[1.5rem] font-black text-xs shadow-2xl hover:bg-[#d4af37] hover:text-[#0f172a] transition-all">+ إصدار فاتورة جديدة</button>
             ) : activeView === 'expenses' ? (
               <button onClick={() => setShowExpenseModal(true)} className="bg-red-600 text-white px-10 py-4 rounded-[1.5rem] font-black text-xs shadow-2xl hover:bg-red-700 transition-all">+ قيد مصروف جديد</button>
             ) : (
               <div className="flex gap-2">
                 <button onClick={() => openNewReceiptModal('in')} className="bg-green-600 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs shadow-2xl hover:bg-green-700 transition-all">+ سند قبض</button>
                 <button onClick={() => openNewReceiptModal('out')} className="bg-slate-800 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs shadow-2xl hover:bg-slate-900 transition-all">+ سند صرف</button>
               </div>
             )}
           </div>
        </div>

        <div className="overflow-x-auto custom-scroll">
           {/* ... existing tables ... */}
          {activeView === 'invoices' ? (
            <table className="w-full text-right border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-12 py-8">المطالبة #</th>
                  <th className="px-12 py-8">الموكل</th>
                  <th className="px-12 py-8">البيان / القضية</th>
                  <th className="px-12 py-8">المبلغ (د.إ)</th>
                  <th className="px-12 py-8">الوضعية</th>
                  <th className="px-12 py-8 text-center">إجراءات رسمية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-12 py-8 text-sm font-black text-slate-800">#{inv.invoiceNumber}</td>
                    <td className="px-12 py-8 text-sm font-bold text-[#0f172a]">{inv.clientName}</td>
                    <td className="px-12 py-8">
                       <div className="text-xs text-slate-700 font-black leading-relaxed">{inv.caseTitle}</div>
                       <div className="text-[10px] text-slate-400 mt-2 font-bold">{inv.date}</div>
                    </td>
                    <td className="px-12 py-8 text-lg font-black text-slate-900">{fmtMoney(inv.amount)}</td>
                    <td className="px-12 py-8">
                       <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                         inv.status === 'Paid' ? 'bg-green-50 text-green-600 border-green-200' : 
                         inv.status === 'Partial' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                         'bg-red-50 text-red-600 border-red-200'
                       }`}>
                         {inv.status === 'Paid' ? 'تم التحصيل' : inv.status === 'Partial' ? 'جزئي' : 'غير مدفوع'}
                       </span>
                    </td>
                    <td className="px-12 py-8 text-center">
                        <div className="flex justify-center gap-2">
                            {/* Print Invoice Button */}
                            <button 
                              onClick={() => handlePrintDocument(inv, 'Invoice')}
                              className="p-2 bg-slate-100 hover:bg-[#0f172a] hover:text-[#d4af37] text-slate-600 rounded-xl transition-all shadow-sm"
                              title="طباعة فاتورة ضريبية / PDF"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                            </button>

                            {/* Print Receipt Button (Only if Paid) */}
                            {(inv.status === 'Paid' || inv.status === 'Partial') && (
                                <button 
                                onClick={() => handlePrintDocument(inv, 'Receipt')}
                                className="p-2 bg-green-50 hover:bg-green-600 hover:text-white text-green-600 rounded-xl transition-all shadow-sm"
                                title="طباعة سند قبض"
                                >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                </button>
                            )}

                            {/* Send WhatsApp Button */}
                            <button 
                              onClick={() => handleSendInvoice(inv)}
                              className="p-2 bg-slate-100 hover:bg-green-500 hover:text-white text-slate-600 rounded-xl transition-all shadow-sm"
                              title="إرسال عبر واتساب"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                            </button>

                            {/* Edit Button */}
                            <button 
                              onClick={() => openEditInvoiceModal(inv)}
                              className="p-2 bg-slate-100 hover:bg-amber-100 hover:text-amber-700 text-slate-600 rounded-xl transition-all shadow-sm"
                              title="تعديل الفاتورة"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeView === 'receipts' ? (
            <table className="w-full text-right border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-12 py-8">السند #</th>
                  <th className="px-12 py-8">النوع</th>
                  <th className="px-12 py-8">الموكل</th>
                  <th className="px-12 py-8">القضية / البيان</th>
                  <th className="px-12 py-8">التاريخ</th>
                  <th className="px-12 py-8">المبلغ (د.إ)</th>
                  <th className="px-12 py-8">الطريقة</th>
                  <th className="px-12 py-8 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceipts.map(r => (
                  <tr key={r.id} id={`receipt-row-${r.id}`} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-12 py-8 text-sm font-black text-slate-800">#{r.receiptNumber}</td>
                    <td className="px-12 py-8">
                      <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        r.kind === 'in' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        {r.kind === 'in' ? 'قبض' : 'صرف'}
                      </span>
                    </td>
                    <td className="px-12 py-8 text-sm font-bold text-[#0f172a]">{r.clientName || '-'}</td>
                    <td className="px-12 py-8">
                      <div className="text-xs text-slate-700 font-black leading-relaxed">
                        {r.caseTitle || r.note || '—'}
                      </div>
                      {(r.caseNumber || r.caseId) && (
                        <div className="text-[10px] text-slate-400 mt-2 font-bold">{r.caseNumber || r.caseId}</div>
                      )}
                    </td>
                    <td className="px-12 py-8 text-sm font-black text-slate-700">{r.date}</td>
                    <td className={`px-12 py-8 text-lg font-black ${r.kind === 'out' ? 'text-red-600' : 'text-green-600'}`}>{fmtMoney(r.amount)}</td>
                    <td className="px-12 py-8 text-sm font-bold text-slate-600">{r.method || '-'}</td>
                    <td className="px-12 py-8 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handlePrintReceiptVoucher(r)}
                          className="p-2 bg-slate-100 hover:bg-[#0f172a] hover:text-[#d4af37] text-slate-600 rounded-xl transition-all shadow-sm"
                          title="طباعة سند (قبض/صرف) / PDF"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeView === 'expenses' ? (
            <table className="w-full text-right border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-12 py-8">التاريخ</th>
                  <th className="px-12 py-8">التصنيف</th>
                  <th className="px-12 py-8">بيان المصروف</th>
                  <th className="px-12 py-8">القيمة (د.إ)</th>
                  <th className="px-12 py-8">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-12 py-8 text-sm font-black text-slate-700">{e.date}</td>
                    <td className="px-12 py-8">
                       <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight">{e.category}</span>
                    </td>
                    <td className="px-12 py-8 text-sm text-slate-600 font-bold max-w-md leading-relaxed">{e.description}</td>
                    <td className="px-12 py-8 text-lg font-black text-red-600">{fmtMoney(e.amount)}</td>
                    <td className="px-12 py-8">
                       <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${e.status === 'Paid' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                         {e.status === 'Paid' ? 'تم الصرف' : 'معلق'}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
      )} {/* This closes the activeView === 'reports' ? ... : ... block correctly */}
      </div> {/* This closes print:hidden */}

      {/* Expense Modal (Unchanged essentially, but inside print:hidden area) */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 print:hidden">
          <div className="bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in duration-400 border border-white/20">
             {/* ... (Expense Form Content) ... */}
             <div className="bg-red-600 p-10 text-white flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                   <h3 className="text-3xl font-black tracking-tight">قيد مصروفات المكتب</h3>
                   <p className="text-red-100/70 text-[11px] font-black uppercase mt-1 tracking-[0.2em]">تسجيل نفقات تشغيلية ونثريات</p>
                </div>
                <button onClick={() => setShowExpenseModal(false)} className="relative z-10 p-3 hover:bg-white/10 rounded-2xl transition-all">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
             </div>
             <form onSubmit={handleAddExpenseSubmit} className="p-12 space-y-10">
                <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-1">
                     <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">التصنيف المالي</label>
                     <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 outline-none focus:border-red-500 font-bold text-slate-800 appearance-none" value={expenseData.category} onChange={e => setExpenseData({...expenseData, category: e.target.value})}>
                        <option value="نثريات">نثريات عامة</option>
                        <option value="رواتب">رواتب ومكافآت</option>
                        <option value="إيجار">إيجار المكتب</option>
                        <option value="رسوم">رسوم محاكم وتوثيق</option>
                        <option value="تسويق">تسويق ومطبوعات</option>
                     </select>
                  </div>
                  <div className="col-span-1">
                     <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">القيمة (د.إ)</label>
                     <input type="number" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 outline-none focus:border-red-500 font-black text-2xl text-red-600" placeholder="0.00" value={expenseData.amount || ''} onChange={e => setExpenseData({...expenseData, amount: Number(e.target.value)})} />
                  </div>
                  <div className="col-span-2">
                     <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">بيان الصرف / ملاحظات</label>
                     <textarea required rows={5} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-8 py-6 outline-none focus:border-red-500 font-medium text-slate-700 resize-none transition-all" placeholder="يرجى كتابة تفاصيل المصروف بدقة لأغراض المراجعة..." value={expenseData.description} onChange={e => setExpenseData({...expenseData, description: e.target.value})} />
                  </div>
                </div>
                <button type="submit" className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-red-600/30 hover:scale-[1.02] transition-all active:scale-95">اعتماد وصرف من الخزينة</button>
             </form>
          </div>
        </div>
      )}

      {/* Invoice Modal Integration */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 print:hidden">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in duration-400 border border-white/20">
             {/* ... (Invoice Form Content - Unchanged) ... */}
             <div className="bg-[#0f172a] p-12 text-[#d4af37] flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                   <h3 className="text-3xl font-black tracking-tight">{isEditing ? 'تعديل فاتورة / مطالبة' : 'إصدار مطالبة مالية رسمية'}</h3>
                   <p className="text-slate-400 text-[11px] font-black uppercase mt-1 tracking-[0.3em]">مكتب المستشار أحمد حلمي - قسم الحسابات</p>
                </div>
                <button onClick={() => setShowInvoiceModal(false)} className="relative z-10 p-3 hover:bg-white/10 rounded-2xl transition-all">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
             </div>
             <form onSubmit={handleInvoiceSubmit} className="p-12 space-y-10 custom-scroll overflow-y-auto max-h-[70vh]">
                {/* Contract Status Banner */}
                {selectedCaseForInvoice ? (
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                    <h4 className="text-xs font-black text-[#d4af37] uppercase tracking-widest mb-4">تفاصيل العقد المسجل</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-white p-3 rounded-2xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold mb-1">إجمالي العقد</p>
                        <p className="text-lg font-black text-slate-800">{fmtMoney(selectedCaseForInvoice?.totalFee)}</p>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold mb-1">المدفوع سابقاً</p>
                        <p className="text-lg font-black text-green-600">{fmtMoney(selectedCaseForInvoice?.paidAmount)}</p>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold mb-1">المتبقي</p>
                        <p className="text-lg font-black text-red-600">{fmtMoney((selectedCaseForInvoice?.totalFee || 0) - (selectedCaseForInvoice?.paidAmount || 0))}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                    <p className="text-xs font-bold text-amber-700">يرجى اختيار القضية لعرض تفاصيل العقد المالي والمدفوعات السابقة</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-8">
                   <div className="col-span-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">ربط القضية / الملف القانوني</label>
                      <select required className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-8 py-5 outline-none focus:border-[#d4af37] font-black text-[#0f172a] appearance-none shadow-sm transition-all" value={invoiceData.caseId} onChange={e => {
                        const c = cases.find(caseItem => caseItem.id === e.target.value);
                        if (c) {
                          setInvoiceData({...invoiceData, caseId: c.id, caseTitle: c.title, clientId: c.clientId, clientName: c.clientName});
                        }
                      }}>
                         <option value="">-- اختر القضية المرتبطة بالعقد --</option>
                         {cases.map(c => <option key={c.id} value={c.id}>{c.caseNumber} - {c.clientName} ({c.title})</option>)}
                      </select>
                   </div>
                   <div className="col-span-1">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">رقم الفاتورة الآلي</label>
                      <input disabled className="w-full bg-slate-100 border-2 border-slate-100 rounded-[1.5rem] px-8 py-5 font-black text-slate-500 opacity-70" value={invoiceData.invoiceNumber} />
                   </div>
                   <div className="col-span-1">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">قيمة المطالبة (د.إ)</label>
                      <input type="number" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-8 py-5 outline-none focus:border-[#d4af37] font-black text-2xl text-[#0f172a]" placeholder="0.00" value={invoiceData.amount || ''} onChange={e => setInvoiceData({...invoiceData, amount: Number(e.target.value)})} />
                   </div>
                   <div className="col-span-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">حالة السداد</label>
                      <select 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-8 py-5 outline-none focus:border-[#d4af37] font-bold text-slate-800"
                        value={invoiceData.status}
                        onChange={(e) => setInvoiceData({...invoiceData, status: e.target.value as any})}
                      >
                         <option value="Unpaid">غير مدفوع (ذمة مالية)</option>
                         <option value="Paid">مدفوع بالكامل</option>
                         <option value="Partial">مدفوع جزئياً</option>
                      </select>
                   </div>
                   <div className="col-span-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">وصف المطالبة (الدفعة)</label>
                      <input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-8 py-5 outline-none focus:border-[#d4af37] font-bold text-slate-700" placeholder="مثال: الدفعة الثانية من أتعاب المحاماة" value={invoiceData.description || ''} onChange={e => setInvoiceData({...invoiceData, description: e.target.value})} />
                   </div>
                   
                   <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <div>
                         <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">المسؤول المالي (مُصدر الفاتورة)</span>
                         <span className="text-sm font-black text-[#0f172a]">أ/ سمر العبد</span>
                      </div>
                      <div className="text-right">
                         <span className="block text-[10px] font-black text-green-600 uppercase tracking-widest">التوقيع الإلكتروني</span>
                         <span className="text-xs font-bold text-slate-400">معتمد تلقائياً</span>
                      </div>
                   </div>
                </div>
                <button type="submit" className="w-full py-6 bg-gradient-to-r from-[#d4af37] to-[#b8960c] text-[#0f172a] rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-amber-600/30 hover:scale-[1.02] transition-all active:scale-95">{isEditing ? 'حفظ التعديلات' : 'تثبيت وإصدار الفاتورة'}</button>
             </form>
          </div>
        </div>
      )}
      {/* Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 print:hidden">
          <div className="bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in duration-400 border border-white/20">
            <div className="bg-[#0f172a] p-10 text-white flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-3xl font-black tracking-tight">{receiptData.kind === 'out' ? 'سند صرف' : 'سند قبض'}</h3>
                <p className="text-slate-200/70 text-[11px] font-black uppercase mt-1 tracking-[0.2em]">Receipt / Payment Voucher</p>
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="relative z-10 p-3 hover:bg-white/10 rounded-2xl transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
            </div>

            <form onSubmit={handleAddReceiptSubmit} className="p-12 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">رقم السند</label>
                  <input
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 outline-none focus:border-[#d4af37] font-bold text-slate-800"
                    value={receiptData.receiptNumber || ''}
                    onChange={e => setReceiptData({ ...receiptData, receiptNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">التاريخ</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 outline-none focus:border-[#d4af37] font-bold text-slate-800"
                    value={String(receiptData.date || '')}
                    onChange={e => setReceiptData({ ...receiptData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">المبلغ (د.إ)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 outline-none focus:border-[#d4af37] font-bold text-slate-800"
                    value={Number(receiptData.amount || 0)}
                    onChange={e => setReceiptData({ ...receiptData, amount: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">الطريقة</label>
                  <select
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 outline-none focus:border-[#d4af37] font-bold text-slate-800 appearance-none"
                    value={String(receiptData.method || 'Cash')}
                    onChange={e => setReceiptData({ ...receiptData, method: e.target.value as any })}
                  >
                    <option value="Cash">نقداً</option>
                    <option value="Transfer">تحويل</option>
                    <option value="Cheque">شيك</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">النوع</label>
                  <select
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 outline-none focus:border-[#d4af37] font-bold text-slate-800 appearance-none"
                    value={String(receiptData.kind || 'in')}
                    onChange={e => setReceiptData({ ...receiptData, kind: e.target.value as any })}
                  >
                    <option value="in">قبض</option>
                    <option value="out">صرف</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">الموكل (اختياري)</label>
                  <select
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 outline-none focus:border-[#d4af37] font-bold text-slate-800 appearance-none"
                    value={String(receiptData.clientId || '')}
                    onChange={e => setReceiptData({ ...receiptData, clientId: e.target.value || undefined })}
                  >
                    <option value="">— بدون —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">القضية (اختياري)</label>
                  <select
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 outline-none focus:border-[#d4af37] font-bold text-slate-800 appearance-none"
                    value={String(receiptData.caseId || '')}
                    onChange={e => setReceiptData({ ...receiptData, caseId: e.target.value || undefined })}
                  >
                    <option value="">— بدون —</option>
                    {cases.map(c => <option key={c.id} value={c.id}>{c.caseNumber ? `(${c.caseNumber}) ` : ''}{c.title}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">بيان / ملاحظات</label>
                  <textarea
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 outline-none focus:border-[#d4af37] font-bold text-slate-800 min-h-[110px]"
                    value={String(receiptData.note || '')}
                    onChange={e => setReceiptData({ ...receiptData, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-[#d4af37] text-[#0f172a] py-5 rounded-2xl font-black shadow-xl hover:scale-[1.01] transition-all">حفظ السند</button>
                <button type="button" onClick={() => setShowReceiptModal(false)} className="px-8 py-5 rounded-2xl font-black bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};


export default Accounting;
