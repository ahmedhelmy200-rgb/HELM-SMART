
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Client, LegalCase, Invoice, CaseDocument, CaseStatus, SystemConfig } from '../types';
import TemplateToDocumentModal from './TemplateToDocumentModal';
import { putFile, getFile, blobToObjectUrl } from '../services/fileStore';
import { getCloudAuth, getCloudConfig, storageCreateSignedUrl, storageUploadObject } from '../services/cloudSync';
import { ICONS } from '../constants';

interface ClientManagementProps {
  clients: Client[];
  cases: LegalCase[];
  invoices: Invoice[];
  config?: SystemConfig;
  onAddClient: (client: Client) => void;
  onAddCase: (newCase: LegalCase) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onAddInvoice: (invoice: Invoice) => void;
  viewOnlyClientId?: string; // For Client Portal Mode
  focusClientId?: string;
  onConsumeFocus?: () => void;
}

// Local formatting helper used across client financial views
const fmtMoney = (v: any) => (Number(v) || 0).toLocaleString();

const sanitizeFileName = (name: string) => name.replace(/[^\w\d\u0600-\u06FF\-. ]+/g, '_');

const getUidFromJwt = (token: string): string | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.sub || payload?.user_id || null;
  } catch {
    return null;
  }
};

const ClientManagement: React.FC<ClientManagementProps> = ({ 
  clients, 
  cases, 
  invoices, 
  config,
  onAddClient, 
  onAddCase,
  onUpdateClient,
  onDeleteClient,
  onAddInvoice,
  viewOnlyClientId,
  focusClientId,
  onConsumeFocus,
}) => {

  const applyTokens = (tpl: string, tokens: Record<string, string>) => {
    return tpl.replace(/\{(\w+)\}/g, (_, key) => tokens[key] ?? `{${key}}`);
  };
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'cases' | 'financials' | 'documents'>('profile');
  
  // Case Add Modal State inside Client Management
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState<Partial<LegalCase>>({
    title: '',
    caseNumber: '',
    court: '',
    status: CaseStatus.ACTIVE,
    totalFee: 0,
    paidAmount: 0,
    opponentName: '',
    nextHearingDate: ''
  });

  const courts = useMemo(() => (config?.courts || []).map(c => c.name), [config]);

  // Form State
  const [clientForm, setClientForm] = useState<Partial<Client>>({
    name: '',
    type: 'Individual',
    phone: '',
    email: '',
    emiratesId: '',
    address: '',
    notes: '',
    platformAccount: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const docInputRef = useRef<HTMLInputElement>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  const openCaseModal = () => {
    const fallback = courts[0] || 'محاكم دبي';
    setNewCaseForm({
      title: '',
      caseNumber: '',
      court: fallback,
      status: CaseStatus.ACTIVE,
      totalFee: 0,
      paidAmount: 0,
      opponentName: '',
      nextHearingDate: ''
    });
    setShowCaseModal(true);
  };

  // Effect to handle restricted view (Client Portal)
  useEffect(() => {
    if (viewOnlyClientId) {
      const client = clients.find(c => c.id === viewOnlyClientId);
      if (client) {
        setSelectedClient(client);
        setActiveTab('cases'); // Default tab for client view
      }
    }
  }, [viewOnlyClientId, clients]);

  // Focus from Global Search
  useEffect(() => {
    if (!focusClientId) return;
    if (viewOnlyClientId) return;
    const c = clients.find((x) => x.id === focusClientId);
    if (c) {
      setSelectedClient(c);
      setActiveTab('profile');
    }
    // consume even if not found (avoid sticky focus)
    onConsumeFocus?.();
  }, [focusClientId, viewOnlyClientId, clients, onConsumeFocus]);

  const handleOpenAdd = () => {
      setClientForm({
        name: '',
        type: 'Individual',
        phone: '',
        email: '',
        emiratesId: '',
        address: '',
        notes: '',
        platformAccount: '',
        tags: []
      });
      setTagInput('');
      setIsEditing(false);
      setShowModal(true);
  };

  const handleOpenEdit = (client: Client) => {
      setClientForm({ ...client });
      setTagInput(client.tags ? client.tags.join(', ') : '');
      setIsEditing(true);
      setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagInput.split(',').map(t => t.trim()).filter(t => t);
    
    // Check duplicates only on create
    if (!isEditing) {
        const isDuplicate = clients.some(c => c.emiratesId === clientForm.emiratesId || c.phone === clientForm.phone);
        if (isDuplicate) {
            alert('هذا الموكل مسجل بالفعل (تشابه في رقم الهوية أو الهاتف).');
            return;
        }
    }

    if (isEditing && clientForm.id) {
        // Update Existing
        const updatedClient = { ...clientForm, tags } as Client;
        onUpdateClient(updatedClient);
        if (selectedClient?.id === updatedClient.id) setSelectedClient(updatedClient);
    } else {
        // Add New
        const newClient: Client = {
            ...clientForm as Client,
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toLocaleDateString('en-GB'),
            totalCases: 0,
            tags,
            documents: []
        };
        onAddClient(newClient);
    }
    setShowModal(false);
  };

  const handleDelete = () => {
      if (selectedClient && !viewOnlyClientId) {
          if (confirm('هل أنت متأكد من حذف هذا الموكل؟ سيؤدي ذلك لحذف جميع البيانات المرتبطة.')) {
            onDeleteClient(selectedClient.id);
            setSelectedClient(null);
          }
      }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedClient) return;
      try {
          const docId = `doc_${Math.random().toString(36).slice(2, 10)}`;
          const fileKey = `client_${selectedClient.id}_${docId}`;
          await putFile(fileKey, file);

          let storage: CaseDocument['storage'] = { provider: 'indexeddb', size: file.size };
          const cd = (config as any)?.cloudDocuments;
          const enableStorageSync = !!cd?.enableStorageSync;
          const bucket = (cd?.bucket as string) || 'helm_docs';
          const cfg = getCloudConfig();
          const auth = getCloudAuth();
          const uid = auth?.accessToken ? getUidFromJwt(auth.accessToken) : null;

          if (enableStorageSync && cfg && auth?.accessToken && uid) {
            const path = `${uid}/clients/${selectedClient.id}/${docId}_${sanitizeFileName(file.name)}`;
            await storageUploadObject(bucket, path, file, file.type || 'application/octet-stream', cfg);
            storage = { provider: 'supabase', bucket, path, size: file.size };
          }

          const newDoc: CaseDocument = {
              id: docId,
              name: file.name,
              type: file.type.includes('image') ? 'Image' : 'Document',
              mimeType: file.type || 'application/octet-stream',
              uploadDate: new Date().toLocaleDateString('en-GB'),
              status: 'Draft',
              fileKey,
              storage,
          };

          const updatedClient = {
              ...selectedClient,
              documents: [...(selectedClient.documents || []), newDoc]
          };
          onUpdateClient(updatedClient);
          setSelectedClient(updatedClient);
      } catch (err: any) {
          alert(`تعذر رفع المستند: ${err?.message || err}`);
      } finally {
          try { e.target.value = ''; } catch {}
      }
  };

  const openClientDocument = async (doc: CaseDocument) => {
      try {
        setOpeningDocId(doc.id);
        if (doc.storage?.provider === 'supabase' && doc.storage.bucket && doc.storage.path) {
          const url = await storageCreateSignedUrl(doc.storage.bucket, doc.storage.path, 180);
          window.open(url, '_blank');
          return;
        }
        if (doc.fileKey) {
          const blob = await getFile(doc.fileKey);
          if (!blob) return alert('الملف غير موجود محلياً.');
          const url = blobToObjectUrl(blob);
          window.open(url, '_blank');
          setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 60_000);
          return;
        }
        if (doc.content) {
          const blob = new Blob([doc.content], { type: doc.mimeType || 'text/plain' });
          const url = blobToObjectUrl(blob);
          window.open(url, '_blank');
          setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 60_000);
          return;
        }
        alert('لا يوجد مصدر لفتح هذا المستند.');
      } catch (err: any) {
        alert(`تعذر فتح المستند: ${err?.message || err}`);
      } finally {
        setOpeningDocId(null);
      }
  };

  const handleAddCaseForClient = (e: React.FormEvent) => {
      e.preventDefault();
      if(selectedClient && newCaseForm.caseNumber) {
          // Check duplication for case number
          if (cases.some(c => c.caseNumber === newCaseForm.caseNumber)) {
              alert('رقم القضية مسجل مسبقاً.');
              return;
          }

          const newCase: LegalCase = {
              ...newCaseForm as LegalCase,
              id: Math.random().toString(36).substr(2, 9),
              clientId: selectedClient.id,
              clientName: selectedClient.name,
              documents: [],
              createdAt: new Date().toLocaleDateString('en-GB'),
              reminderPreferences: { sevenDays: true, oneDay: true }
          };
          onAddCase(newCase);
          setShowCaseModal(false);
          setNewCaseForm({
            title: '', caseNumber: '', court: (config?.courts?.[0]?.name || 'محاكم دبي'), status: CaseStatus.ACTIVE,
            totalFee: 0, paidAmount: 0, opponentName: '', nextHearingDate: ''
          });
      }
  };

  const sendWhatsAppReminder = (type: 'payment' | 'session' | 'general') => {
      if (!selectedClient?.phone) return alert('رقم الهاتف غير مسجل');

      const applyTokens = (tpl: string, tokens: Record<string, string>) => {
        return tpl.replace(/\{(\w+)\}/g, (_, k) => (tokens[k] ?? `{${k}}`));
      };
      
      let message = '';
      const clientName = selectedClient.name;
      
      switch(type) {
          case 'payment':
              const due = invoices.filter(i => i.clientId === selectedClient.id && i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);
              message = applyTokens(
                config?.smartTemplates?.whatsappPaymentReminder || '',
                {
                  officeName: config?.officeName || 'مكتب المستشار أحمد حلمي',
                  clientName,
                  due: fmtMoney(due),
                }
              ) || `مرحباً ${clientName}،\nنود تذكيركم بوجود مستحقات مالية بقيمة ${fmtMoney(due)} درهم.\nمع التحية، ${config?.officeName || 'مكتب المستشار أحمد حلمي'}`;
              break;
          case 'session':
              // Try to pull next upcoming case for this client
              const nextCase = cases
                .filter(c => c.clientId === selectedClient.id && !!c.nextHearingDate)
                .sort((a, b) => (a.nextHearingDate || '').localeCompare(b.nextHearingDate || ''))[0];
              message = applyTokens(
                config?.smartTemplates?.whatsappSessionReminder || '',
                {
                  officeName: config?.officeName || 'مكتب المستشار أحمد حلمي',
                  clientName,
                  caseNumber: nextCase?.caseNumber || '',
                  caseTitle: nextCase?.title || '',
                  court: (nextCase as any)?.court || '',
                  date: nextCase?.nextHearingDate || '',
                }
              ) || `مرحباً ${clientName}،\nنود تذكيركم بموعد الجلسة القادمة.\nمع التحية، ${config?.officeName || 'مكتب المستشار أحمد حلمي'}`;
              break;
          case 'general':
              message = applyTokens(
                config?.smartTemplates?.whatsappGeneral || '',
                {
                  officeName: config?.officeName || 'مكتب المستشار أحمد حلمي',
                  clientName,
                }
              ) || `مرحباً ${clientName}،\nهل لديكم أي استفسارات قانونية اليوم؟\n${config?.officeName || 'مكتب المستشار أحمد حلمي'}`;
              break;
      }
      
      const url = `https://wa.me/${selectedClient.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  const createQuickInvoice = () => {
     if(!selectedClient) return;
     const newInv: Invoice = {
         id: Math.random().toString(36).substr(2, 9),
         invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`,
         caseId: '', // General Invoice
         caseTitle: 'خدمات عامة / عقد اتفاق',
         clientId: selectedClient.id,
         clientName: selectedClient.name,
         amount: 0,
         date: new Date().toISOString().split('T')[0],
         status: 'Unpaid',
         description: 'دفعة عقد اتفاق أتعاب محاماة'
     };
     onAddInvoice(newInv);
     alert('تم إنشاء مسودة فاتورة جديدة في النظام المالي. يرجى الانتقال لقسم المالية لتحديد القيمة.');
  };

  // Filter clients
  const filteredClients = clients.filter((c: any) => {
    if (viewOnlyClientId && c.id !== viewOnlyClientId) return false;
    const q = (searchTerm || '').toLowerCase();
    const name = String(c?.name || '').toLowerCase();
    const phone = String(c?.phone || '');
    const eid = String(c?.emiratesId || '');
    return name.includes(q) || phone.includes(searchTerm) || eid.includes(searchTerm);
  });

  const getClientStats = (clientId: string) => {
    const clientCases = cases.filter(c => c.clientId === clientId);
    const activeCases = clientCases.filter(c => c.status === 'نشط' || c.status === 'مرافعة').length;
    const clientInvoices = invoices.filter(i => i.clientId === clientId);
    const totalDue = clientInvoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);
    return { activeCases, totalDue };
  };

  return (
    <div className="p-8 lg:p-12 animate-in fade-in duration-500">
      
      {/* Header List View */}
      {!selectedClient && (
        <>
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
            <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">إدارة الموكلين</h2>
                <p className="text-slate-500 font-bold mt-2">سجل بيانات الموكلين ومتابعة ملفاتهم</p>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                    <input 
                    type="text" 
                    placeholder="بحث بالاسم، الهوية، أو الهاتف..."
                    className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-3 text-sm font-bold focus:ring-2 focus:ring-[#d4af37] outline-none shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                onClick={handleOpenAdd}
                className="bg-[#0f172a] text-[#d4af37] px-6 py-3 rounded-2xl font-black text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    <span>موكل جديد</span>
                </button>
            </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map(client => {
                const stats = getClientStats(client.id);
                return (
                <div 
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
                >
                    <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xl overflow-hidden">
                            {client.profileImage ? (
                            <img src={client.profileImage} alt={client.name} className="w-full h-full object-cover" />
                            ) : (
                            client.name.charAt(0)
                            )}
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-lg group-hover:text-[#d4af37] transition-colors line-clamp-1">{client.name}</h3>
                            <p className="text-xs text-slate-400 font-bold">{client.type === 'Corporate' ? 'شركات' : 'أفراد'}</p>
                        </div>
                    </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-[10px] text-slate-400 font-bold mb-1">القضايا النشطة</p>
                        <p className="text-lg font-black text-[#0f172a]">{stats.activeCases}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-[10px] text-slate-400 font-bold mb-1">المستحقات</p>
                        <p className={`text-lg font-black ${stats.totalDue > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {fmtMoney(stats.totalDue)}
                        </p>
                    </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                    {client.phone}
                    </div>
                </div>
                );
            })}
            </div>
        </>
      )}

      {/* Selected Client Detail View */}
      {selectedClient && (
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in duration-300 min-h-[85vh] flex flex-col">
           {/* Detail Header */}
           <div className="bg-[#1e293b] p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37] opacity-10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
              
              <div className="flex items-center gap-6 relative z-10">
                 <button 
                   onClick={() => !viewOnlyClientId && setSelectedClient(null)} 
                   className={`p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all ${viewOnlyClientId ? 'hidden' : ''}`}
                 >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                 </button>
                 <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-[#0f172a] font-black text-3xl overflow-hidden border-4 border-[#d4af37]">
                    {selectedClient.profileImage ? (
                      <img src={selectedClient.profileImage} alt={selectedClient.name} className="w-full h-full object-cover" />
                    ) : (
                      selectedClient.name.charAt(0)
                    )}
                 </div>
                 <div>
                    <h2 className="text-3xl font-black">{selectedClient.name}</h2>
                    <div className="flex gap-4 mt-2 text-sm font-medium text-slate-300">
                       <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg> {selectedClient.phone}</span>
                       <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg> {selectedClient.emiratesId}</span>
                    </div>
                 </div>
              </div>

              <div className="flex gap-3 mt-6 md:mt-0 relative z-10">
                 {!viewOnlyClientId && (
                   <>
                       <button onClick={handleDelete} className="bg-red-500/10 text-red-200 px-4 py-3 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all">
                           حذف
                       </button>
                       <button onClick={() => handleOpenEdit(selectedClient)} className="bg-[#d4af37] text-[#0f172a] px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg">
                           تعديل البيانات
                       </button>
                   </>
                 )}
              </div>
           </div>

           {/* Custom Tab Navigation */}
           <div className="flex items-center gap-1 bg-slate-50 p-2 border-b border-slate-200 overflow-x-auto">
               {[
                   { id: 'profile', label: 'ملف الموكل' },
                   { id: 'cases', label: 'القضايا (الملفات)' },
                   { id: 'financials', label: 'المالية والفواتير' },
                   { id: 'documents', label: 'العقود والمستندات' },
               ].map(tab => (
                   <button
                       key={tab.id}
                       onClick={() => setActiveTab(tab.id as any)}
                       className={`px-8 py-4 rounded-2xl text-sm font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-[#0f172a] shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                       {tab.label}
                   </button>
               ))}
           </div>

           <div className="p-8 lg:p-12 overflow-y-auto flex-1 custom-scroll bg-white">
              
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                            <h4 className="font-black text-slate-800 mb-6 text-xl">التواصل الذكي (واتساب)</h4>
                            <div className="grid grid-cols-1 gap-4">
                                <button onClick={() => sendWhatsAppReminder('payment')} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 hover:border-green-500 hover:shadow-lg transition-all group">
                                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-200">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-800">تذكير بالمستحقات</p>
                                        <p className="text-xs text-slate-400">إرسال كشف حساب مختصر</p>
                                    </div>
                                </button>
                                <button onClick={() => sendWhatsAppReminder('session')} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all group">
                                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-800">تذكير بموعد جلسة</p>
                                        <p className="text-xs text-slate-400">تنبيه آلي للجلسات القادمة</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                            <h4 className="font-black text-slate-800 mb-4">الوسوم والتصنيف</h4>
                            <div className="flex flex-wrap gap-2">
                            {selectedClient.tags && selectedClient.tags.length > 0 ? (
                                selectedClient.tags.map((tag, i) => (
                                <span key={i} className="bg-white px-3 py-1 rounded-lg text-xs font-bold text-slate-600 border border-slate-200">
                                    #{tag}
                                </span>
                                ))
                            ) : (
                                <span className="text-xs text-slate-400 italic">لا توجد وسوم</span>
                            )}
                            </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                            <h4 className="font-black text-slate-800 mb-4 text-lg">البيانات الأساسية</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between border-b border-slate-50 pb-3">
                                    <span className="text-slate-400 font-bold text-sm">البريد الإلكتروني</span>
                                    <span className="font-mono font-bold text-slate-800">{selectedClient.email || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-3">
                                    <span className="text-slate-400 font-bold text-sm">العنوان</span>
                                    <span className="font-bold text-slate-800">{selectedClient.address || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-3">
                                    <span className="text-slate-400 font-bold text-sm">حساب المنصة</span>
                                    <span className="font-mono font-bold text-slate-800">{selectedClient.platformAccount || '-'}</span>
                                </div>
                                <div className="pt-2">
                                    <p className="text-slate-400 font-bold text-sm mb-2">ملاحظات إدارية</p>
                                    <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 leading-relaxed">
                                        {selectedClient.notes || 'لا توجد ملاحظات مسجلة.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                     </div>
                  </div>
              )}

              {/* Cases Tab */}
              {activeTab === 'cases' && (
                 <div>
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="text-xl font-black text-slate-800">ملفات القضايا المسجلة</h3>
                       {!viewOnlyClientId && (
                         <button className="bg-[#1e293b] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg" onClick={openCaseModal}>
                            + فتح ملف قضية
                         </button>
                       )}
                    </div>
                    {cases.filter(c => c.clientId === selectedClient.id).length > 0 ? (
                       <div className="grid gap-4">
                          {cases.filter(c => c.clientId === selectedClient.id).map(c => (
                             <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex justify-between items-center hover:shadow-lg transition-all group">
                                <div>
                                   <div className="flex items-center gap-3">
                                      <span className={`w-3 h-3 rounded-full ${c.status === 'نشط' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                                      <h4 className="font-black text-slate-800 text-lg group-hover:text-[#d4af37] transition-colors">{c.title}</h4>
                                   </div>
                                   <p className="text-sm text-slate-500 mt-1 font-mono">{c.caseNumber} - {c.court}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-left hidden sm:block">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">جلسة قادمة</p>
                                        <p className="font-bold text-slate-800">{c.nextHearingDate || '-'}</p>
                                    </div>
                                    <span className="bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold text-slate-600">{c.status}</span>
                                </div>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <div className="p-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                          <ICONS.Cases />
                          <p className="text-slate-400 text-sm font-bold mt-4">لا توجد قضايا مسجلة لهذا الموكل</p>
                       </div>
                    )}
                 </div>
              )}

              {/* Financials Tab */}
              {activeTab === 'financials' && (
                 <div>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">السجل المالي</h3>
                            <p className="text-sm text-slate-400 mt-1">فواتير الأتعاب والدفعات</p>
                        </div>
                        {!viewOnlyClientId && (
                            <button onClick={createQuickInvoice} className="bg-[#d4af37] text-[#0f172a] px-6 py-3 rounded-xl text-sm font-black shadow-lg hover:scale-105 transition-transform">
                                + إصدار فاتورة جديدة
                            </button>
                        )}
                    </div>
                    {invoices.filter(i => i.clientId === selectedClient.id).length > 0 ? (
                       <div className="overflow-x-auto">
                          <table className="w-full text-right text-sm">
                             <thead className="text-xs text-slate-400 font-bold uppercase bg-slate-50">
                                <tr>
                                   <th className="px-6 py-4 rounded-r-xl">رقم الفاتورة</th>
                                   <th className="px-6 py-4">البيان</th>
                                   <th className="px-6 py-4">المبلغ</th>
                                   <th className="px-6 py-4">التاريخ</th>
                                   <th className="px-6 py-4 rounded-l-xl">الحالة</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                {invoices.filter(i => i.clientId === selectedClient.id).map(inv => (
                                   <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-6 py-4 font-mono font-bold text-slate-700">#{inv.invoiceNumber}</td>
                                      <td className="px-6 py-4 font-medium text-slate-600">{inv.description}</td>
                                      <td className="px-6 py-4 font-black text-[#0f172a]">{fmtMoney(inv.amount)} د.إ</td>
                                      <td className="px-6 py-4 text-slate-500">{inv.date}</td>
                                      <td className="px-6 py-4">
                                         <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {inv.status === 'Paid' ? 'خالص' : 'غير مدفوع'}
                                         </span>
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    ) : (
                       <div className="p-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                          <p className="text-slate-400 text-sm font-bold">لا توجد فواتير مسجلة</p>
                       </div>
                    )}
                 </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                 <div>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">مستندات الموكل</h3>
                            <p className="text-sm text-slate-400 mt-1">رفع مستندات (PDF/صور/Word) أو إنشاء مستند من نموذج جاهز.</p>
                        </div>
                        {!viewOnlyClientId && (
                          <div className="flex gap-2 flex-wrap justify-end">
                            <button
                              onClick={() => setShowTemplateModal(true)}
                              className="bg-white border border-slate-200 text-slate-800 px-5 py-3 rounded-xl text-sm font-black shadow-sm hover:bg-slate-50"
                              title="إنشاء مستند من نموذج"
                            >
                              + من نموذج
                            </button>
                            <button onClick={() => docInputRef.current?.click()} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-black shadow-lg flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                                رفع مستند
                            </button>
                          </div>
                        )}
                        <input ref={docInputRef} type="file" className="hidden" onChange={handleDocumentUpload} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {selectedClient.documents && selectedClient.documents.length > 0 ? (
                            selectedClient.documents.map((doc, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => openClientDocument(doc)}
                                  className="text-right bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
                                  title="فتح المستند"
                                >
                                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    </div>
                                    <h4 className="font-bold text-slate-800 truncate text-sm" title={doc.name}>{doc.name}</h4>
                                    <p className="text-[10px] text-slate-400 mt-1 font-bold">{doc.uploadDate}</p>
                                    <span className="absolute top-4 left-4 bg-slate-100 text-[10px] px-2 py-0.5 rounded text-slate-500">{doc.type}</span>
                                    <span className={`absolute bottom-4 left-4 text-[10px] px-2 py-0.5 rounded font-black ${doc.storage?.provider === 'supabase' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                      {doc.storage?.provider === 'supabase' ? 'سحابي' : 'محلي'}
                                    </span>
                                    {openingDocId === doc.id && (
                                      <span className="absolute inset-0 bg-white/70 flex items-center justify-center font-black text-slate-600">جاري الفتح...</span>
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="col-span-full p-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                <p className="text-slate-400 text-sm font-bold">لا توجد مستندات مرفقة</p>
                            </div>
                        )}
                    </div>
                 </div>
              )}
           </div>
        </div>
      )}


      {selectedClient && (
        <TemplateToDocumentModal
          open={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          templates={(config?.officeTemplates || []) as any}
          context={{
            officeName: config?.officeName || '',
            officePhone: config?.officePhone || '',
            officeEmail: config?.officeEmail || '',
            officeAddress: config?.officeAddress || '',
            officeWebsite: config?.officeWebsite || '',
            clientName: selectedClient.name,
            clientPhone: selectedClient.phone,
            clientEmail: selectedClient.email,
            emiratesId: selectedClient.emiratesId,
          }}
          onSave={(doc) => {
            const updatedClient = { ...selectedClient, documents: [...(selectedClient.documents || []), doc] };
            onUpdateClient(updatedClient);
            setSelectedClient(updatedClient);
          }}
        />
      )}

      {/* Add/Edit Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="bg-[#0f172a] p-8 text-white flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-black">{isEditing ? 'تعديل بيانات الموكل' : 'إضافة موكل جديد'}</h3>
                 </div>
                 <button onClick={() => setShowModal(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                 </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto custom-scroll">
                <div className="col-span-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">نوع الموكل</label>
                   <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button type="button" onClick={() => setClientForm({...clientForm, type: 'Individual'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${clientForm.type === 'Individual' ? 'bg-white shadow text-[#0f172a]' : 'text-slate-500'}`}>أفراد</button>
                      <button type="button" onClick={() => setClientForm({...clientForm, type: 'Corporate'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${clientForm.type === 'Corporate' ? 'bg-white shadow text-[#0f172a]' : 'text-slate-500'}`}>شركات</button>
                   </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">الاسم الكامل</label>
                  <input required placeholder="الاسم كما هو في الهوية" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4af37] font-bold text-slate-800" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">رقم الهاتف</label>
                  <input required type="tel" placeholder="9715xxxxxxxx" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4af37] font-mono font-bold text-slate-800" value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">رقم الهوية / الجواز</label>
                  <input placeholder="784-xxxx-xxxxxxx-x" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4af37] font-mono font-bold text-slate-800" value={clientForm.emiratesId} onChange={e => setClientForm({...clientForm, emiratesId: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">البريد الإلكتروني</label>
                  <input type="email" placeholder="example@mail.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4af37] font-bold text-slate-800" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">حساب الموكل في المنصات (اختياري)</label>
                  <input placeholder="اسم المستخدم / رقم الحساب في الأنظمة القضائية" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4af37] font-mono font-bold text-slate-800" value={clientForm.platformAccount} onChange={e => setClientForm({...clientForm, platformAccount: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ملاحظات</label>
                  <textarea rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4af37] font-medium text-slate-800" placeholder="أي ملاحظات إضافية عن الموكل..." value={clientForm.notes || ''} onChange={e => setClientForm({...clientForm, notes: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">الوسوم (مفصولة بفاصلة)</label>
                  <input placeholder="مثال: vip, قضية عمالية, دبي" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4af37] font-bold text-slate-800" value={tagInput} onChange={e => setTagInput(e.target.value)} />
                </div>
                <div className="col-span-2 pt-4">
                   <button type="submit" className="w-full bg-[#d4af37] text-[#0f172a] py-4 rounded-xl font-black shadow-lg hover:scale-[1.02] transition-transform">{isEditing ? 'حفظ التغييرات' : 'إضافة الموكل'}</button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* Add Case For Client Modal */}
      {showCaseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="bg-[#1e293b] p-6 text-white flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-black">فتح ملف قضية جديد</h3>
                    <p className="text-xs text-slate-400 mt-1">الموكل: {selectedClient?.name}</p>
                 </div>
                 <button onClick={() => setShowCaseModal(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                 </button>
              </div>
              <form onSubmit={handleAddCaseForClient} className="p-8 space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">رقم الملف / القضية</label>
                      <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4af37]" value={newCaseForm.caseNumber} onChange={e => setNewCaseForm({...newCaseForm, caseNumber: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">عنوان القضية</label>
                      <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4af37]" value={newCaseForm.title} onChange={e => setNewCaseForm({...newCaseForm, title: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">اسم الوسيط</label>
                      <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4af37]" value={newCaseForm.opponentName} onChange={e => setNewCaseForm({...newCaseForm, opponentName: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">المحكمة</label>
                          <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4af37]" value={newCaseForm.court || ''} onChange={e => setNewCaseForm({...newCaseForm, court: e.target.value})}>
                             {(config?.courts || []).map((c) => (
                               <option key={c.id} value={c.name}>{c.name}</option>
                             ))}
                             {newCaseForm.court && !(config?.courts || []).some((c) => c.name === newCaseForm.court) && (
                               <option value={newCaseForm.court}>{newCaseForm.court} (غير موجودة بالقائمة)</option>
                             )}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ الجلسة</label>
                          <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4af37]" value={newCaseForm.nextHearingDate} onChange={e => setNewCaseForm({...newCaseForm, nextHearingDate: e.target.value})} />
                      </div>
                  </div>
                  <button type="submit" className="w-full bg-[#0f172a] text-[#d4af37] py-4 rounded-xl font-black shadow-lg hover:scale-[1.02] transition-transform mt-4">حفظ وفتح الملف</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
