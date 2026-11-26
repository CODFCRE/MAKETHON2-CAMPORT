import { supabase } from '../../lib/supabaseClient';
import type { Story } from '../../types/story';

export const storyService = {
  async getStories(): Promise<Story[]> {
    // Fetch stories that haven't expired (24h)
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('stories')
      .select('*, profiles(full_name, avatar_url)')
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stories:', error);
      return [];
    }
    return (data as unknown) as Story[];
  },

  async createStory(userId: string, mediaUrl: string, mediaType: 'image' | 'video'): Promise<Story | null> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: userId,
        media_url: mediaUrl,
        media_type: mediaType,
        expires_at: expiresAt
      })
      .select('*, profiles(full_name, avatar_url)')
      .single();

    if (error) {
      console.error('Error creating story:', error);
      throw error;
    }
    return (data as unknown) as Story;
  }
};
