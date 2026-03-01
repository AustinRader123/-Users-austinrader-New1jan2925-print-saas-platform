import { Request, Response, NextFunction } from 'express';
import logger from '../logger.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Unhandled error:', err);
  const requestId = (req as any).id || (req as any).requestId;

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation error', details: err.message, requestId });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized', requestId });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message, requestId });
  }

  res.status(500).json({ error: 'Internal server error', requestId });
};
