export interface ModerationResult {
  isSafe: boolean;
  message?: string;
  confidence?: number;
}

export interface SightengineResponse {
  status: 'success' | 'failure';
  request: {
    id: string;
    timestamp: number;
    operations: number;
  };
  nudity?: {
    sexual_activity: number;
    sexual_display: number;
    erotica: number;
    suggestive: number;
    none: number;
  };
  weapon?: number;
  alcohol?: number;
  drugs?: number;
  offensive?: {
    prob: number;
  };
  error?: {
    type: string;
    message: string;
    code: number;
  };
}
