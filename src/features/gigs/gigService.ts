import { supabase } from '../../lib/supabaseClient';
import type { Gig, GigCategory } from '../../types/gig';

export const gigService = {
  async getGigs(category?: GigCategory): Promise<Gig[]> {
    let queryWithProfile = supabase
      .from('gigs')
      .select('*, profiles!seller_id(full_name, avatar_url, title)')
      .eq('status', 'active');

    if (category) {
      queryWithProfile = queryWithProfile.eq('category', category);
    }

    const { data, error } = await queryWithProfile.order('created_at', { ascending: false });
    if (!error) {
      return (data as unknown) as Gig[];
    }

    // Fallback: if relation/RLS around joined profile fails, fetch gig rows only.
    let fallbackQuery = supabase
      .from('gigs')
      .select('*')
      .eq('status', 'active');

    if (category) {
      fallbackQuery = fallbackQuery.eq('category', category);
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery.order('created_at', { ascending: false });
    if (fallbackError) throw fallbackError;
    return (fallbackData as unknown) as Gig[];
  },

  async getGigById(id: string): Promise<Gig> {
    const { data, error } = await supabase
      .from('gigs')
      .select('*, profiles!seller_id(full_name, avatar_url, title)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return (data as unknown) as Gig;
  },

  async createGig(gig: Partial<Gig>): Promise<Gig> {
    const { data, error } = await supabase
      .from('gigs')
      .insert(gig)
      .select()
      .single();

    if (error) throw error;
    return data as Gig;
  },

  async deleteGig(id: string): Promise<void> {
    const { error } = await supabase
      .from('gigs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async uploadMedia(file: File, path: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('gigs')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('gigs')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
