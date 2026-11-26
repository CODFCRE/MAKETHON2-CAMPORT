export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface UploadData {
  url: string;
  filename: string;
  mimetype: string;
}
