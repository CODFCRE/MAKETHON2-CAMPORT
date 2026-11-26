import Dexie, { type Table } from 'dexie';
import type { Message, Conversation } from '../types/chat';

export interface PendingMessage extends Partial<Message> {
  id?: string;
  status: 'pending' | 'syncing' | 'failed';
}

export class JobexDatabase extends Dexie {
  conversations!: Table<Conversation>;
  messages!: Table<Message>;
  pendingMessages!: Table<PendingMessage>;

  constructor() {
    super('JobexDB');
    this.version(1).stores({
      conversations: 'id, user1_id, user2_id, updated_at',
      messages: 'id, conversation_id, sender_id, created_at',
      pendingMessages: '++localId, conversation_id, sender_id'
    });
  }
}

export const db = new JobexDatabase();
