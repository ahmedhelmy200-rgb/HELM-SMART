
import React from 'react';

const ImportantLinks: React.FC = () => {
  const links = [
    {
      id: 1,
      title: 'النيابة العامة الاتحادية',
      description: 'بوابة الخدمات الإلكترونية للنيابة العامة الاتحادية',
      url: 'https://www.pp.gov.ae',
      color: 'bg-slate-800',
      icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z'
    },
    {
      id: 2,
      title: 'نيابة دبي',
      description: 'الموقع الرسمي للنيابة العامة - حكومة دبي',
      url: 'https://www.dxbpp.gov.ae',
      color: 'bg-blue-800',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
    },
    {
      id: 3,
      title: 'النيابة العامة - الشارقة',
      description: 'خدمات النيابة العامة عبر وزارة العدل',
      url: 'https://www.moj.gov.ae',
      color: 'bg-indigo-900',
      icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3'
    },
    {
      id: 4,
      title: 'دائرة القضاء - أبوظبي',
      description: 'بوابة الخدمات العدلية والقضائية لإمارة أبوظبي',
      url: 'https://www.adjd.gov.ae',
      color: 'bg-[#d4af37]',
      textColor: 'text-slate-900',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      id: 5,
      title: 'محاكم دبي',
      description: 'نظام الطلبات الذكية ومتابعة القضايا في دبي',
      url: 'https://www.dc.gov.ae',
      color: 'bg-blue-600',
      icon: 'M12 4v1m6 11h2m-6 0h-2v4h8v-4zM5 8v11h14V8M5 8l7-5 7 5M5 8H3m4 0h1m5.5 0h1'
    },
    {
      id: 6,
      title: 'وزارة العدل',
      description: 'البوابة الاتحادية للتشريعات والخدمات القضائية',
      url: 'https://www.moj.gov.ae',
      color: 'bg-emerald-700',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      id: 7,
      title: 'الموقع الرئيسي للمكتب',
      description: 'موقع المستشار أحمد حلمي للاستشارات القانونية',
      url: 'https://ahmed-helmy-legal.vercel.app/',
      color: 'bg-slate-900',
      icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9'
    }
  ];

  return (
    <div className="p-12 space-y-10 page-transition">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">الروابط الحكومية والقضائية</h2>
          <p className="text-slate-500 font-medium text-lg mt-2">دليل الوصول السريع للمواقع الإلكترونية المعتمدة في دولة الإمارات</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {links.map((link) => (
          <a 
            key={link.id} 
            href={link.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-[2.5rem] bg-white shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
          >
            <div className={`h-32 ${link.color} relative flex items-center justify-center`}>
              {/* Pattern Overlay */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
              
              <div className={`w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                <svg className={`w-8 h-8 ${link.textColor || 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={link.icon}></path>
                </svg>
              </div>
            </div>
            
            <div className="p-8">
              <h3 className="text-xl font-black text-slate-800 mb-2 group-hover:text-[#d4af37] transition-colors">{link.title}</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">{link.description}</p>
              
              <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#d4af37]">
                <span>زيارة الموقع</span>
                <svg className="w-4 h-4 transform group-hover:translate-x-[-4px] transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default ImportantLinks;
