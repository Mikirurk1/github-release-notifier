import { Request, Response } from 'express';
import { subscriptionService } from '@/services/subscriptionService';

export const subscriptionController = {
  async create(req: Request, res: Response): Promise<void> {
    const subscription = await subscriptionService.createSubscription(req.body);
    res.status(201).json(subscription);
  },
};
