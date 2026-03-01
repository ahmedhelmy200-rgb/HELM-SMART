
import React from 'react';

export const COLORS = {
  primary: '#0f172a', // الكحلي الملكي
  secondary: '#d4af37', // الذهبي الملكي
  accent: '#1e293b',
  background: '#f8fafc',
  white: '#ffffff',
  success: '#10b981',
  error: '#ef4444',
  goldGradient: 'linear-gradient(135deg, #d4af37 0%, #b8960c 100%)',
  navyGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  glass: 'rgba(255, 255, 255, 0.8)'
};

export const ICONS = {
  Logo: ({ className = "w-10 h-10" }: { className?: string }) => (
    <svg viewBox="0 0 200 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield Outline - Bold Gold */}
      <path d="M20 40 L180 40 L180 120 C180 190 100 230 100 230 C100 230 20 190 20 120 Z" fill="#0f172a" stroke="#d4af37" strokeWidth="8"/>
      
      {/* Sunburst Background Effect */}
      <path d="M100 120 L100 45 M100 120 L150 55 M100 120 L50 55 M100 120 L170 80 M100 120 L30 80" stroke="#d4af37" strokeWidth="2" opacity="0.4"/>

      {/* Graduation Cap - Distinct Shape */}
      <path d="M100 25 L160 50 L100 75 L40 50 Z" fill="#d4af37" stroke="#ffffff" strokeWidth="2"/>
      <path d="M160 50 V70" stroke="#d4af37" strokeWidth="3"/> 
      {/* Tassel */}
      <circle cx="100" cy="50" r="4" fill="#0f172a"/>
      <path d="M100 50 L85 70" stroke="#0f172a" strokeWidth="3"/>

      {/* Pillars / Building - High Contrast */}
      <rect x="55" y="85" width="90" height="12" fill="#d4af37" /> {/* Top Beam */}
      <rect x="62" y="97" width="12" height="45" fill="#d4af37" />
      <rect x="86" y="97" width="12" height="45" fill="#d4af37" />
      <rect x="110" y="97" width="12" height="45" fill="#d4af37" />
      <rect x="134" y="97" width="12" height="45" fill="#d4af37" />
      <rect x="50" y="142" width="100" height="10" fill="#d4af37" /> {/* Base */}

      {/* Text Banner - White for Clarity */}
      <rect x="25" y="160" width="150" height="40" fill="#ffffff" rx="4" />
      
      {/* HELMY Text - Very Bold */}
      <text x="100" y="188" fontFamily="serif" fontWeight="900" fontSize="32" fill="#0f172a" textAnchor="middle" letterSpacing="2">HELMY</text>
      
      {/* Bottom Emblem / Diamond Logo */}
      <path d="M100 205 L115 218 L100 231 L85 218 Z" fill="#38bdf8" stroke="#ffffff" strokeWidth="2"/>
      
      {/* Side Wreaths - Simplified */}
      <path d="M10 120 Q5 180 100 240 Q195 180 190 120" stroke="#d4af37" strokeWidth="0" fill="none"/>
      <circle cx="20" cy="150" r="5" fill="#d4af37"/>
      <circle cx="15" cy="130" r="5" fill="#d4af37"/>
      <circle cx="180" cy="150" r="5" fill="#d4af37"/>
      <circle cx="185" cy="130" r="5" fill="#d4af37"/>
    </svg>
  ),
  Dashboard: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Cases: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Clients: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  AI: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  Links: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  DocumentScanner: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
    </svg>
  )
};
