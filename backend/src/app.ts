import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { apiRateLimiter } from './middleware/rate_limit.middleware';
import { errorHandler } from './middleware/error.middleware';
import routes from './routes';
import { logger } from './utils/logger';

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false
}));

// CORS Configuration
app.use(cors({
  origin: config.corsOrigin === '*' ? true : [config.corsOrigin, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Device-Id']
}));

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiter
app.use('/api', apiRateLimiter);

// Request Logging
app.use((req, _res, next) => {
  if (req.path !== '/api/v1/health') {
    logger.info(`HTTP ${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  }
  next();
});

// API Routes
app.use('/api/v1', routes);

// 404 Fallback
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint '${req.originalUrl}' not found`
  });
});

// Global Error Handler
app.use(errorHandler);

export { app };
