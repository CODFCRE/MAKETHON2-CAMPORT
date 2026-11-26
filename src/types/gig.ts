export enum GigCategory {
  GRAPHIC_DESIGN = 'Graphic Design',
  VIDEO_EDITING = 'Video Editing',
  DEVELOPMENT = 'Development',
  WRITING = 'Writing',
  VOICE_OVER = 'Voice Over'
}

export enum GigStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  DRAFT = 'draft'
}

export interface Gig {
  id: string;
  user_id: string;
  seller_id: string;
  title: string;
  description: string;
  category: GigCategory;
  price: number;
  delivery_time: string;
  revisions: number | 'Unlimited';
  thumbnail_url: string;
  video_url?: string;
  rating: number;
  review_count: number;
  is_verified: boolean;
  is_trending?: boolean;
  status: GigStatus;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
    title: string;
  };
}

export interface Review {
  id: string;
  gig_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url: string;
    title: string;
  };
}
