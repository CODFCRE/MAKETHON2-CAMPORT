export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  file_url?: string;
  created_at: string;
  isPending?: boolean;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message?: string;
  last_message_time?: string;
  updated_at?: string;
  unread_count?: number;
  other_user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    is_verified?: boolean;
  };
}
