import { Request, Response } from 'express';
import { subscriptionService } from '@/services/subscriptionService';

export const subscriptionController = {
  async create(req: Request, res: Response): Promise<void> {
    const { subscription, alreadySubscribed } = await subscriptionService.createSubscription(req.body);
    res.status(alreadySubscribed ? 200 : 201).json({
      ...subscription,
      alreadySubscribed,
    });
  },
};
