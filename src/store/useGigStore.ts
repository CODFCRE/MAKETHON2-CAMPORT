import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Gig } from '../types/gig';

interface GigState {
  gigs: Gig[];
  filteredGigs: Gig[];
  searchQuery: string;
  setGigs: (gigs: Gig[]) => void;
  setSearchQuery: (query: string) => void;
  addGig: (gig: Gig) => void;
  removeGig: (id: string) => void;
}

export const useGigStore = create<GigState>()(
  persist(
    (set) => ({
      gigs: [],
      filteredGigs: [],
      searchQuery: '',
      setGigs: (gigs) => set({ gigs, filteredGigs: gigs }),
      setSearchQuery: (query) => set((state) => ({
        searchQuery: query,
        filteredGigs: state.gigs.filter(gig => 
          gig.title.toLowerCase().includes(query.toLowerCase()) ||
          gig.category.toLowerCase().includes(query.toLowerCase())
        )
      })),
      addGig: (gig) => set((state) => ({ 
        gigs: [gig, ...state.gigs],
        filteredGigs: [gig, ...state.filteredGigs] 
      })),
      removeGig: (id) => set((state) => ({
        gigs: state.gigs.filter(g => g.id !== id),
        filteredGigs: state.filteredGigs.filter(g => g.id !== id),
      })),
    }),
    {
      name: 'jobex-gig-storage',
      partialize: (state) => ({ gigs: state.gigs, filteredGigs: state.filteredGigs }),
    }
  )
);
