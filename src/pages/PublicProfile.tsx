import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../features/auth/authService';
import { gigService } from '../features/gigs/gigService';
import { chatService } from '../features/chat/chatService';
import { useUserStore } from '../store/useUserStore';
import type { User } from '../types/user';
import type { Gig } from '../types/gig';
import GigCard from '../components/gig/GigCard';
import Button from '../components/ui/Button';
import { ChevronLeft, MessageCircle, Share2, ShieldCheck, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PublicProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useUserStore();
  const [user, setUser] = useState<User | null>(null);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const [profile, allGigs] = await Promise.all([
        authService.getUserById(userId!),
        gigService.getGigs()
      ]);
      
      setUser(profile);
      setGigs(allGigs.filter(g => g.seller_id === userId));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContact = async () => {
    if (!currentUser) {
      toast.error("Please login to message creators");
      navigate('/login');
      return;
    }
    if (currentUser.id === userId) {
       navigate('/profile');
       return;
    }

    try {
      const conv = await chatService.getOrCreateConversation(currentUser.id, userId!);
      
      await chatService.sendMessage({
         conversation_id: conv.id,
         sender_id: currentUser.id,
         receiver_id: userId!,
         content: "Hi! I'm interested in your services."
      });
      navigate('/messages');
    } catch (err) {
      toast.error("Failed to initiate conversation");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">User Not Found</h2>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Dynamic Background Blur */}
      <div className="fixed top-0 left-0 w-full h-96 bg-primary/10 blur-[120px] -z-10" />

      <header className="fixed top-0 left-0 w-full z-[100] ios-glass border-b border-white/5 h-16 flex items-center px-6 justify-between">
        <button onClick={() => navigate(-1)} className="text-white active:opacity-50 transition-opacity">
          <ChevronLeft size={24} />
        </button>
        <button className="text-white active:opacity-50 transition-opacity">
          <Share2 size={20} />
        </button>
      </header>

      <main className="pt-24 px-6 max-w-4xl mx-auto">
        {/* Profile Info */}
        <section className="flex flex-col items-center text-center space-y-6 mb-12 animate-ios">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface shadow-2xl bg-zinc-900 ring-1 ring-white/10">
            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">{user.full_name}</h1>
            <p className="text-on-surface-variant font-bold text-xs uppercase tracking-[0.2em] opacity-60">
              {user.title || 'Elite Creative Specialist'}
            </p>
          </div>

          <div className="flex gap-4 w-full max-w-sm">
             <Button 
               onClick={handleContact}
               className="flex-1 h-14 rounded-2xl gap-2 font-bold text-sm bg-primary text-white shadow-xl shadow-primary/20 active:scale-95 transition-all"
             >
                <MessageCircle size={20} /> Message
             </Button>
             <button className="w-14 h-14 rounded-2xl ios-glass border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all">
                <Globe size={20} />
             </button>
          </div>

          <div className="grid grid-cols-3 gap-8 w-full py-6 border-y border-white/5">
             <Stat label="Rating" value="4.9" />
             <Stat label="Gigs" value={gigs.length.toString()} />
             <Stat label="Verified" icon={<ShieldCheck size={14} className="text-primary" />} value="Yes" />
          </div>
        </section>

        {/* Bio/About */}
        <section className="mb-12 animate-ios" style={{ animationDelay: '0.1s' }}>
           <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-40 mb-4">About Creator</h2>
           <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
             Expert in high-end creative solutions and technical integrations. Delivering professional results with a focus on premium aesthetics and global standards.
           </p>
        </section>

        {/* Skills/Gigs Grid */}
        <section className="animate-ios" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-40 mb-6">Published Skills</h2>
          {gigs.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {gigs.map(gig => (
                <GigCard key={gig.id} gig={gig} />
              ))}
            </div>
          ) : (
            <div className="ios-card p-12 text-center opacity-40">
               <p className="text-xs font-bold uppercase tracking-widest">No public projects</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex flex-col items-center">
    <div className="flex items-center gap-1">
      <span className="text-xl font-black text-white">{value}</span>
      {icon}
    </div>
    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-40 mt-1">{label}</span>
  </div>
);

export default PublicProfile;
