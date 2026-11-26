import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, Plus, ArrowRight, Wallet, History } from 'lucide-react';

const PaymentSettings: React.FC = () => {
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
        <h1 className="text-2xl font-black tracking-tighter">Payments</h1>
      </header>

      <div className="space-y-10 animate-ios">
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-4">Payment Methods</h2>
          <div className="space-y-3">
             <div className="ios-card p-6 bg-gradient-to-br from-zinc-800 to-black border border-white/10 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all" />
                <div className="relative z-10 flex flex-col justify-between h-32">
                   <div className="flex justify-between items-start">
                      <CreditCard size={32} className="text-white/40" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Primary</span>
                   </div>
                   <div>
                      <p className="text-lg font-black tracking-widest text-white">•••• •••• •••• 4242</p>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Exp 12/26</p>
                   </div>
                </div>
             </div>
             
             <button className="w-full h-16 rounded-[2rem] border-2 border-dashed border-white/5 flex items-center justify-center gap-3 text-on-surface-variant hover:border-primary/20 hover:text-primary transition-all active:scale-[0.98]">
                <Plus size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Add New Card</span>
             </button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-4">Quick Links</h2>
          <div className="ios-card divide-y divide-white/5 overflow-hidden">
            <LinkItem icon={Wallet} label="Wallet Balance" value="₹4,820" color="bg-success" onClick={() => navigate('/dashboard')} />
            <LinkItem icon={History} label="Transaction History" color="bg-blue-500" onClick={() => navigate('/history')} />
          </div>
        </section>
      </div>
    </div>
  );
};

const LinkItem: React.FC<{ icon: any; label: string; value?: string; color: string; onClick: () => void }> = ({ icon: Icon, label, value, color, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all text-left group">
    <div className="flex items-center gap-4">
      <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-bold text-white tracking-tight">{label}</p>
        {value && <p className="text-lg font-black text-white mt-1">{value}</p>}
      </div>
    </div>
    <ArrowRight size={18} className="text-zinc-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
  </button>
);

export default PaymentSettings;
