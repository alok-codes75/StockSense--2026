import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/me', authMiddleware, AuthController.getMe);
router.put('/profile', authMiddleware, AuthController.updateProfile);
router.post('/forgot-password', AuthController.requestPasswordResetOTP);
router.post('/reset-password', AuthController.resetPasswordWithOTP);

export default router;
