import { supabase } from '../../lib/supabaseClient';
import type { User } from '../../types/user';

const mapAuthUserToUser = (authUser: any): User => ({
  id: authUser.id,
  email: authUser.email ?? '',
  full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Member',
  avatar_url: authUser.user_metadata?.avatar_url || `https://picsum.photos/seed/${authUser.id}/200/200`,
  created_at: authUser.created_at || new Date().toISOString(),
});

export const authService = {
  async signInWithMagicLink(email: string) {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  },

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signUpWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    const authUser = session?.user;
    if (!authUser) return null;

    console.log('[AuthService] User found in Auth:', authUser.email);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      console.error('[AuthService] Profile fetch error:', error);
      // If profile doesn't exist, create it manually as a fallback to the DB trigger
      if (error.code === 'PGRST116') {
        const newProfile = {
          ...mapAuthUserToUser(authUser),
        };
        console.log('[AuthService] Creating missing profile:', newProfile.full_name);
        const { data: insertedData, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        
        if (insertError) {
          console.error('[AuthService] Profile creation failed:', insertError);
          return mapAuthUserToUser(authUser);
        }
        return insertedData as User;
      }
      // Keep session-based login alive even when profiles query fails transiently.
      return mapAuthUserToUser(authUser);
    }

    return data as User;
  },

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as User;
  },

  async searchUsers(query: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${query}%,title.ilike.%${query}%`)
      .limit(20);
    if (error) return [];
    return data as User[];
  },
};
