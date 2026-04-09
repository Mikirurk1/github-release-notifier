import { NextFunction, Request, Response } from 'express';
import { env } from '@/config/env';
import { UnauthorizedError } from '@/utils/errors';

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!env.apiKey) {
    next();
    return;
  }

  const headerValue = req.header('x-api-key');
  const apiKey = headerValue?.trim() ?? '';
  if (!apiKey || apiKey !== env.apiKey) {
    next(new UnauthorizedError());
    return;
  }

  next();
};
