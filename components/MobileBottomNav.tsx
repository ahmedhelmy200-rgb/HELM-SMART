import React from 'react';
import { SystemConfig } from '../types';

type Item = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

type Props = {
  activeTab: string;
  setActiveTab: (t: string) => void;
  onOpenSearch: () => void;
  onOpenMore: () => void;
  config?: SystemConfig;
};

const MobileBottomNav: React.FC<Props> = ({ activeTab, setActiveTab, onOpenSearch, onOpenMore, config }) => {
  const primary = config?.primaryColor || '#0f172a';
  const secondary = config?.secondaryColor || '#d4af37';

  const items: Item[] = [
    {
      id: 'dashboard',
      label: 'الرئيسية',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 21V9h6v12" />
        </svg>
      ),
    },
    {
      id: 'cases',
      label: 'القضايا',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-6-8h6" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M7 4h10a2 2 0 012 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 012-2z" />
        </svg>
      ),
    },
    {
      id: 'clients',
      label: 'الموكلين',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 11a4 4 0 100-8 4 4 0 000 8z" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      id: 'search',
      label: 'بحث',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" strokeWidth="2" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
      ),
    },
    {
      id: 'more',
      label: 'المزيد',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden print:hidden">
      <div className="mx-auto max-w-[980px]">
        <div className="m-2 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-2xl overflow-hidden">
          <div className="grid grid-cols-5">
            {items.map((it) => {
              const isActive = it.id !== 'search' && it.id !== 'more' ? activeTab === it.id : false;
              return (
                <button
                  key={it.id}
                  onClick={() => {
                    if (it.id === 'search') return onOpenSearch();
                    if (it.id === 'more') return onOpenMore();
                    setActiveTab(it.id);
                  }}
                  className="py-2.5 flex flex-col items-center justify-center gap-1 text-[10px] font-black"
                  style={{ color: isActive ? primary : '#475569' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: isActive ? `${secondary}33` : 'transparent' }}
                  >
                    {it.icon}
                  </div>
                  <div className="leading-none">{it.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileBottomNav;
