import React from 'react';
import { SystemConfig } from '../types';

type Props = {
  config: SystemConfig;
  onEnterSystem: () => void;
};

// Public landing wrapper that renders the office website (static HTML) under the same domain.
// This keeps a single unified entry link for: (1) المكتب على الانترنت + (2) نظام حلم.
const PublicLanding: React.FC<Props> = ({ config, onEnterSystem }) => {
  const primary = config.primaryColor || '#0f172a';
  const secondary = config.secondaryColor || '#d4af37';

  return (
    <div className="min-h-screen w-full" style={{ fontFamily: config.fontFamily || 'Cairo', background: '#0b1220' }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-50 w-full backdrop-blur supports-[backdrop-filter]:bg-black/40 bg-black/60 border-b"
        style={{ borderColor: `${secondary}33` }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center overflow-hidden shadow"
              style={{ background: secondary }}
              aria-hidden="true"
            >
              {/* Optional: if you later set config.logo, it will show here automatically */}
              {config.logo ? (
                <img src={config.logo} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <img src="/brand/crest.png" alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black truncate" style={{ color: secondary }}>
                {config.officeName || 'أحمد حلمي'}
              </div>
              <div className="text-[11px] font-bold text-slate-300 truncate">{config.officeSlogan || 'للاستشارات القانونية'}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-black border"
              style={{ borderColor: `${secondary}66`, color: secondary }}
              href="tel:+9710544144149"
            >
              اتصال
            </a>
            <a
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-black border"
              style={{ borderColor: `${secondary}66`, color: secondary }}
              href="https://wa.me/9710542190900"
              target="_blank"
              rel="noreferrer"
            >
              واتساب
            </a>
            <button
              onClick={onEnterSystem}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-black shadow"
              style={{ background: secondary, color: primary }}
            >
              دخول النظام
            </button>
          </div>
        </div>
      </div>

      {/* Office site (static) */}
      <div className="w-full" style={{ height: 'calc(100vh - 56px)' }}>
        <iframe
          title="Ahmed Helmy Legal Consultations"
          src="/office/index.html"
          className="w-full h-full border-0"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};

export default PublicLanding;
