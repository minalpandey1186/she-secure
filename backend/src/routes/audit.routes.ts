import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.get(
  '/',
  authenticateJwt,
  requireRole('ADMIN', 'OPERATOR', 'VIEWER'),
  auditController.getAuditLogs.bind(auditController)
);

router.get(
  '/alerts/:alertId',
  authenticateJwt,
  requireRole('ADMIN', 'OPERATOR', 'VIEWER'),
  auditController.getAlertAuditLogs.bind(auditController)
);

export default router;
