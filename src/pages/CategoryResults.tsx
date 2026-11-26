import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGigStore } from '../store/useGigStore';
import { useGigs } from '../hooks/api/useGigs';
import GigCard from '../components/gig/GigCard';
import { ChevronLeft, Filter, Search } from 'lucide-react';
import type { GigCategory } from '../types/gig';

const CategoryResults: React.FC = () => {
  const { categoryName: rawCategoryName } = useParams<{ categoryName: string }>();
  const categoryName = decodeURIComponent(rawCategoryName || '');
  const navigate = useNavigate();
  
  // Use the hook to fetch gigs for this category
  const { isLoading } = useGigs(categoryName as GigCategory);
  const { gigs } = useGigStore();

  // Local filtering as a secondary safety measure or if the hook hasn't synced everything yet
  const filteredGigs = gigs.filter(gig => 
    gig.category === categoryName || 
    gig.category.toLowerCase().includes(categoryName.toLowerCase()) ||
    categoryName.toLowerCase().includes(gig.category.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Premium iOS Header */}
      <header className="fixed top-0 left-0 w-full z-[100] ios-glass border-b border-white/5 h-16 flex items-center px-6">
        <button 
          onClick={() => navigate(-1)}
          className="text-primary font-bold text-sm flex items-center gap-1 active:opacity-50 transition-opacity"
        >
          <ChevronLeft size={20} /> Back
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 leading-none mb-1">Browse</span>
          <h1 className="text-sm font-bold text-white leading-none">{categoryName}</h1>
        </div>
        <button className="ml-auto p-2 text-on-surface-variant active:text-white">
          <Filter size={20} />
        </button>
      </header>

      <main className="pt-4 px-6 max-w-7xl mx-auto">
        {/* Search & Sort Bar */}
        <div className="flex gap-3 mb-8 animate-ios">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
            <input 
              type="text" 
              placeholder={`Search in ${categoryName}...`}
              className="w-full h-11 bg-surface border border-white/5 rounded-2xl pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none ios-transition"
            />
          </div>
          <button className="h-11 px-4 bg-surface border border-white/5 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Recent
          </button>
        </div>

        {/* Results Info */}
        <div className="flex justify-between items-center mb-6 animate-ios" style={{ animationDelay: '0.1s' }}>
          <p className="text-xs font-bold text-on-surface-variant">
            {isLoading ? 'Searching...' : `${filteredGigs.length} results found`}
          </p>
          <div className="flex gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-bold uppercase tracking-widest text-green-500">Global Available</span>
          </div>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
             <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Fetching Gigs</span>
          </div>
        ) : filteredGigs.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-ios" style={{ animationDelay: '0.2s' }}>
            {filteredGigs.map(gig => (
              <GigCard key={gig.id} gig={gig} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-ios">
            <div className="w-20 h-20 bg-surface rounded-3xl flex items-center justify-center mb-6 border border-white/5">
               <Search size={32} className="text-on-surface-variant opacity-20" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No projects yet</h3>
            <p className="text-sm text-on-surface-variant max-w-xs mx-auto mb-8">
              We couldn't find any {categoryName} projects. Be the first to publish one!
            </p>
            <button 
              onClick={() => navigate('/upload')}
              className="bg-primary text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 active:scale-95 transition-all"
            >
              Post a Gig
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default CategoryResults;
