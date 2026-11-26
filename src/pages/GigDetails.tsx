import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gigService } from '../features/gigs/gigService';
import type { Gig } from '../types/gig';
import { Star, Shield, CheckCircle, Clock, RotateCcw, MessageCircle, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import { formatPrice } from '../utils/helpers';
import { toast } from 'react-hot-toast';
import { chatService } from '../features/chat/chatService';
import { useUserStore } from '../store/useUserStore';

const GigDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gig, setGig] = useState<Gig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      gigService.getGigById(id)
        .then(setGig)
        .catch(err => {
            console.error(err);
            toast.error("Failed to load gig details");
        })
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  const handlePurchase = () => {
    toast.success("Redirecting to secure checkout...");
    // Simulate navigation to checkout or processing
  };

  const { user: currentUser } = useUserStore();

  const handleChat = async () => {
    if (!currentUser) {
      toast.error("Please login to contact seller");
      navigate('/login');
      return;
    }
    if (!gig) return;

    const loadingToast = toast.loading('Opening chat...');
    try {
      await chatService.getOrCreateConversation(currentUser.id, gig.seller_id);
      toast.dismiss(loadingToast);
      navigate('/messages');
    } catch (err) {
      toast.error("Failed to open chat", { id: loadingToast });
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">Fetching Details</span>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <AlertCircle className="text-error mb-4" size={48} />
        <h2 className="text-2xl font-bold mb-2">Gig Not Found</h2>
        <p className="text-on-surface-variant mb-8">The creator might have removed this service.</p>
        <Button onClick={() => navigate('/')}>Back to Feed</Button>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface min-h-screen pb-40 overflow-y-auto no-scrollbar scroll-smooth">
      {/* Dynamic Header */}
      <div className="fixed top-0 left-0 w-full z-50 px-4 py-4 flex justify-between items-center bg-gradient-to-b from-background/80 to-transparent">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-background/20 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <main>
        <section className="relative h-[60vh] w-full overflow-hidden">
          <img src={gig.thumbnail_url} className="w-full h-full object-cover px-2 pt-2 rounded-[3rem]" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 w-full max-w-4xl">
            <div className="flex flex-wrap gap-2 mb-6">
              <Badge Icon={CheckCircle} label="Pro Seller" color="text-primary" />
              <Badge Icon={Shield} label="Verified Media" color="text-green-400" />
            </div>
            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white mb-4 leading-[0.9]">
              {gig.title}
            </h1>
            <div className="flex items-center gap-2">
              <Star size={18} className="text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-lg">{gig.rating}</span>
              <span className="text-on-surface-variant">({gig.review_count} reviews)</span>
            </div>
          </div>
        </section>

        <div className="px-6 max-w-4xl mx-auto space-y-12 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <StatsCard Icon={Clock} label="Avg. Delivery" value={gig.delivery_time} />
             <StatsCard Icon={RotateCcw} label="Revisions" value={gig.revisions.toString()} />
             <StatsCard Icon={Shield} label="Response" value="< 1h" />
             <StatsCard Icon={Star} label="Repeat Hire" value="84%" />
          </div>

          <div className="p-6 rounded-3xl border border-primary/20 bg-primary/5 flex items-start gap-4 shadow-2xl">
            <div className="bg-primary/20 p-3 rounded-2xl text-primary shrink-0"><Shield size={24} /></div>
            <div>
              <h4 className="font-bold text-white mb-1">SkillTok Escrow Protection</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">Payments are held in escrow until you approve the final delivery. 100% risk-free transactions.</p>
            </div>
          </div>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
              The Scope
              <div className="h-px flex-1 bg-white/5" />
            </h2>
            <div className="bg-surface-container-low p-8 rounded-[2.5rem] border border-white/5">
              <p className="text-on-surface-variant text-lg leading-relaxed whitespace-pre-wrap">{gig.description}</p>
              
              <div className="mt-12 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Industry Breakdown</h3>
                <div className="flex flex-wrap gap-3">
                   {['B2B Web', 'SaaS', 'Fintech', 'EdTech', 'Consumer App'].map(tag => (
                      <span key={tag} className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-bold text-on-surface/60">{tag}</span>
                   ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Floating Modern Action Bar */}
      <div className="fixed bottom-0 left-0 w-full p-6 z-50 pointer-events-none">
        <div className="max-w-xl mx-auto glass-panel rounded-full p-3 flex items-center justify-between border border-white/20 shadow-2xl pointer-events-auto bg-zinc-900/80 backdrop-blur-2xl">
          <button 
            onClick={handleChat}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all active:scale-90"
          >
            <MessageCircle size={22} />
            <span className="text-[7px] font-black uppercase tracking-tighter mt-1">Chat</span>
          </button>
          
          <div className="h-8 w-[1px] bg-white/10 mx-2" />
          
          <div className="flex-1 px-4 leading-none">
            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1 block">Premium Package</span>
            <span className="text-2xl font-black text-white">{formatPrice(gig.price)}</span>
          </div>
          
          <Button onClick={handlePurchase} className="px-10 h-14 rounded-full text-base font-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">
            ORDER NOW
          </Button>
        </div>
      </div>
    </div>
  );
};

const Badge: React.FC<{ Icon: any; label: string; color: string }> = ({ Icon, label, color }) => (
  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/5">
    <Icon size={14} className={color} />
    <span className="text-[10px] font-black uppercase tracking-widest text-white/90">{label}</span>
  </div>
);

const StatsCard: React.FC<{ Icon: any; label: string; value: string }> = ({ Icon, label, value }) => (
  <div className="bg-surface-container-lowest p-6 rounded-[2rem] flex flex-col gap-2 border border-white/5 transition-transform hover:scale-[1.02]">
    <span className="text-on-surface-variant uppercase tracking-[0.15em] text-[10px] font-black opacity-60">{label}</span>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
        <Icon size={20} />
      </div>
      <span className="text-xl font-black tracking-tight">{value}</span>
    </div>
  </div>
);

export default GigDetails;
