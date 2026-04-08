import { Router } from 'express';
import { subscriptionController } from '@/controllers/subscriptionController';

const router = Router();

router.post('/subscriptions', subscriptionController.create);

export default router;
