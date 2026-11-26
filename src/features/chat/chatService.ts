import { supabase } from '../../lib/supabaseClient';
import type { Message, Conversation } from '../../types/chat';
import { db } from '../../lib/db';

export const chatService = {
  async getConversations(userId: string): Promise<Conversation[]> {
    // 1. Get from IndexedDB first (fast)
    const cached = await db.conversations
      .where('user1_id').equals(userId)
      .or('user2_id').equals(userId)
      .sortBy('updated_at');
    
    // 2. Fetch from Supabase in background
    supabase
      .from('conversations')
      .select('*, user1:profiles!user1_id(*), user2:profiles!user2_id(*)') 
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (!error && data) {
          const mapped = (data as any[]).map(conv => ({
            ...conv,
            other_user: conv.user1_id === userId ? conv.user2 : conv.user1
          })) as Conversation[];
          
          // Update Cache
          await db.conversations.bulkPut(mapped);
        }
      });

    // Return cached immediately, then the UI will update when the store/state changes if needed
    // For now, we return cached if available, otherwise wait for network
    return cached.length > 0 ? cached.reverse() : [];
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    // 1. Get from cache
    const cached = await db.messages
      .where('conversation_id')
      .equals(conversationId)
      .sortBy('created_at');

    // 2. Background sync
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(async ({ data, error }) => {
        if (!error && data) {
          await db.messages.bulkPut(data as Message[]);
        }
      });

    return cached;
  },

  async sendMessage(message: Partial<Message>): Promise<Message | null> {
    const isOnline = navigator.onLine;

    if (!isOnline) {
      // Save to pending queue
      await db.pendingMessages.add({
        ...message,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select()
        .single();
      
      if (error) throw error;
      
      const savedMsg = data as Message;
      await db.messages.put(savedMsg);

      // Update the conversation's last message locally
      if (message.conversation_id) {
        await db.conversations.update(message.conversation_id, {
          last_message: message.content,
          updated_at: new Date().toISOString()
        });

        // Background update in Supabase
        supabase
          .from('conversations')
          .update({ 
            last_message: message.content,
            updated_at: new Date().toISOString()
          })
          .eq('id', message.conversation_id);
      }
      
      return savedMsg;
    } catch (err) {
      // If server error, save to pending
      await db.pendingMessages.add({
        ...message,
        status: 'failed',
        created_at: new Date().toISOString()
      });
      throw err;
    }
  },

  async syncPendingMessages() {
    if (!navigator.onLine) return;

    const pending = await db.pendingMessages.toArray();
    if (pending.length === 0) return;

    for (const msg of pending) {
      try {
        const { status, ...cleanMsg } = msg;
        const { data, error } = await supabase
          .from('messages')
          .insert(cleanMsg)
          .select()
          .single();

        if (!error && data) {
          await db.messages.put(data as Message);
          await db.pendingMessages.delete((msg as any).localId);
        }
      } catch (err) {
        console.error('Failed to sync message:', err);
      }
    }
  },

  async getOrCreateConversation(user1Id: string, user2Id: string): Promise<Conversation> {
    // 1. Check Cache
    const cached = await db.conversations
      .where('user1_id').equals(user1Id).and(c => c.user2_id === user2Id)
      .or('user1_id').equals(user2Id).and(c => c.user2_id === user1Id)
      .first();

    if (cached) return cached;

    // 2. Check Supabase
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
      .single();

    if (existing) {
      await db.conversations.put(existing as Conversation);
      return existing as Conversation;
    }

    // 3. Create new
    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) throw createError;
    const newConv = created as Conversation;
    await db.conversations.put(newConv);
    return newConv;
  },

  subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    const channel = supabase.channel(`room-${conversationId}`);
    
    return channel
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        const msg = payload.new as Message;
        await db.messages.put(msg); // Cache real-time messages
        callback(msg);
      })
      .subscribe();
  }
};

// Global network listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    chatService.syncPendingMessages();
  });
}
