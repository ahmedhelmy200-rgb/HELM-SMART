import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie } from 'recharts';
import { LegalCase, Client, Invoice, Expense, UserRole, SystemConfig } from '../types';
import { ICONS } from '../constants';

interface DashboardProps {
  cases: LegalCase[];
  clients: Client[];
  invoices: Invoice[];
  expenses: Expense[];
  userRole: UserRole;
  config?: SystemConfig;
  onNavigate?: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ cases, clients, invoices, expenses, userRole, config, onNavigate }) => {

  const isInvoicePaid = (inv: any) => inv?.paid === true || inv?.status === 'Paid';
  const invoiceDate = (inv: any) => String(inv?.issueDate || inv?.date || '');
  const isCaseClosed = (c: any) => c?.status === 'closed' || c?.status === 'مغلق' || c?.status === 'CLOSED';

  // --- Calculations ---
  const totalRevenue = invoices.reduce((sum, inv: any) => sum + (Number(inv.amount) || 0), 0);
  const paidRevenue = invoices.reduce((sum, inv: any) => sum + (isInvoicePaid(inv) ? (Number(inv.amount) || 0) : 0), 0);
  const pendingRevenue = totalRevenue - paidRevenue;
  const totalExpenses = expenses.reduce((sum, exp: any) => sum + (Number(exp.amount) || 0), 0);
  const netProfit = paidRevenue - totalExpenses;

  const activeCases = cases.filter((c: any) => !isCaseClosed(c)).length;
  const closedCases = cases.filter((c: any) => isCaseClosed(c)).length;

  const unpaidInvoices = invoices.filter((inv: any) => !isInvoicePaid(inv)).length;
  const today = new Date().toISOString().slice(0, 10);

  const recentInvoices = invoices.slice().sort((a: any, b: any) => invoiceDate(b).localeCompare(invoiceDate(a))).slice(0, 5);
  const recentExpenses = expenses.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);

  // --- Charts Data ---
  const summaryData = [
    { name: 'المحصّل', value: paidRevenue, color: '#0ea5e9' },
    { name: 'المصروفات', value: totalExpenses, color: '#f43f5e' },
    { name: 'المتبقي', value: pendingRevenue, color: '#f59e0b' },
  ];

  const monthlyRevenueMap: Record<string, number> = {};
  invoices.forEach(inv => {
    const d = invoiceDate(inv);
    const date = d ? new Date(d) : null;
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyRevenueMap[key] = (monthlyRevenueMap[key] || 0) + (isInvoicePaid(inv) ? (Number(inv.amount) || 0) : 0);
  });

  const monthlyExpenseMap: Record<string, number> = {};
  expenses.forEach(exp => {
    const date = exp.date ? new Date(exp.date) : null;
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyExpenseMap[key] = (monthlyExpenseMap[key] || 0) + exp.amount;
  });

  const allMonths = Array.from(new Set([
    ...Object.keys(monthlyRevenueMap),
    ...Object.keys(monthlyExpenseMap),
  ])).sort();

  const cashflowData = allMonths.map(m => ({
    month: m,
    revenue: monthlyRevenueMap[m] || 0,
    expenses: monthlyExpenseMap[m] || 0,
  }));

  const pieMap: Record<string, number> = {};
  cases.forEach((c: any) => {
    const key = (c.category as any) || c.caseType || 'غير مصنف';
    pieMap[key] = (pieMap[key] || 0) + 1;
  });

  const pieData = Object.entries(pieMap).map(([name, value], idx) => ({
    name,
    value,
    color: ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#22c55e'][idx % 6],
  }));

  const alerts = [
    ...(unpaidInvoices > 0 ? [{
      type: 'warning',
      title: 'فواتير غير مدفوعة',
      desc: `لديك ${unpaidInvoices} فاتورة غير مدفوعة تحتاج متابعة.`,
    }] : []),
    ...(activeCases > 10 ? [{
      type: 'info',
      title: 'عدد قضايا نشطة مرتفع',
      desc: `لديك ${activeCases} قضية نشطة. يُفضل تنظيم المتابعة.`,
    }] : []),
    ...(netProfit < 0 ? [{
      type: 'danger',
      title: 'صافي الربح سلبي',
      desc: 'المصروفات أعلى من الإيرادات المحصلة خلال الفترة الحالية.',
    }] : []),
  ];

  const mainKpis = [
    {
      label: 'إجمالي الإيرادات',
      value: totalRevenue,
      sub: 'إجمالي فواتير صادرة',
      icon: ICONS.money,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      tab: 'accounting',
    },
    {
      label: 'الإيرادات المحصلة',
      value: paidRevenue,
      sub: 'تم تحصيلها',
      icon: ICONS.check,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      tab: 'accounting',
    },
    {
      label: 'المصروفات',
      value: totalExpenses,
      sub: 'إجمالي مصروفات',
      icon: ICONS.receipt,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      tab: 'accounting',
    },
    {
      label: 'صافي الربح',
      value: netProfit,
      sub: 'بعد خصم المصروفات',
      icon: ICONS.trendingUp,
      color: netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600',
      bg: netProfit >= 0 ? 'bg-indigo-50' : 'bg-rose-50',
      tab: 'accounting',
    }
  ];

  const currency = (config?.currency || 'AED');
  const formatMoney = (n: number) => new Intl.NumberFormat('ar-AE', { maximumFractionDigits: 0 }).format(n) + ` ${currency}`;

  return (
    <div className="p-8 lg:p-12 bg-slate-50 min-h-screen print:bg-white print:p-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-10 print:mb-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
            لوحة التحكم
          </h1>
          <p className="text-slate-500 mt-2 font-semibold">
            ملخص سريع لأداء المكتب — القضايا، العملاء، الفواتير، والمصروفات
          </p>
        </div>
        <div className="hidden print:block text-xs text-slate-500">
          تاريخ الطباعة: {new Date().toLocaleDateString('ar-AE')}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 print:gap-3 print:mb-4">
        {mainKpis.map((k: any, idx) => (
          <button
            key={idx}
            onClick={() => k.tab && onNavigate?.(k.tab)}
            className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-7 print:p-4 text-right hover:shadow-md hover:-translate-y-0.5 transition-all"
            title={k.tab ? 'فتح القسم' : undefined}
          >
            <div className="flex items-center justify-between">
              <div className={`w-14 h-14 rounded-[1.8rem] flex items-center justify-center ${k.bg} ${k.color}`}>
                <span className="w-7 h-7">{k.icon}</span>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-xs font-bold">{k.label}</p>
                <p className="text-slate-900 text-2xl font-black mt-1">
                  {formatMoney(k.value)}
                </p>
              </div>
            </div>
            <p className="text-slate-400 text-xs font-bold mt-4">{k.sub}</p>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:gap-4">
        {/* Left Big Chart */}
        <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 h-[580px] flex flex-col print:h-[400px]">
          <div className="flex items-start justify-between mb-10">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">ملخص الأداء المالي</h2>
              <p className="text-slate-400 text-sm font-medium mt-1">توضيح للمبالغ المحصلة والمصروفة والديون المتبقية</p>
            </div>
            <div className="flex gap-6">
               {summaryData.map((d, i) => (
                 <span key={i} className="flex items-center gap-2.5 text-[11px] font-black text-slate-500">
                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                    {d.name}
                 </span>
               ))}
            </div>
          </div>

          {/* IMPORTANT FIX: ensure chart container has positive size */}
          <div className="flex-1 min-h-[360px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13, fontWeight: 900}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 800}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '25px', border: 'none', boxShadow: '0 30px 60px -12px rgb(0 0 0 / 0.2)', padding: '25px'}}
                />
                <Bar dataKey="value" radius={[25, 25, 0, 0]} barSize={120}>
                   {summaryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-8">
            <div className="text-slate-600 font-black text-sm">عدد العملاء: <span className="text-slate-900">{clients.length}</span></div>
            <div className="text-slate-600 font-black text-sm">قضايا نشطة: <span className="text-slate-900">{activeCases}</span></div>
            <div className="text-slate-600 font-black text-sm">قضايا مغلقة: <span className="text-slate-900">{closedCases}</span></div>
          </div>
        </div>

        {/* Right Column Widgets */}
        <div className="flex flex-col gap-8 h-[580px] min-h-0 print:h-auto print:gap-4">
          {/* Alerts */}
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex-1 flex flex-col">
            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-4">تنبيهات</h3>
            <div className="flex-1 overflow-auto">
              {alerts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    <p className="text-xs font-bold">لا توجد تنبيهات عاجلة</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((a, idx) => (
                    <div
                      key={idx}
                      className={`rounded-[2rem] p-5 border text-sm font-bold ${
                        a.type === 'danger'
                          ? 'bg-rose-50 border-rose-100 text-rose-700'
                          : a.type === 'warning'
                          ? 'bg-amber-50 border-amber-100 text-amber-700'
                          : 'bg-sky-50 border-sky-100 text-sky-700'
                      }`}
                    >
                      <div className="font-black mb-1">{a.title}</div>
                      <div className="text-xs font-semibold opacity-90 leading-relaxed">{a.desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mini Charts Widget */}
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex-1 flex flex-col">
            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-4">توزيع القضايا</h3>

            {/* IMPORTANT FIX: ensure chart container has positive size */}
            <div className="flex-1 min-h-[240px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '25px',
                      border: 'none',
                      boxShadow: '0 30px 60px -12px rgb(0 0 0 / 0.2)',
                      padding: '18px',
                      fontWeight: 900
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 space-y-2">
              {pieData.slice(0, 5).map((d, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-black text-slate-600">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name}
                  </span>
                  <span className="text-slate-900">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cashflow Chart */}
      <div className="mt-10 bg-white p-10 rounded-[4rem] shadow-sm border border-slate-100 print:mt-4 print:p-6">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">التدفق النقدي الشهري</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">إيرادات محصلة مقابل المصروفات عبر الشهور</p>
          </div>
        </div>

        <div className="w-full h-[320px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashflowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 900}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 800}} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{borderRadius: '25px', border: 'none', boxShadow: '0 30px 60px -12px rgb(0 0 0 / 0.2)', padding: '18px'}}
              />
              <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-[2.5rem] p-6 bg-sky-50 border border-sky-100">
            <div className="text-xs font-black text-sky-700 mb-1">إجمالي الإيرادات المحصلة</div>
            <div className="text-xl font-black text-sky-900">{formatMoney(paidRevenue)}</div>
          </div>
          <div className="rounded-[2.5rem] p-6 bg-rose-50 border border-rose-100">
            <div className="text-xs font-black text-rose-700 mb-1">إجمالي المصروفات</div>
            <div className="text-xl font-black text-rose-900">{formatMoney(totalExpenses)}</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 print:mt-4 print:gap-4">
        {/* Recent Invoices */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 tracking-tight mb-5">آخر الفواتير</h3>
          {recentInvoices.length === 0 ? (
            <div className="text-sm font-bold text-slate-400">لا توجد فواتير</div>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((inv, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-[2rem] px-5 py-4 border border-slate-100">
                  <div>
                    <div className="text-sm font-black text-slate-800">#{inv.invoiceNumber || inv.id}</div>
                    <div className="text-xs font-bold text-slate-400 mt-1">{inv.issueDate || '-'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900">{formatMoney(inv.amount || 0)}</div>
                    <div className={`text-[11px] font-black mt-1 ${inv.paid ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {inv.paid ? 'مدفوعة' : 'غير مدفوعة'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 tracking-tight mb-5">آخر المصروفات</h3>
          {recentExpenses.length === 0 ? (
            <div className="text-sm font-bold text-slate-400">لا توجد مصروفات</div>
          ) : (
            <div className="space-y-3">
              {recentExpenses.map((exp, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-[2rem] px-5 py-4 border border-slate-100">
                  <div>
                    <div className="text-sm font-black text-slate-800">{exp.description || 'مصروف'}</div>
                    <div className="text-xs font-bold text-slate-400 mt-1">{exp.date || '-'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900">{formatMoney(exp.amount || 0)}</div>
                    <div className="text-[11px] font-black mt-1 text-slate-500">{exp.category || ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
