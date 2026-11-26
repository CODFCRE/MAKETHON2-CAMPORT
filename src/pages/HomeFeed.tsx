import React, { useState } from 'react';
import { useGigs } from '../hooks/api/useGigs';
import { useGigStore } from '../store/useGigStore';
import GigVideoCard from '../components/gig/GigVideoCard';
import GigCard from '../components/gig/GigCard';
import { LayoutGrid, ListFilter, Play } from 'lucide-react';

const HomeFeed: React.FC = () => {
  const { isLoading } = useGigs();
  const { filteredGigs } = useGigStore();
  const [viewMode, setViewMode] = useState<'video' | 'grid'>('grid');

  if (isLoading && filteredGigs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Syncing Feed</span>
      </div>
    );
  }

  return (
    <div className="pb-32 px-4 md:px-0 max-w-7xl mx-auto">
      <div className="flex items-center justify-between px-2 py-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest opacity-40">Display</span>
          <div className="flex bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-surface shadow-sm text-primary' : 'text-zinc-500'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('video')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'video' ? 'bg-surface shadow-sm text-primary' : 'text-zinc-500'}`}
            >
              <Play size={16} />
            </button>
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-white transition-all border border-white/5">
          <ListFilter size={14} /> Refine
        </button>
      </div>

      {viewMode === 'video' ? (
        <div className="space-y-6 max-w-lg mx-auto">
          {filteredGigs.map(gig => (
            <div key={gig.id} className="ios-card overflow-hidden">
              <GigVideoCard gig={gig} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredGigs.map(gig => (
            <GigCard key={gig.id} gig={gig} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeFeed;
