import { supabase } from '../lib/supabaseClient';

export interface UploadResponse {
  success: boolean;
  message?: string;
  url?: string;
}

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

export const uploadMedia = async (file: File): Promise<UploadResponse> => {
  try {
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return {
        success: false,
        message: 'File is too large. Max size is 50MB.',
      };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData.session?.user;

    if (!authUser) {
      return {
        success: false,
        message: 'Please sign in before uploading media.',
      };
    }

    const fileExt = file.name.split('.').pop() || 'bin';
    const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${Date.now()}-${sanitizedName || `media.${fileExt}`}`;
    const filePath = `${authUser.id}/gig-media/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('gigs')
      .upload(filePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        message: uploadError.message || 'Upload failed while storing media.',
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from('gigs')
      .getPublicUrl(filePath);

    return {
      success: true,
      message: 'File uploaded successfully.',
      url: publicUrlData.publicUrl,
    };
  } catch (error) {
    console.error('Frontend upload error:', error);
    return {
      success: false,
      message: 'Failed to upload file. Please try again.',
    };
  }
};
