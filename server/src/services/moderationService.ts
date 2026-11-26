import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import type { ModerationResult, SightengineResponse } from '../types/moderation.js';

export const moderationService = {
  async checkMedia(filePath: string): Promise<ModerationResult> {
    const apiUser = process.env.SIGHTENGINE_API_USER;
    const apiSecret = process.env.SIGHTENGINE_API_SECRET;

    if (!apiUser || !apiSecret) {
      logger.warn('Sightengine credentials missing. Allowing media without moderation.');
      return { isSafe: true };
    }

    try {
      const form = new FormData();
      const fileBuffer = fs.readFileSync(filePath);
      const blob = new Blob([fileBuffer]);
      
      form.append('media', blob, path.basename(filePath));
      form.append('models', 'nudity-2.0,wad,offensive');
      form.append('api_user', apiUser);
      form.append('api_secret', apiSecret);

      const response = await fetch('https://api.sightengine.com/1.0/check.json', {
        method: 'POST',
        body: form
      });

      const data = (await response.json()) as SightengineResponse;

      if (data.status === 'failure') {
        const errorMsg = data.error?.message || 'External moderation API failed';
        logger.error(`Moderation API Failure: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Nudity Assessment
      if (data.nudity && (data.nudity.sexual_activity > 0.5 || data.nudity.sexual_display > 0.5)) {
        logger.security(`NSFW BLOCKED: Nudity detected in ${filePath}`, { nudity: data.nudity });
        return { 
          isSafe: false, 
          message: 'Upload blocked due to inappropriate content (Nudity detected)',
          confidence: Math.max(data.nudity.sexual_activity, data.nudity.sexual_display)
        };
      }

      // Offensive/WAD Assessment
      const isOffensive = (data.weapon || 0) > 0.5 || (data.alcohol || 0) > 0.8 || (data.drugs || 0) > 0.8;
      if (isOffensive) {
        logger.security(`RESTRICTED BLOCKED: Prohibited items detected in ${filePath}`, { 
          weapon: data.weapon, 
          alcohol: data.alcohol, 
          drugs: data.drugs 
        });
        return { 
          isSafe: false, 
          message: 'Upload blocked due to prohibited content (Weapon/Drugs detected)' 
        };
      }

      logger.info(`Media check passed for ${filePath}`);
      return { isSafe: true };

    } catch (error) {
      logger.error('Moderation Process Crash:', error);
      throw new Error('Critical failure in moderation processing');
    }
  }
};
