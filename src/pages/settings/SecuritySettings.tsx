import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock, Shield, Smartphone } from 'lucide-react';

const SecuritySettings: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="pt-4 pb-32 max-w-screen-md mx-auto px-6 min-h-screen">
      <header className="flex items-center gap-4 mb-10">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-black tracking-tighter">Security</h1>
      </header>

      <div className="space-y-10 animate-ios">
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-4">Authentication</h2>
          <div className="ios-card divide-y divide-white/5 overflow-hidden">
            <SecurityItem 
              icon={Lock} 
              label="Change Password" 
              desc="Last changed 3 months ago"
              color="bg-zinc-600"
            />
            <SecurityItem 
              icon={Smartphone} 
              label="Two-Factor Auth" 
              desc="Extra layer of protection"
              color="bg-primary"
              extra={<span className="text-[10px] font-bold text-error uppercase">Disabled</span>}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-4">Device Management</h2>
          <div className="ios-card divide-y divide-white/5 overflow-hidden">
            <SecurityItem 
              icon={Smartphone} 
              label="Active Sessions" 
              desc="iPhone 15 Pro, London UK"
              color="bg-blue-500"
            />
            <SecurityItem 
              icon={Shield} 
              label="Trusted Devices" 
              desc="2 devices verified"
              color="bg-green-500"
            />
          </div>
        </section>

        <div className="pt-6">
           <p className="text-[10px] text-center text-on-surface-variant font-medium opacity-40 px-10">
             Your account is protected by Camport Guard. We monitor for suspicious activity and notify you of any new sign-ins.
           </p>
        </div>
      </div>
    </div>
  );
};

const SecurityItem: React.FC<{ icon: any; label: string; desc: string; color: string; extra?: React.ReactNode }> = ({ icon: Icon, label, desc, color, extra }) => (
  <button className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all text-left">
    <div className="flex items-center gap-4">
      <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-bold text-white tracking-tight">{label}</p>
        <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{desc}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
       {extra}
       <ChevronLeft className="rotate-180 text-zinc-600" size={16} />
    </div>
  </button>
);

export default SecuritySettings;
