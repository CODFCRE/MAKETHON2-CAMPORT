import { useState, useEffect, useCallback } from 'react';
import { gigService } from '../../features/gigs/gigService';
import { useGigStore } from '../../store/useGigStore';
import type { GigCategory } from '../../types/gig';

export const useGigs = (category?: GigCategory) => {
  const { setGigs } = useGigStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchGigs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await gigService.getGigs(category);
      setGigs(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch gigs'));
    } finally {
      setIsLoading(false);
    }
  }, [category, setGigs]);

  useEffect(() => {
    fetchGigs();
  }, [fetchGigs]);

  return { isLoading, error, refresh: fetchGigs };
};
