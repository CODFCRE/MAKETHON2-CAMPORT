import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { moderationService } from '../services/moderationService.js';
import { deleteFile } from '../utils/fileHandler.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse, UploadData } from '../types/api.js';

const router = Router();
const upload = multer({ 
  dest: 'temp/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

router.post('/', upload.single('file'), async (req: Request, res: Response<ApiResponse<UploadData | null>>) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ 
      success: false, 
      message: 'No file provided for upload' 
    });
  }

  const filePath = file.path;

  try {
    logger.info(`Starting upload session for: ${file.originalname}`);

    // 1. Safety Check
    const moderation = await moderationService.checkMedia(filePath);

    if (!moderation.isSafe) {
      deleteFile(filePath);
      return res.status(403).json({ 
        success: false, 
        message: moderation.message || 'Content rejected' 
      });
    }

    // 2. Transmit to Storage
    const fileName = `safe-${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, fs.createReadStream(filePath), {
        contentType: file.mimetype,
        duplex: 'half'
      });

    if (uploadError) {
      logger.error('Supabase Storage Error:', uploadError);
      throw uploadError;
    }

    const publicUrl = supabase.storage.from('media').getPublicUrl(fileName).data.publicUrl;

    // 3. Finalize
    deleteFile(filePath);
    logger.info(`Successful upload completed: ${fileName}`);

    return res.json({ 
      success: true, 
      message: 'File successfully moderated and uploaded',
      data: {
        url: publicUrl,
        filename: fileName,
        mimetype: file.mimetype
      }
    });

  } catch (error: any) {
    logger.error('Upload Pipeline Failure:', error);
    deleteFile(filePath);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

export default router;
