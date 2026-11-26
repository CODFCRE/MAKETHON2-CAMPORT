import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, HelpCircle, MessageSquare, BookOpen, Mail, ShieldCheck } from 'lucide-react';

const SupportSettings: React.FC = () => {
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
        <h1 className="text-2xl font-black tracking-tighter">Support</h1>
      </header>

      <div className="space-y-10 animate-ios">
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-4">Contact Us</h2>
          <div className="ios-card divide-y divide-white/5 overflow-hidden">
            <SupportItem 
              icon={MessageSquare} 
              label="Live Chat" 
              desc="Average response: 5 mins"
              color="bg-primary"
            />
            <SupportItem 
              icon={Mail} 
              label="Email Support" 
              desc="support@camport.app"
              color="bg-zinc-600"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-4">Resources</h2>
          <div className="ios-card divide-y divide-white/5 overflow-hidden">
            <SupportItem 
              icon={BookOpen} 
              label="Help Center" 
              desc="Guides and documentation"
              color="bg-blue-500"
            />
            <SupportItem 
              icon={ShieldCheck} 
              label="Safety Center" 
              desc="Platform rules and tips"
              color="bg-green-500"
            />
          </div>
        </section>

        <div className="pt-6 text-center">
           <HelpCircle size={48} className="mx-auto text-zinc-800 mb-4" />
           <p className="text-xs font-bold text-on-surface-variant opacity-40">Need more help? Our elite agents are standing by 24/7 to assist with your creative journey.</p>
        </div>
      </div>
    </div>
  );
};

const SupportItem: React.FC<{ icon: any; label: string; desc: string; color: string }> = ({ icon: Icon, label, desc, color }) => (
  <button className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all text-left group">
    <div className="flex items-center gap-4">
      <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-bold text-white tracking-tight">{label}</p>
        <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{desc}</p>
      </div>
    </div>
    <ChevronLeft className="rotate-180 text-zinc-600 group-hover:text-primary transition-colors" size={16} />
  </button>
);

export default SupportSettings;
