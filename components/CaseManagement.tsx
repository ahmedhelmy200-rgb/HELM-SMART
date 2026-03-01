
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LegalCase, CaseStatus, CaseDocument, Client, SystemConfig } from '../types';
import TemplateToDocumentModal from './TemplateToDocumentModal';
import { putFile, getFile, blobToObjectUrl } from '../services/fileStore';
import { getCloudAuth, getCloudConfig, storageCreateSignedUrl, storageUploadObject } from '../services/cloudSync';
import { ICONS } from '../constants';

interface CaseManagementProps {
  cases: LegalCase[];
  clients: Client[];
  config?: SystemConfig;
  onAddCase: (newCase: LegalCase) => void;
  onUpdateCase: (updatedCase: LegalCase) => void;
  onDeleteCase?: (caseId: string) => void; // Added Delete Handler
  onAddClient: (newClient: Client) => void;
  focusCaseId?: string;
  onConsumeFocus?: () => void;
}

// Local formatting helper (kept simple to avoid runtime crashes when fee fields are missing/invalid)
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

const CaseManagement: React.FC<CaseManagementProps> = ({ cases, clients, config, onAddCase, onUpdateCase, onDeleteCase, onAddClient, focusCaseId, onConsumeFocus }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);

  // Focus from Global Search
  useEffect(() => {
    if (!focusCaseId) return;
    const c = cases.find((x) => x.id === focusCaseId);
    if (c) {
      setSelectedCase(c);
      // Best-effort: keep filters permissive so the case exists in the table
      setFilterCourt('all');
      setFilterStatus('all');
      setSearchTerm('');
      setShowAdvancedFilters(false);
      setTimeout(() => {
        try {
          document.getElementById(`case-row-${focusCaseId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch {}
      }, 50);
    }
    onConsumeFocus?.();
  }, [focusCaseId, cases, onConsumeFocus]);

  
  // Filters
  const [filterCourt, setFilterCourt] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Validation State
  const [duplicateError, setDuplicateError] = useState('');
  
  // Reminder Edit State
  const [reminderEditDocId, setReminderEditDocId] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  // Form State
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [caseForm, setCaseForm] = useState<Partial<LegalCase>>({
    status: CaseStatus.ACTIVE,
    court: '',
    clientId: '',
    documents: [],
    totalFee: 0,
    paidAmount: 0,
    opponentName: '',
    nextHearingDate: '',
    reminderPreferences: { sevenDays: true, oneDay: true }
  });

  const courts = useMemo(() => (config?.courts || []).map(c => c.name), [config]);

  // Ensure court has a safe default when opening add/edit.
  useEffect(() => {
    if (!caseForm.court) {
      const fallback = courts[0] || 'محاكم دبي';
      setCaseForm(prev => ({ ...prev, court: fallback }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courts.length]);

  const [newClientFields, setNewClientFields] = useState({
    name: '',
    phone: '',
    email: '',
    emiratesId: '',
    address: '',
    type: 'Individual' as 'Individual' | 'Corporate'
  });

  // Check for duplicate Case Number
  const checkDuplicateCaseNumber = (num: string) => {
      // If editing, exclude current case ID from check
      const exists = cases.some(c => c.caseNumber === num && c.id !== caseForm.id);
      if (exists) {
          setDuplicateError('رقم القضية هذا مسجل مسبقاً في النظام!');
      } else {
          setDuplicateError('');
      }
  };

  // Check for duplicate Client (when adding new)
  const checkDuplicateClient = () => {
      if (!showNewClientForm) return false;
      const exists = clients.some(c => c.emiratesId === newClientFields.emiratesId || c.phone === newClientFields.phone);
      if (exists) {
          alert('بيانات الموكل (الهوية أو الهاتف) مسجلة مسبقاً لموكل آخر.');
          return true;
      }
      return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (duplicateError) return;

    // Handle Client Linking
    let finalClientId = caseForm.clientId;
    let finalClientName = clients.find(cl => cl.id === finalClientId)?.name || '';

    // If "New Client" is toggled, create client first
    if (showNewClientForm) {
      if(!newClientFields.name || !newClientFields.phone) {
          alert('يرجى إدخال اسم ورقم هاتف الموكل الجديد');
          return;
      }
      if (checkDuplicateClient()) return;

      const now = new Date();
      const newClientId = Math.random().toString(36).substr(2, 9);
      const newClient: Client = {
        ...newClientFields,
        id: newClientId,
        totalCases: 1, // First case
        createdAt: now.toLocaleDateString('en-GB'),
        documents: []
      };
      
      onAddClient(newClient); // Update Global State
      finalClientId = newClientId;
      finalClientName = newClient.name;
    } else {
        if (!finalClientId) {
            alert('يجب اختيار موكل من القائمة أو إضافة موكل جديد.');
            return;
        }
    }

    if (isEditing && caseForm.id) {
        // UPDATE Existing Case
        const updatedCase: LegalCase = {
            ...caseForm as LegalCase,
            clientId: finalClientId || caseForm.clientId!,
            clientName: finalClientName || caseForm.clientName!,
        };
        onUpdateCase(updatedCase);
        if (selectedCase?.id === updatedCase.id) setSelectedCase(updatedCase);
    } else {
        // ADD New Case
        const newCase: LegalCase = {
            ...caseForm as LegalCase,
            id: Math.random().toString(36).substr(2, 9),
            clientId: finalClientId || '',
            clientName: finalClientName,
            createdAt: new Date().toLocaleDateString('en-GB'),
            documents: []
        };
        onAddCase(newCase);
    }
    
    resetForm();
  };

  const handleEditClick = (c: LegalCase) => {
      setCaseForm({ ...c });
      setIsEditing(true);
      setShowNewClientForm(false);
      setShowAddModal(true);
  };

  const handleDeleteClick = (caseId: string) => {
      if (confirm('هل أنت متأكد من حذف هذا الملف؟ لا يمكن التراجع عن هذا الإجراء.')) {
          if (onDeleteCase) onDeleteCase(caseId);
          if (selectedCase?.id === caseId) setSelectedCase(null);
      }
  };

  const updateDocReminder = (docId: string, date: string) => {
    if (!selectedCase) return;
    const updatedDocuments = selectedCase.documents.map(doc => 
      doc.id === docId ? { ...doc, reviewReminder: date } : doc
    );
    const updatedCase = { ...selectedCase, documents: updatedDocuments };
    setSelectedCase(updatedCase);
    onUpdateCase(updatedCase);
    setReminderEditDocId(null); 
  };

  const handleCaseDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCase) return;

    try {
      const docId = `doc_${Math.random().toString(36).slice(2, 10)}`;
      const fileKey = `case_${selectedCase.id}_${docId}`;
      await putFile(fileKey, file);

      let storage: CaseDocument['storage'] = { provider: 'indexeddb', size: file.size };
      const cd = (config as any)?.cloudDocuments;
      const enableStorageSync = !!cd?.enableStorageSync;
      const bucket = (cd?.bucket as string) || 'helm_docs';
      const cfg = getCloudConfig();
      const auth = getCloudAuth();
      const uid = auth?.accessToken ? getUidFromJwt(auth.accessToken) : null;

      if (enableStorageSync && cfg && auth?.accessToken && uid) {
        const path = `${uid}/cases/${selectedCase.id}/${docId}_${sanitizeFileName(file.name)}`;
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

      const updatedCase = { ...selectedCase, documents: [...(selectedCase.documents || []), newDoc] };
      setSelectedCase(updatedCase);
      onUpdateCase(updatedCase);
    } catch (err: any) {
      alert(`تعذر رفع المستند: ${err?.message || err}`);
    } finally {
      try { e.target.value = ''; } catch {}
    }
  };

  const openCaseDocument = async (doc: CaseDocument) => {
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


  const resetForm = () => {
    setShowAddModal(false);
    setShowNewClientForm(false);
    setIsEditing(false);
    setCaseForm({ 
      status: CaseStatus.ACTIVE, 
      court: (config?.courts?.[0]?.name || 'محاكم دبي'), 
      clientId: '', 
      documents: [], 
      totalFee: 0, 
      paidAmount: 0, 
      opponentName: '', 
      nextHearingDate: '',
      reminderPreferences: { sevenDays: true, oneDay: true }
    });
    setNewClientFields({ name: '', phone: '', email: '', emiratesId: '', address: '', type: 'Individual' });
    setDuplicateError('');
  };

  const filteredCases = cases.filter(c => {
    const matchesCourt = filterCourt === 'all' || c.court === filterCourt;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      c.caseNumber.toLowerCase().includes(searchLower) ||
      c.title.toLowerCase().includes(searchLower) ||
      c.clientName.toLowerCase().includes(searchLower);
    
    return matchesCourt && matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case CaseStatus.ACTIVE: return 'bg-blue-100 text-blue-700';
      case CaseStatus.CLOSED: return 'bg-slate-100 text-slate-700';
      case CaseStatus.JUDGMENT: return 'bg-green-100 text-green-700';
      case CaseStatus.APPEAL: return 'bg-purple-100 text-purple-700';
      case CaseStatus.PENDING: return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 print:hidden">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">إدارة القضايا</h2>
          <p className="text-slate-500">سجل القضايا والمتابعة القانونية</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all flex items-center gap-2"
        >
          <span>+ إضافة قضية جديدة</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6 print:hidden">
        <div className="p-6 border-b border-slate-100 bg-white space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="بحث برقم القضية، الموكل، أو الخصم..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-4 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-5 py-3 rounded-xl border flex items-center gap-2 text-sm font-bold transition-all ${showAdvancedFilters ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <span>تصفية</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
          </div>

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
              <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" value={filterCourt} onChange={(e) => setFilterCourt(e.target.value)}>
                  <option value="all">كل المحاكم</option>
                  {(config?.courts || []).map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
              </select>
              <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">كل الحالات</option>
                  {Object.values(CaseStatus).map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          )}
        </div>
        
        {/* Cases Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">رقم القضية</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">الموضوع</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">الموكل</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase text-center">الأتعاب</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase text-center">الحالة</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">الجلسة القادمة</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.map((c) => (
                <tr id={`case-row-${c.id}`} key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 text-sm font-mono font-bold text-slate-700">{c.caseNumber}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-800">{c.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{c.court}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{c.clientName}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-black text-slate-700">{fmtMoney(c.paidAmount)} / {fmtMoney(c.totalFee)}</span>
                    <div className="w-20 h-1 bg-slate-200 rounded-full mx-auto mt-1 overflow-hidden">
                       <div className="h-full bg-green-500" style={{ width: `${c.totalFee > 0 ? (c.paidAmount / c.totalFee) * 100 : 0}%` }}></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${getStatusColor(c.status)}`}>{c.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold">
                     <span className={`${new Date(c.nextHearingDate) <= new Date() ? 'text-red-600' : 'text-slate-700'}`}>{c.nextHearingDate || '-'}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setSelectedCase(c)} className="bg-[#1a1a2e] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800" title="التفاصيل">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                      </button>
                      <button onClick={() => handleEditClick(c)} className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-200" title="تعديل">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      </button>
                      <button onClick={() => handleDeleteClick(c.id)} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200" title="حذف">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-end print:bg-white print:static print:block">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 overflow-y-auto">
             {/* Printable Header */}
             <div className="hidden print:block p-8 border-b-4 border-[#d4af37]">
                 <h1 className="text-3xl font-black text-center text-[#0f172a]">ملف القضية</h1>
             </div>
             
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:bg-white">
                <div>
                   <h3 className="text-xl font-bold text-slate-800">{selectedCase.title}</h3>
                   <p className="text-sm text-slate-500 mt-1">رقم الملف: {selectedCase.caseNumber}</p>
                </div>
                <div className="flex gap-2 print:hidden">
                   <button onClick={() => window.print()} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full" title="طباعة">
                      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                   </button>
                   <button onClick={() => setSelectedCase(null)} className="p-2 hover:bg-slate-200 rounded-full">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                   </button>
                </div>
             </div>

             <div className="p-8 space-y-8">
                {/* Data Sections */}
                <section className="print:border print:p-4 print:rounded-xl">
                   <h4 className="text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-4">بيانات الملف</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs text-slate-500 font-bold">الموكل</p><p className="font-black">{selectedCase.clientName}</p></div>
                      <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs text-slate-500 font-bold">الخصم</p><p className="font-black">{selectedCase.opponentName}</p></div>
                      <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs text-slate-500 font-bold">المحكمة</p><p className="font-black">{selectedCase.court}</p></div>
                      <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs text-slate-500 font-bold">الحالة</p><p className="font-black">{selectedCase.status}</p></div>
                   </div>
                </section>

                <section>
                   <div className="flex items-center justify-between mb-4">
                     <h4 className="text-xs font-bold text-[#d4af37] uppercase tracking-wider">المستندات</h4>
                     <div className="flex gap-2 print:hidden">
                       <button onClick={() => setShowTemplateModal(true)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-50">+ من نموذج</button>
                       <button onClick={() => docInputRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-black hover:bg-slate-800">رفع مستند</button>
                       <input ref={docInputRef} type="file" className="hidden" onChange={handleCaseDocumentUpload} />
                     </div>
                   </div>
                   <div className="space-y-2">
                      {selectedCase.documents.map(doc => (
                         <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                            <button onClick={() => openCaseDocument(doc)} className="flex items-center gap-3 text-right flex-1 hover:bg-slate-50 rounded-lg p-1 -m-1 transition" title="فتح المستند">
                               <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                               <div className="flex-1">
                                 <p className="text-sm font-bold">{doc.name}</p>
                                 <p className="text-[10px] text-slate-400">{doc.uploadDate} • {doc.storage?.provider === 'supabase' ? 'سحابي' : 'محلي'}</p>
                               </div>
                               {openingDocId === doc.id && <span className="text-[10px] font-black text-slate-500">جاري الفتح...</span>}
                            </button>
                            {/* Reminder Logic */}
                            <div className="print:hidden shrink-0">
                               {reminderEditDocId === doc.id ? (
                                 <input type="date" className="text-xs border rounded p-1" value={doc.reviewReminder || ''} onChange={(e) => updateDocReminder(doc.id, e.target.value)} onBlur={() => setReminderEditDocId(null)} autoFocus />
                               ) : (
                                 <button onClick={() => setReminderEditDocId(doc.id)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400" title="تذكير"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg></button>
                               )}
                            </div>
                         </div>
                      ))}
                      {selectedCase.documents.length === 0 && (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold text-sm">لا توجد مستندات مرفقة</div>
                      )}
                   </div>
                </section>
             </div>
          </div>
        </div>
      )}


      {selectedCase && (
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
            clientName: selectedCase.clientName,
            caseNumber: selectedCase.caseNumber,
            caseTitle: selectedCase.title,
            opponentName: selectedCase.opponentName,
            court: (selectedCase as any).court || '',
            nextHearingDate: selectedCase.nextHearingDate || '',
          }}
          onSave={(doc) => {
            const updated = { ...selectedCase, documents: [...(selectedCase.documents || []), doc] };
            setSelectedCase(updated);
            onUpdateCase(updated);
          }}
        />
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="bg-[#1a1a2e] p-6 text-white flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-xl font-bold">{isEditing ? 'تعديل بيانات القضية' : 'إضافة قضية جديدة'}</h3>
              <button onClick={() => setShowAddModal(false)} className="hover:rotate-90 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-6">
              
              {/* --- Client Selection (Link System) --- */}
              <div className="col-span-2">
                 <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-slate-700">الموكل (ربط بالملف)</label>
                    <button type="button" onClick={() => setShowNewClientForm(!showNewClientForm)} className="text-xs font-bold text-[#d4af37] hover:underline bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                        {showNewClientForm ? 'العودة لاختيار موكل موجود' : '+ تسجيل موكل جديد فوراً'}
                    </button>
                 </div>
                 
                 {showNewClientForm ? (
                     <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 grid grid-cols-2 gap-4 animate-in fade-in relative">
                         <div className="col-span-2 text-xs font-bold text-amber-800 mb-1">سيتم إنشاء ملف موكل جديد وربطه بهذه القضية تلقائياً</div>
                         <input placeholder="الاسم الكامل للموكل" required className="col-span-2 p-2 rounded-lg border border-amber-200 text-sm focus:border-amber-500 outline-none" value={newClientFields.name} onChange={e => setNewClientFields({...newClientFields, name: e.target.value})} />
                         <input placeholder="رقم الهاتف" required className="p-2 rounded-lg border border-amber-200 text-sm focus:border-amber-500 outline-none" value={newClientFields.phone} onChange={e => setNewClientFields({...newClientFields, phone: e.target.value})} />
                         <input placeholder="رقم الهوية / الجواز" className="p-2 rounded-lg border border-amber-200 text-sm focus:border-amber-500 outline-none" value={newClientFields.emiratesId} onChange={e => setNewClientFields({...newClientFields, emiratesId: e.target.value})} />
                     </div>
                 ) : (
                     <select 
                        required 
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#d4af37]"
                        value={caseForm.clientId}
                        onChange={e => setCaseForm({...caseForm, clientId: e.target.value})}
                        disabled={isEditing} // Prevent changing client on edit to maintain integrity
                     >
                        <option value="">-- اختر الموكل من القائمة --</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name} - {client.phone}</option>
                        ))}
                     </select>
                 )}
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">رقم القضية</label>
                <input 
                    required 
                    className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 transition-all ${duplicateError ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-slate-200 focus:ring-[#d4af37]'}`}
                    value={caseForm.caseNumber} 
                    onChange={e => {
                        setCaseForm({...caseForm, caseNumber: e.target.value});
                        checkDuplicateCaseNumber(e.target.value);
                    }} 
                />
                {duplicateError && <p className="text-[10px] text-red-600 font-bold mt-1">{duplicateError}</p>}
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">المحكمة</label>
                <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#d4af37]" value={caseForm.court || ''} onChange={e => setCaseForm({...caseForm, court: e.target.value})}>
                  {(config?.courts || []).map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  {/* Keep backward compatibility if current value is not in the list */}
                  {caseForm.court && !(config?.courts || []).some((c) => c.name === caseForm.court) && (
                    <option value={caseForm.court}>{caseForm.court} (غير موجودة بالقائمة)</option>
                  )}
                </select>
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">موضوع الدعوى / العنوان</label>
                <input required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#d4af37]" value={caseForm.title} onChange={e => setCaseForm({...caseForm, title: e.target.value})} />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">حالة الملف</label>
                <select 
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#d4af37]"
                  value={caseForm.status}
                  onChange={e => setCaseForm({...caseForm, status: e.target.value as CaseStatus})}
                >
                  {Object.values(CaseStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">إجمالي الأتعاب (د.إ)</label>
                <input type="number" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#d4af37]" value={caseForm.totalFee} onChange={e => setCaseForm({...caseForm, totalFee: Number(e.target.value)})} />
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">المسدد (د.إ)</label>
                <input type="number" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#d4af37]" value={caseForm.paidAmount} onChange={e => setCaseForm({...caseForm, paidAmount: Number(e.target.value)})} />
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">اسم الوسيط</label>
                <input required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#d4af37]" value={caseForm.opponentName} onChange={e => setCaseForm({...caseForm, opponentName: e.target.value})} />
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">تاريخ الجلسة القادمة</label>
                <input type="date" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#d4af37]" value={caseForm.nextHearingDate} onChange={e => setCaseForm({...caseForm, nextHearingDate: e.target.value})} />
              </div>

              <div className="col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={resetForm} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100">إلغاء</button>
                <button type="submit" disabled={!!duplicateError} className={`px-8 py-2.5 bg-[#d4af37] text-[#1a1a2e] rounded-xl font-bold shadow-lg hover:scale-105 transition-all ${duplicateError ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isEditing ? 'حفظ التعديلات' : 'إنشاء ملف القضية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseManagement;
