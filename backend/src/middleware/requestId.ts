import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithId extends Request {
  id: string;
  userId?: string;
  correlationId?: string;
}

export function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction) {
  // Generate or extract request ID
  req.id = req.headers['x-request-id'] as string || uuidv4();
  req.correlationId = req.headers['x-correlation-id'] as string || req.id;

  // Add to response headers for client to track
  res.setHeader('X-Request-ID', req.id);
  res.setHeader('X-Correlation-ID', req.correlationId);

  next();
}
