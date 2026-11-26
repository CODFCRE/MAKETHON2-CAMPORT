import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';
import { storyService } from '../../features/stories/storyService';
import type { Story } from '../../types/story';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { uploadMedia } from '../../utils/uploadMedia';

const StoryBar: React.FC = () => {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    const fetchedStories = await storyService.getStories();
    // Group stories by user for the bar
    setStories(fetchedStories);
  };

  const handleAddStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const loadingToast = toast.loading('Uploading story...');
    
    try {
      const uploadRes = await uploadMedia(file);
      if (uploadRes.success && uploadRes.url) {
        const mediaType = file.type.startsWith('video') ? 'video' : 'image';
        await storyService.createStory(user.id, uploadRes.url, mediaType);
        toast.success('Story posted!', { id: loadingToast });
        loadStories();
      } else {
        toast.error(uploadRes.message || 'Upload failed', { id: loadingToast });
      }
    } catch (err) {
      toast.error('Failed to post story', { id: loadingToast });
    } finally {
      setIsUploading(false);
    }
  };

  // Unique users with stories
  const uniqueStoryUsers = Array.from(new Set(stories.map(s => s.user_id)))
    .map(uid => stories.find(s => s.user_id === uid)!);

  return (
    <div className="flex gap-4 px-4 py-6 overflow-x-auto no-scrollbar items-center bg-background">
      {/* My Story / Add Story */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div className="relative">
          <div className="w-16 h-16 rounded-full p-[2px] bg-zinc-800 border border-white/10 overflow-hidden">
            <img 
              src={user?.avatar_url || "https://picsum.photos/seed/user/100/100"} 
              className="w-full h-full rounded-full object-cover grayscale opacity-60" 
              alt="My Story" 
            />
          </div>
          <label className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full border-2 border-background flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform active:scale-95">
            <Plus size={14} strokeWidth={3} />
            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleAddStory} disabled={isUploading} />
          </label>
        </div>
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">My Story</span>
      </div>

      {/* Other Stories */}
      {uniqueStoryUsers.map((s) => (
        <button
          key={s.user_id}
          onClick={() => navigate(`/story/${s.user_id}`)}
          className="flex flex-col items-center gap-1.5 shrink-0 animate-ios"
        >
          <div className="w-16 h-16 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
             <div className="w-full h-full rounded-full border-2 border-background bg-zinc-900 overflow-hidden">
                <img 
                  src={s.profiles?.avatar_url || `https://picsum.photos/seed/${s.user_id}/100/100`} 
                  className="w-full h-full object-cover" 
                  alt={s.profiles?.full_name} 
                />
             </div>
          </div>
          <span className="text-[10px] font-bold text-white uppercase tracking-widest truncate w-16 text-center">
            {s.profiles?.full_name.split(' ')[0]}
          </span>
        </button>
      ))}

      {isUploading && (
        <div className="flex flex-col items-center gap-1.5 shrink-0 opacity-50">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary animate-spin" />
          <span className="text-[10px] font-bold text-primary animate-pulse">POSTING</span>
        </div>
      )}
    </div>
  );
};

export default StoryBar;
