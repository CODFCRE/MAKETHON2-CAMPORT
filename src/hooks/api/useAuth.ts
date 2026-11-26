import { useEffect, useRef } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { useUserStore } from '../../store/useUserStore';
import type { User } from '../../types/user';

const mapSessionUserToUser = (authUser: SupabaseUser): User => ({
  id: authUser.id,
  email: authUser.email ?? '',
  full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Member',
  avatar_url: authUser.user_metadata?.avatar_url || `https://picsum.photos/seed/${authUser.id}/200/200`,
  created_at: authUser.created_at || new Date().toISOString(),
});

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
};

export const useAuth = () => {
  const { user, setUser, setLoading, isLoading } = useUserStore();
  const isInitialCheckDone = useRef(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const callbackError =
      queryParams.get('error_description') ??
      hashParams.get('error_description') ??
      queryParams.get('error') ??
      hashParams.get('error');
    if (callbackError) {
      console.error('[Auth] OAuth callback failed:', callbackError);
      toast.error(callbackError);
    }

    const hasSupabaseConfig = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
    if (!hasSupabaseConfig) {
      setUser(null);
      setLoading(false);
      isInitialCheckDone.current = true;
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const initAuth = async (supabase: typeof import('../../lib/supabaseClient').supabase, authService: typeof import('../../features/auth/authService').authService) => {
      if (isInitialCheckDone.current) return;
      try {
        console.log('[Auth] Running initial session sync...');
        setLoading(true);

        // 1) Restore quickly from local persisted session.
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('[Auth] Session restore failed:', sessionError);
          toast.error(sessionError.message);
        }
        if (!session?.user) {
          console.log('[Auth] Initial sync: Guest mode');
          setUser(null);
          setLoading(false); // Unblock for guests
          return;
        }

        // Prevent blocking app startup on profiles query/network.
        const fallbackUser = mapSessionUserToUser(session.user);
        setUser(fallbackUser);
        setLoading(false); // Unblock UI immediately after session exists

        // 2) Try to enrich from profiles with timeout.
        try {
          const currentUser = await withTimeout(authService.getCurrentUser(), 8000);
          if (currentUser) {
            setUser(currentUser);
            console.log('[Auth] Initial sync found user:', currentUser.email);
          }
        } catch (profileErr) {
          console.warn('[Auth] Profile sync timed out/failed, using session user:', profileErr);
        }
        console.log('[Auth] Initial sync found session user:', fallbackUser.email);
      } catch (err) {
        console.error('[Auth] Sync failed:', err);
        setUser(null);
      } finally {
        setLoading(false);
        isInitialCheckDone.current = true;
      }
    };

    const initialize = async () => {
      try {
        const [{ supabase }, { authService }] = await Promise.all([
          import('../../lib/supabaseClient'),
          import('../../features/auth/authService'),
        ]);
        if (cancelled) return;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('[Auth] State Change Detected:', event);

          try {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
              if (session?.user) {
                const fallbackUser = mapSessionUserToUser(session.user);
                setUser(fallbackUser);
                if (event === 'SIGNED_IN') {
                  try {
                    const currentUser = await withTimeout(authService.getCurrentUser(), 8000);
                    if (currentUser) setUser(currentUser);
                  } catch {
                    // Keep the session user and skip noisy timeout logs on transient network issues.
                  }
                }
              } else {
                setUser(null);
              }
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
            }
          } finally {
            setLoading(false);
          }
        });
        unsubscribe = () => subscription.unsubscribe();
        await initAuth(supabase, authService);
      } catch (error) {
        console.error('[Auth] Initialization failed:', error);
        setUser(null);
        setLoading(false);
        isInitialCheckDone.current = true;
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [setUser, setLoading]);

  const signOut = async (): Promise<void> => {
    const { authService } = await import('../../features/auth/authService');
    await authService.signOut();
    setUser(null);
  };

  return { user, isLoading, signOut };
};
