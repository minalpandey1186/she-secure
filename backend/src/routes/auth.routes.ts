import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', authController.login.bind(authController));
router.get('/me', authenticateJwt, authController.getMe.bind(authController));

export default router;
