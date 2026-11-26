import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gigService } from '../features/gigs/gigService';
import type { Gig } from '../types/gig';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  ChevronLeft, 
  MoreVertical, 
  Plus, 
  ShoppingBag,
  Star,
  Send
} from 'lucide-react';
import { cn, formatPrice } from '../utils/helpers';
import { toast } from 'react-hot-toast';
import { useUserStore } from '../store/useUserStore';

const GigImmersiveView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useUserStore();
  const [gig, setGig] = useState<Gig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (id) {
      gigService.getGigById(id)
        .then(setGig)
        .catch((err) => {
          console.error('[ImmersiveView] Fetch error:', err);
          toast.error("Failed to load immersive view");
        })
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (!isLiked) toast.success("Added to favorites");
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    if (!isFollowing) toast.success(`Following ${gig?.profiles?.full_name || 'Creator'}`);
  };

  const handleOrder = () => {
    toast.success("Initiating Order...");
    navigate(`/gig/${id}`); // Redirect to full details/checkout
  };

  if (isLoading) {
    return (
      <div className="media-stage h-screen w-full bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!gig) return null;

  const isVideo = /\.(mp4|webm|mov|m4v|avi)(\?|$)/i.test(gig.video_url || gig.thumbnail_url);

  return (
    <div className="media-stage h-screen w-full bg-black text-white relative overflow-hidden flex flex-col md:flex-row">
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        {isVideo ? (
          <video 
            src={gig.video_url || gig.thumbnail_url} 
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img src={gig.thumbnail_url} className="w-full h-full object-cover opacity-80" alt="" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />
      </div>

      {/* Top Controls */}
      <header className="absolute top-0 left-0 w-full z-50 px-6 pt-12 flex justify-between items-center pointer-events-none">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all pointer-events-auto"
        >
          <ChevronLeft size={24} />
        </button>
        <button className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all pointer-events-auto">
          <MoreVertical size={20} />
        </button>
      </header>

      {/* Right Side Actions (Mobile style) */}
      <div className="absolute right-4 bottom-32 z-50 flex flex-col items-center gap-6 md:right-8 md:bottom-1/2 md:translate-y-1/2">
        <div className="flex flex-col items-center gap-2">
          <div className="relative mb-2">
            <div 
              onClick={() => navigate(`/profile/${gig.seller_id}`)}
              className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-zinc-900 cursor-pointer active:scale-90 transition-all"
            >
              <img src={gig.profiles?.avatar_url || `https://picsum.photos/seed/${gig.seller_id}/100/100`} className="w-full h-full object-cover" />
            </div>
            {!isFollowing && (
              <button 
                onClick={handleFollow}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white shadow-lg active:scale-75 transition-all"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>

        <ActionButton 
          Icon={Heart} 
          label={isLiked ? "1.2k" : "1.1k"} 
          active={isLiked} 
          activeColor="text-red-500 fill-red-500"
          onClick={handleLike} 
        />
        
        <ActionButton 
          Icon={MessageCircle} 
          label="84" 
          onClick={() => setShowCommentInput(true)} 
        />
        
        <ActionButton 
          Icon={Share2} 
          label="Share" 
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied!");
          }} 
        />

        <div 
          onClick={handleOrder}
          className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30 animate-bounce cursor-pointer active:scale-90 transition-all"
        >
          <ShoppingBag size={22} />
        </div>
      </div>

      {/* Bottom Content Area */}
      <div className="absolute bottom-0 left-0 w-full z-40 p-6 pb-12 pointer-events-none md:max-w-2xl">
        <div className="pointer-events-auto space-y-4">
          <div className="flex items-center gap-3">
             <h2 
               onClick={() => navigate(`/profile/${gig.seller_id}`)}
               className="text-lg font-black tracking-tight cursor-pointer hover:text-primary transition-colors"
             >
               @{gig.profiles?.full_name?.toLowerCase().replace(' ', '_') || 'creator'}
             </h2>
             <div className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-white/5">
                PRO CREATOR
             </div>
          </div>

          <p className="text-sm font-medium leading-relaxed line-clamp-3 text-white/90">
            {gig.description}
          </p>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 text-yellow-400">
                <Star size={14} className="fill-yellow-400" />
                <span className="text-xs font-black">{gig.rating}</span>
             </div>
             <div className="h-4 w-[1px] bg-white/20" />
             <div className="text-[10px] font-black uppercase tracking-widest text-primary">
                {gig.category}
             </div>
             <div className="h-4 w-[1px] bg-white/20" />
             <div className="text-sm font-black text-white">
                {formatPrice(gig.price)}
             </div>
          </div>
        </div>
      </div>

      {/* Comment Overlay */}
      {showCommentInput && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-zinc-900 rounded-t-[2.5rem] p-8 space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center">
               <h3 className="text-lg font-black tracking-tighter">Engagement Hub</h3>
               <button onClick={() => setShowCommentInput(false)} className="text-on-surface-variant">Close</button>
            </div>
            
            <div className="flex gap-4">
               <img src={currentUser?.avatar_url || "https://picsum.photos/seed/me/100/100"} className="w-10 h-10 rounded-full" />
               <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a high-quality comment..."
                    className="w-full h-12 bg-white/5 rounded-2xl px-4 text-sm focus:ring-1 focus:ring-primary outline-none"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary">
                    <Send size={18} />
                  </button>
               </div>
            </div>

            <div className="space-y-6 py-4">
               <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800" />
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant">@jordan_vfx • 2h</p>
                    <p className="text-xs mt-1">This transition is absolutely insane! 🔥</p>
                  </div>
               </div>
               <div className="flex gap-3 opacity-60">
                  <div className="w-8 h-8 rounded-full bg-zinc-800" />
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant">@creative_mind • 5h</p>
                    <p className="text-xs mt-1">Love the color grading on this one.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionButton: React.FC<{ Icon: any; label: string; active?: boolean; activeColor?: string; onClick: () => void }> = ({ Icon, label, active, activeColor, onClick }) => (
  <div className="flex flex-col items-center gap-1">
    <button 
      onClick={onClick}
      className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all active:scale-75",
        active 
          ? `bg-white/20 border-white/20 ${activeColor}` 
          : "bg-black/20 border-white/10 text-white"
      )}
    >
      <Icon size={24} className={cn(active && "animate-pulse")} />
    </button>
    <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{label}</span>
  </div>
);

export default GigImmersiveView;
