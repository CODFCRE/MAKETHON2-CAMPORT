import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, Star, Award, CheckCircle } from 'lucide-react';
import Button from '../../components/ui/Button';

const VerificationSettings: React.FC = () => {
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
        <h1 className="text-2xl font-black tracking-tighter">Identity</h1>
      </header>

      <div className="space-y-10 animate-ios">
        <div className="ios-card p-10 bg-gradient-to-br from-green-500/20 to-transparent border border-green-500/10 text-center relative overflow-hidden">
           <div className="absolute -right-10 -top-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
           <ShieldCheck size={64} className="mx-auto text-green-500 mb-6 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]" />
           <h2 className="text-2xl font-black text-white mb-2">Level 1 Verified</h2>
           <p className="text-sm text-green-500/80 font-bold uppercase tracking-widest">Global Trust Badge Active</p>
        </div>

        <section className="space-y-4">
           <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-4">Verification Roadmap</h2>
           <div className="space-y-4">
              <RoadmapStep 
                level="Level 1" 
                title="Identity Sync" 
                desc="Email and basic info verified" 
                status="completed" 
                icon={CheckCircle}
              />
              <RoadmapStep 
                level="Level 2" 
                title="Elite Status" 
                desc="ID verification & 10+ successful gigs" 
                status="locked" 
                icon={Star}
              />
              <RoadmapStep 
                level="Level 3" 
                title="Protocol Legend" 
                desc="Top 1% earner & community trust" 
                status="locked" 
                icon={Award}
              />
           </div>
        </section>

        <div className="pt-6">
           <Button className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all">
             Upgrade to Level 2
           </Button>
        </div>
      </div>
    </div>
  );
};

const RoadmapStep: React.FC<{ level: string; title: string; desc: string; status: 'completed' | 'locked'; icon: any }> = ({ level, title, desc, status, icon: Icon }) => (
  <div className={cn(
    "ios-card p-5 flex items-center gap-4 transition-all",
    status === 'locked' ? "opacity-40" : "border-green-500/20"
  )}>
    <div className={cn(
      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
      status === 'completed' ? "bg-green-500 text-white" : "bg-zinc-800 text-zinc-500"
    )}>
      <Icon size={24} />
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant">{level}</span>
        {status === 'completed' && <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">ACTIVE</span>}
      </div>
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{desc}</p>
    </div>
  </div>
);

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export default VerificationSettings;
