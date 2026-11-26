import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, RotateCcw, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useUserStore } from '../../store/useUserStore';
import { useGigStore } from '../../store/useGigStore';
import { toast } from 'react-hot-toast';

const RecoverySettings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { addGig } = useGigStore();
  const [archivedGigs, setArchivedGigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchArchivedGigs();
  }, [user]);

  const fetchArchivedGigs = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('gigs_archive')
        .select('*')
        .or(`seller_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setArchivedGigs(data || []);
    } catch (err) {
      console.error('Failed to fetch archive:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecover = async (gig: any) => {
    try {
      const { deleted_at, ...gigData } = gig;
      
      // 1. Move back to gigs table
      const { data, error } = await supabase
        .from('gigs')
        .insert(gigData)
        .select()
        .single();

      if (error) throw error;

      // 2. Remove from archive
      await supabase.from('gigs_archive').delete().eq('id', gig.id);

      // 3. Update local store
      addGig(data);
      setArchivedGigs(prev => prev.filter(g => g.id !== gig.id));
      
      toast.success("Skill recovered successfully!");
    } catch (err) {
      toast.error("Recovery failed");
    }
  };

  const getDaysRemaining = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const expiryDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diff = expiryDate.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="pt-4 pb-32 max-w-screen-md mx-auto px-6 min-h-screen">
      <header className="flex items-center gap-4 mb-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Trash & Recovery</h1>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest opacity-60">Gigs stay here for 30 days</p>
        </div>
      </header>

      <div className="space-y-6">
        {isLoading ? (
           <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
           </div>
        ) : archivedGigs.length > 0 ? (
          archivedGigs.map(gig => (
            <div key={gig.id} className="ios-card p-4 flex gap-4 items-center group">
              <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                <img src={gig.thumbnail_url} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white truncate">{gig.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                   <Clock size={12} className="text-primary" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                     {getDaysRemaining(gig.deleted_at)} days until permanent deletion
                   </span>
                </div>
              </div>
              <button 
                onClick={() => handleRecover(gig)}
                className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white hover:bg-primary hover:text-white transition-all shadow-xl active:scale-90"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          ))
        ) : (
          <div className="py-20 text-center space-y-6">
             <div className="w-20 h-20 rounded-[2rem] bg-surface-container-low flex items-center justify-center text-on-surface-variant mx-auto opacity-20">
                <Trash2 size={40} />
             </div>
             <div className="space-y-2">
                <p className="text-on-surface-variant font-bold text-sm">Your trash is empty</p>
                <p className="text-[10px] font-medium text-on-surface-variant opacity-40 uppercase tracking-[0.2em]">Deleted skills will appear here for recovery</p>
             </div>
          </div>
        )}

        <div className="ios-card p-6 bg-primary/5 border-primary/10 flex gap-4">
           <AlertCircle className="text-primary shrink-0" size={20} />
           <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
             Items in the trash are not visible to other users. After 30 days, they are automatically and permanently deleted from our servers.
           </p>
        </div>
      </div>
    </div>
  );
};

export default RecoverySettings;
