import { Router } from 'express';
import authRoutes from './auth.routes';
import alertRoutes from './alert.routes';
import auditRoutes from './audit.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'shesecure-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount modules under /api/v1
router.use('/auth', authRoutes);
router.use('/alerts', alertRoutes);
router.use('/audit', auditRoutes);

export default router;
