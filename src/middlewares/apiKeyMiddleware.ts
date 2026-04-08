import { NextFunction, Request, Response } from 'express';
import { env } from '@/config/env';
import { UnauthorizedError } from '@/utils/errors';

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!env.apiKey) {
    next();
    return;
  }

  const apiKey = req.header('x-api-key');
  if (apiKey !== env.apiKey) {
    next(new UnauthorizedError());
    return;
  }

  next();
};
