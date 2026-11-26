import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, MoreHorizontal, Send, Heart } from 'lucide-react';
import { storyService } from '../../features/stories/storyService';
import type { Story } from '../../types/story';

const StoryImmersiveView: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadUserStories();
    }
  }, [userId]);

  const loadUserStories = async () => {
    const allStories = await storyService.getStories();
    const filtered = allStories.filter(s => s.user_id === userId);
    if (filtered.length === 0) {
      navigate('/');
      return;
    }
    setUserStories(filtered);
    setIsLoading(false);
  };

  useEffect(() => {
    if (userStories.length === 0) return;

    const duration = 5000; // 5s per story
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, userStories]);

  const handleNext = () => {
    if (currentIndex < userStories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      navigate('/');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  if (isLoading || userStories.length === 0) {
    return <div className="media-stage h-screen w-full bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>;
  }

  const currentStory = userStories[currentIndex];

  return (
    <div className="media-stage h-screen w-full bg-black relative overflow-hidden flex items-center justify-center">
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        {currentStory.media_type === 'video' ? (
          <video 
            src={currentStory.media_url} 
            className="w-full h-full object-contain"
            autoPlay
            muted
            playsInline
          />
        ) : (
          <img src={currentStory.media_url} className="w-full h-full object-contain" alt="" />
        )}
      </div>

      {/* Progress Bars */}
      <div className="absolute top-12 left-0 w-full px-4 flex gap-1.5 z-50">
        {userStories.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-75"
              style={{ 
                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
              }}
            />
          </div>
        ))}
      </div>

      {/* Header Info */}
      <header className="absolute top-16 left-0 w-full px-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden">
            <img 
              src={currentStory.profiles?.avatar_url || `https://picsum.photos/seed/${currentStory.user_id}/100/100`} 
              className="w-full h-full object-cover" 
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white drop-shadow-lg">
              {currentStory.profiles?.full_name}
            </span>
            <span className="text-[10px] font-medium text-white/60 drop-shadow-lg">
              {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <MoreHorizontal className="text-white drop-shadow-lg" size={20} />
          <button onClick={() => navigate('/')} className="text-white drop-shadow-lg">
            <X size={24} />
          </button>
        </div>
      </header>

      {/* Tap Zones */}
      <div className="absolute inset-0 z-10 flex">
        <div className="flex-1 h-full cursor-pointer" onClick={handlePrev} />
        <div className="flex-1 h-full cursor-pointer" onClick={handleNext} />
      </div>

      {/* Footer / Interaction */}
      <footer className="absolute bottom-10 left-0 w-full px-6 z-50 flex items-center gap-4">
        <div className="flex-1 h-12 bg-transparent border border-white/20 rounded-full px-6 flex items-center ios-glass">
          <input 
            type="text" 
            placeholder="Send message..." 
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          />
        </div>
        <button className="w-12 h-12 flex items-center justify-center text-white active:scale-90 transition-transform">
          <Heart size={24} />
        </button>
        <button className="w-12 h-12 flex items-center justify-center text-white active:scale-90 transition-transform">
          <Send size={24} />
        </button>
      </footer>
    </div>
  );
};

export default StoryImmersiveView;
