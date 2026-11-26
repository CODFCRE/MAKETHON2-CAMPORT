import React from 'react';
import { TrendingUp, Download, Settings, CreditCard, Activity, ChevronRight, BarChart3, Clock } from 'lucide-react';
import Button from '../components/ui/Button';
import { formatPrice } from '../utils/helpers';

import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/helpers';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();


  const handleWithdrawal = () => {
    toast.error("Withdrawal feature coming soon.");
  };

  return (
    <div className="pt-4 px-6 max-w-4xl mx-auto min-h-screen pb-40 ios-scroll">
      <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 animate-ios">Dashboard</h1>
      <p className="text-on-surface-variant font-medium text-sm mb-10 opacity-60 uppercase tracking-widest animate-ios">Command Center</p>

      {/* Revenue Card (Primary Focus) */}
      <section className="animate-ios" style={{ animationDelay: '0.1s' }}>
        <div className="bg-primary p-8 rounded-[32px] flex flex-col justify-between min-h-[220px] shadow-2xl relative overflow-hidden group mb-8">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex justify-between items-start">
            <span className="text-white/60 font-black text-[10px] uppercase tracking-[0.3em]">Total Balance</span>
            <button className="ios-glass p-2.5 rounded-full text-white border-white/20">
              <BarChart3 size={20} />
            </button>
          </div>
          <div className="relative z-10">
            <h2 className="text-6xl font-extrabold tracking-tighter text-white mb-2">{formatPrice(4820)}</h2>
            <div className="flex gap-4">
              <StatPill label="Escrow" value={formatPrice(1240)} />
              <StatPill label="Ready" value={formatPrice(3580)} />
            </div>
          </div>
        </div>
      </section>

      {/* Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-ios" style={{ animationDelay: '0.2s' }}>
        <div className="ios-card p-6 flex flex-col justify-between">
           <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Operations</span>
              <TrendingUp size={18} className="text-primary" />
           </div>
           <div className="space-y-4">
              <ProjectRow label="Brand Identity" status="In Design" color="text-primary" progress={75} />
              <ProjectRow label="API Integration" status="Testing" color="text-warning" progress={40} />
              <ProjectRow label="Video FX" status="Rendered" color="text-success" progress={100} />
           </div>
           <Button variant="ghost" className="w-full mt-6 h-12 rounded-2xl flex items-center justify-between px-4 border border-white/5 font-bold text-xs bg-white/5">
              Project Board <ChevronRight size={14} />
           </Button>
        </div>

        <div className="ios-card p-6 flex flex-col justify-between">
           <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Quick Actions</span>
              <Activity size={18} className="text-secondary" />
           </div>
           <div className="grid grid-cols-2 gap-3">
              <ActionButton onClick={() => navigate('/upload')} icon={Plus} label="New Gig" color="bg-secondary" />
              <ActionButton onClick={handleWithdrawal} icon={CreditCard} label="Bank" color="bg-success" />
              <ActionButton onClick={() => navigate('/history')} icon={Clock} label="History" color="bg-surface-container" />
              <ActionButton onClick={() => navigate('/settings')} icon={Settings} label="Tools" color="bg-zinc-800" />
           </div>
        </div>
      </div>

      <section className="mt-12 animate-ios" style={{ animationDelay: '0.3s' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40">Recent History</h2>
          <button onClick={() => navigate('/history')} className="text-primary text-xs font-bold active:opacity-50">View All</button>
        </div>
        <div className="ios-card divide-y divide-white/5 overflow-hidden">
           <HistoryRow label="Logo Pack Delivery" amount="+ ₹1,200" date="2h ago" type="plus" />
           <HistoryRow label="Platform Fee" amount="- ₹80" date="Yesterday" type="minus" />
           <HistoryRow label="Reel Sync Payout" amount="+ ₹4,500" date="Oct 20" type="plus" />
        </div>
      </section>
    </div>
  );
};

const Plus: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

const StatPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/5">
    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">{label}</p>
    <p className="text-xs font-black text-white">{value}</p>
  </div>
);

const ProjectRow: React.FC<{ label: string; status: string; color: string; progress: number }> = ({ label, status, color, progress }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
      <span className="text-white">{label}</span>
      <span className={color}>{status}</span>
    </div>
    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
      <div className={cn("h-full transition-all duration-1000", progress === 100 ? "bg-success" : "bg-primary")} style={{ width: `${progress}%` }} />
    </div>
  </div>
);

const ActionButton: React.FC<{ icon: any; label: string; color: string; onClick: () => void }> = ({ icon: Icon, label, color, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-surface-container border border-white/5 active:scale-95 transition-all group">
     <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm ios-transition group-hover:scale-110", color)}>
        <Icon size={20} />
     </div>
     <span className="text-[10px] font-bold tracking-tight text-on-surface-variant group-hover:text-white">{label}</span>
  </button>
);

const HistoryRow: React.FC<{ label: string; amount: string; date: string; type: 'plus' | 'minus' }> = ({ label, amount, date, type }) => (
  <div className="flex items-center justify-between p-4 px-6 active:bg-white/5 transition-colors cursor-pointer group">
    <div className="flex items-center gap-4">
       <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", type === 'plus' ? "bg-success/10 text-success" : "bg-error/10 text-error")}>
          {type === 'plus' ? <TrendingUp size={20} /> : <Download size={20} />}
       </div>
       <div>
          <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{label}</p>
          <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{date}</p>
       </div>
    </div>
    <p className={cn("font-black tracking-tighter text-sm", type === 'plus' ? "text-success" : "text-white")}>{amount}</p>
  </div>
);

export default Dashboard;
