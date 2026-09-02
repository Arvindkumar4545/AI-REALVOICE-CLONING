import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/signup', authLimiter, AuthController.signup);
router.post('/signin', authLimiter, AuthController.signin);
router.post('/refresh', AuthController.refreshToken);
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);
router.post('/reset-password', authLimiter, AuthController.resetPassword);
router.get('/verify-email', AuthController.verifyEmail);
router.get('/me', authenticate, AuthController.me);

export default router;
