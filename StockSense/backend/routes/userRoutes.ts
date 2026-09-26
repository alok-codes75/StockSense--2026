import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', requireRole(['INVENTORY_MANAGER']), UserController.listUsers);
router.post('/', requireRole(['INVENTORY_MANAGER']), UserController.createUser);
router.patch('/:id/toggle-status', requireRole(['INVENTORY_MANAGER']), UserController.toggleUserStatus);
router.post('/reset-data', requireRole(['INVENTORY_MANAGER']), UserController.resetData);

export default router;
