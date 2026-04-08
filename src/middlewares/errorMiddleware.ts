import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { AppError } from '../utils/errors';

export const errorMiddleware = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  logger.error({ err }, 'Unhandled server error');
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
};
