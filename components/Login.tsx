
import React, { useState } from 'react';
import { UserRole, Client, SystemConfig } from '../types';
import { ICONS } from '../constants';

interface LoginProps {
  onLogin: (role: UserRole, data?: any) => void;
  clients: Client[];
  config?: SystemConfig;
}

const Login: React.FC<LoginProps> = ({ onLogin, clients, config }) => {
  const primary = config?.primaryColor || '#0f172a';
  const secondary = config?.secondaryColor || '#d4af37';
  const fontFamily = config?.fontFamily || 'Cairo';
  const [loginMode, setLoginMode] = useState<'ADMIN' | 'CLIENT'>('ADMIN');
  const [adminPass, setAdminPass] = useState('');
  
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientPhoneInput, setClientPhoneInput] = useState('');
  const [error, setError] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (adminPass === '1') {
      // Owner Login (Ahmed Helmy)
      onLogin(UserRole.ADMIN, { name: 'المستشار/ أحمد حلمي', id: 'owner', title: 'المدير العام' });
    } else if (adminPass === '2') {
      // Finance Manager Login (Samar Elabd) - Same permissions
      onLogin(UserRole.ADMIN, { name: 'أ/ سمر العبد', id: 'finance_manager', title: 'المدير المالي' });
    } else if (adminPass === '123456') {
      // General Admin Login
      onLogin(UserRole.ADMIN, { name: 'مسؤول إداري', id: 'admin', title: 'إدارة المكتب' });
    } else {
      setError('كلمة المرور غير صحيحة');
    }
  };

  const handleClientLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.emiratesId === clientIdInput && c.phone.replace(/\s/g, '') === clientPhoneInput.replace(/\s/g, ''));
    
    if (client) {
      onLogin(UserRole.CLIENT, client);
    } else {
      setError('بيانات الدخول غير صحيحة. يرجى التأكد من رقم الهوية ورقم الهاتف المسجل.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 relative overflow-hidden" style={{ background: primary, fontFamily }}>
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 opacity-10 blur-[120px] -mr-48 -mt-48 rounded-full" style={{ background: secondary }}></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 opacity-5 blur-[120px] -ml-48 -mb-48 rounded-full"></div>

      <div className="w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl mx-auto mb-6 overflow-hidden" style={{ background: `linear-gradient(135deg, ${secondary}, ${secondary}cc)` }}>
            {config?.logo ? (
              <img src={config.logo} className="w-full h-full object-contain p-2" alt="Logo" />
            ) : (
              <ICONS.Logo className="w-14 h-14" style={{ color: primary }} />
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: secondary }}>{config?.officeName || 'مكتب المستشار أحمد حلمي'}</h1>
          <p className="text-slate-400 text-sm font-bold mt-2 uppercase tracking-[0.2em]">{config?.officeSlogan || 'بوابة الخدمات القانونية الرقمية'}</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-black/20 p-1 rounded-2xl mb-8">
          <button 
            onClick={() => { setLoginMode('ADMIN'); setError(''); }}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${loginMode === 'ADMIN' ? 'shadow-lg' : 'text-slate-400 hover:text-white'}`}
            style={loginMode === 'ADMIN' ? { background: secondary, color: primary } : undefined}
          >
            الإدارة والموظفين
          </button>
          <button 
            onClick={() => { setLoginMode('CLIENT'); setError(''); }}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${loginMode === 'CLIENT' ? 'shadow-lg' : 'text-slate-400 hover:text-white'}`}
            style={loginMode === 'CLIENT' ? { background: secondary, color: primary } : undefined}
          >
            بوابة الموكلين
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-bold p-4 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        {loginMode === 'ADMIN' ? (
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[#d4af37] mb-2 uppercase tracking-wider">الرقم السري</label>
              <input 
                type="password" 
                className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-500 outline-none focus:border-[#d4af37] transition-all text-center tracking-widest text-lg"
                placeholder="••••••"
                value={adminPass}
                onChange={e => setAdminPass(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all"
              style={{ background: `linear-gradient(90deg, ${secondary}, ${secondary}cc)`, color: primary }}
            >
              دخول النظام
            </button>
          </form>
        ) : (
          <form onSubmit={handleClientLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[#d4af37] mb-2 uppercase tracking-wider">رقم الهوية / الجواز</label>
              <input 
                type="text" 
                className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-500 outline-none focus:border-[#d4af37] transition-all font-mono"
                placeholder="784-xxxx-xxxxxxx-x"
                value={clientIdInput}
                onChange={e => setClientIdInput(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#d4af37] mb-2 uppercase tracking-wider">رقم الهاتف (كلمة المرور)</label>
              <input 
                type="text" 
                className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-500 outline-none focus:border-[#d4af37] transition-all font-mono"
                placeholder="05xxxxxxxx"
                value={clientPhoneInput}
                onChange={e => setClientPhoneInput(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all"
              style={{ background: `linear-gradient(90deg, ${secondary}, ${secondary}cc)`, color: primary }}
            >
              دخول الموكل
            </button>
          </form>
        )}

        <div className="mt-12 text-center border-t border-white/5 pt-6">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">&copy; 2025 LegalMaster UAE</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
