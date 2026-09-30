import { Router } from 'express';
import multer from 'multer';
import { alertController } from '../controllers/alert.controller';
import { authenticateJwt, optionalAuthenticateJwt } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { alertSubmissionLimiter } from '../middleware/rate_limit.middleware';

const router = Router();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Standard Alert Ingestion (JSON or Stego Multipart)
router.post(
  '/',
  alertSubmissionLimiter,
  optionalAuthenticateJwt,
  upload.single('stegoImage'),
  alertController.createAlert.bind(alertController)
);

// SMS Gateway Webhook / Ingestion endpoint
router.post(
  '/sms',
  alertSubmissionLimiter,
  alertController.ingestSmsAlert.bind(alertController)
);

// Authority operations (protected by JWT & RBAC)
router.get(
  '/',
  authenticateJwt,
  requireRole('ADMIN', 'OPERATOR', 'VIEWER'),
  alertController.getAlerts.bind(alertController)
);

router.get(
  '/stats',
  authenticateJwt,
  requireRole('ADMIN', 'OPERATOR', 'VIEWER'),
  alertController.getAlertStats.bind(alertController)
);

router.get(
  '/:alertId',
  authenticateJwt,
  requireRole('ADMIN', 'OPERATOR', 'VIEWER'),
  alertController.getAlertById.bind(alertController)
);

router.post(
  '/:alertId/acknowledge',
  authenticateJwt,
  requireRole('ADMIN', 'OPERATOR'),
  alertController.acknowledgeAlert.bind(alertController)
);

router.patch(
  '/:alertId/status',
  authenticateJwt,
  requireRole('ADMIN', 'OPERATOR'),
  alertController.updateAlertStatus.bind(alertController)
);

export default router;
