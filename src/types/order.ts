export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  IN_PROGRESS = 'in_progress',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed'
}

export enum TransactionType {
  PAYOUT = 'payout',
  DEPOSIT = 'deposit',
  PAYMENT = 'payment',
  WITHDRAWAL = 'withdrawal'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  gig_id: string;
  amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_intent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  order_id?: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  created_at: string;
}
