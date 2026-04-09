import { Request, Response } from 'express';
import { logger } from '@/config/logger';
import { unsubscribePages } from '@/http/unsubscribeHtml';
import { unsubscribeByToken } from '@/services/unsubscribeService';

export const unsubscribeController = {
  async get(req: Request, res: Response): Promise<void> {
    try {
      const result = await unsubscribeByToken(req.params.token);

      if (!result.ok) {
        if (result.reason === 'malformed_token') {
          res.status(400).type('html').send(unsubscribePages.malformedToken());
          return;
        }
        res.status(404).type('html').send(unsubscribePages.unknownToken());
        return;
      }

      res.status(200).type('html').send(unsubscribePages.success(result.email, result.repo));
    } catch (err) {
      logger.error({ err }, 'Unsubscribe request failed');
      res.status(500).type('html').send(unsubscribePages.serverError());
    }
  },
};
