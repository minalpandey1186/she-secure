import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));

    logger.warn('Request validation failed', { path: req.path, errors: formattedErrors });
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: formattedErrors
    });
    return;
  }

  // Handle Custom Application Errors
  if (err instanceof AppError) {
    logger.warn(`Handled application error: [${err.statusCode}] ${err.message}`, {
      path: req.path,
      method: req.method,
      statusCode: err.statusCode,
      details: err.details
    });

    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details ? { details: err.details } : {})
    });
    return;
  }

  // Handle Unexpected Unhandled Errors
  logger.error('Unhandled server exception', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message
  });
}
