import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { authService } from '../features/auth/authService';
import { gigService } from '../features/gigs/gigService';
import type { Gig } from '../types/gig';
import type { User } from '../types/user';
import GigCard from '../components/gig/GigCard';
import { Search, ChevronLeft, User as UserIcon, Briefcase, MessageCircle } from 'lucide-react';
import { cn } from '../utils/helpers';

const SearchResults: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<'all' | 'gigs' | 'users'>('all');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (query) {
      handleSearch();
    }
  }, [query]);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const [gigsRes, usersRes] = await Promise.all([
        gigService.getGigs(), // This fetches all active gigs, we will filter locally for simplicity or add search API
        authService.searchUsers(query)
      ]);
      
      const filteredGigs = gigsRes.filter(g => 
        g.title.toLowerCase().includes(query.toLowerCase()) || 
        g.description.toLowerCase().includes(query.toLowerCase()) ||
        g.category.toLowerCase().includes(query.toLowerCase())
      );

      setGigs(filteredGigs);
      setUsers(usersRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Search Header */}
      <header className="fixed top-0 left-0 w-full z-[100] ios-glass border-b border-white/5 h-16 flex items-center px-6 gap-4">
        <button onClick={() => navigate(-1)} className="text-primary active:opacity-50 transition-opacity">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input 
            type="text" 
            value={query}
            onChange={(e) => setSearchParams({ q: e.target.value })}
            placeholder="Search Camport..."
            className="w-full h-10 bg-surface rounded-xl pl-12 pr-4 text-sm font-medium border border-white/5 focus:ring-2 focus:ring-primary/20 outline-none ios-transition"
          />
        </div>
      </header>

      <main className="pt-4 px-6 max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-8 border-b border-white/5 mb-8 overflow-x-auto no-scrollbar">
          {(['all', 'gigs', 'users'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-4 text-xs font-black uppercase tracking-widest transition-all relative whitespace-nowrap",
                activeTab === tab ? "text-white" : "text-on-surface-variant opacity-40 hover:opacity-100"
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_8px_#007AFF]" />
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Searching records</span>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Users Section */}
            {(activeTab === 'all' || activeTab === 'users') && users.length > 0 && (
              <section className="animate-ios">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40 mb-6 flex items-center gap-2">
                  <UserIcon size={14} /> Creators
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map(u => (
                    <div 
                      key={u.id}
                      onClick={() => navigate(`/profile/${u.id}`)}
                      className="ios-card p-4 flex items-center gap-4 active:scale-95 transition-all cursor-pointer group"
                    >
                      <img src={u.avatar_url} className="w-16 h-16 rounded-full object-cover border-2 border-white/5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{u.full_name}</p>
                        <p className="text-[10px] text-on-surface-variant font-medium mt-1 truncate">{u.title || 'Elite Creator'}</p>
                      </div>
                      <button className="p-2.5 rounded-xl bg-white/5 text-primary hover:bg-primary hover:text-white transition-all">
                        <MessageCircle size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Gigs Section */}
            {(activeTab === 'all' || activeTab === 'gigs') && (
              <section className="animate-ios" style={{ animationDelay: '0.1s' }}>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40 mb-6 flex items-center gap-2">
                  <Briefcase size={14} /> Projects
                </h2>
                {gigs.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {gigs.map(gig => (
                      <GigCard key={gig.id} gig={gig} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 opacity-40">
                    <p className="text-sm font-bold">No projects found</p>
                  </div>
                )}
              </section>
            )}

            {users.length === 0 && gigs.length === 0 && (
               <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-surface rounded-3xl flex items-center justify-center mb-6 border border-white/5">
                    <Search size={32} className="text-on-surface-variant opacity-20" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Universal Null</h3>
                  <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
                    We couldn't find any creators or projects matching "{query}"
                  </p>
               </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchResults;
