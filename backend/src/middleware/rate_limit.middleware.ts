import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});

export const alertSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // allow up to 60 alert triggers/retries per min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Alert submission rate limit reached.'
  }
});
