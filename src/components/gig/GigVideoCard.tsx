import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, CheckCircle, ArrowRight } from 'lucide-react';
import type { FC } from 'react';
import type { Gig } from '../../types/gig';
import Button from '../ui/Button';
import { cn } from '../../utils/helpers';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface GigVideoCardProps {
  gig: Gig;
}

const GigVideoCard: FC<GigVideoCardProps> = React.memo(({ gig }) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (!isLiked) toast.success('Added to your collection');
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: gig.title,
        text: `Check out this skill on SkillTok!`,
        url: window.location.href,
      });
    } catch (err) {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handlePurchase = () => {
    toast.loading('Redirecting to secure payment...', { duration: 2000 });
    setTimeout(() => {
        navigate(`/gig/${gig.id}`);
    }, 1500);
  };

  const openChat = () => {
    navigate('/messages');
  };

  return (
    <section className="relative h-screen w-full snap-start overflow-hidden flex flex-col justify-end">
      {/* Background Image/Video */}
      <div className="absolute inset-0 z-0">
        <img 
          className="w-full h-full object-cover" 
          src={gig.thumbnail_url} 
          alt={gig.title} 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/90"></div>
      </div>

      {/* Floating Info */}
      <div className="relative z-10 w-full px-6 pb-48 flex justify-between items-end">
        <div className="max-w-[75%] space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container/60 backdrop-blur-md border border-white/10">
              <span className="text-xs font-bold tracking-widest text-primary uppercase">₹{gig.price} STARTING</span>
            </div>
            {gig.is_trending && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-error-container/30 border border-error/20">
                <span className="text-[10px] font-black text-error uppercase tracking-widest">🔥 Trending</span>
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold leading-tight text-on-surface tracking-tight">
              {gig.title}
            </h1>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/profile')}>
              <span className="text-sm font-medium text-on-surface-variant flex items-center gap-1">
                @creative_pixel
                <CheckCircle size={14} className="text-primary fill-primary" />
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#adc6ff]"></div>
              <span className="text-xs text-secondary-dim font-bold tracking-widest uppercase">AVAILABLE NOW</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-6 items-center">
          <ActionButton 
            Icon={Heart} 
            count={isLiked ? "12.5K" : "12.4K"} 
            active={isLiked} 
            onClick={handleLike}
            activeColor="text-red-500 fill-red-500"
          />
          <ActionButton Icon={MessageCircle} count="842" onClick={openChat} />
          <ActionButton Icon={Share2} count="Share" color="text-green-400" onClick={handleShare} />
          <ActionButton 
            Icon={Bookmark} 
            count={isBookmarked ? "43K" : "42K"} 
            active={isBookmarked}
            onClick={() => setIsBookmarked(!isBookmarked)}
            activeColor="text-primary fill-primary"
          />
        </div>
      </div>

      {/* Buy Button */}
      <div className="absolute bottom-20 left-0 w-full px-6 z-40">
        <Button onClick={handlePurchase} className="w-full h-14 justify-between" size="lg">
          <div className="flex flex-col items-start text-left">
            <span className="text-[10px] font-bold text-white/70 tracking-widest uppercase leading-none">Quick Purchase</span>
            <span className="text-sm font-bold text-white uppercase tracking-tighter">Buy This Gig</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-white">₹{gig.price}</span>
            <ArrowRight size={20} />
          </div>
        </Button>
      </div>
    </section>
  );
});

interface ActionButtonProps {
  Icon: any;
  count: string;
  color?: string;
  active?: boolean;
  activeColor?: string;
  onClick?: () => void;
}

const ActionButton: FC<ActionButtonProps> = ({ Icon, count, color = 'text-on-surface', active, activeColor, onClick }) => (
  <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={onClick}>
    <div className={cn(
      "w-12 h-12 rounded-full bg-surface-container/40 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-90 transition-transform group-hover:bg-white/10",
      active ? "border-primary/40 bg-white/5" : ""
    )}>
      <Icon size={24} className={cn(active && activeColor ? activeColor : color)} />
    </div>
    <span className={cn("text-[10px] font-bold", color === 'text-green-400' ? "text-green-400/80" : "text-on-surface-variant")}>
      {count}
    </span>
  </div>
);

export default GigVideoCard;
