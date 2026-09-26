import { Router } from 'express';
import { AdjustmentController } from '../controllers/adjustmentController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', AdjustmentController.listAdjustments);
router.post('/', requireRole(['INVENTORY_MANAGER']), AdjustmentController.createAdjustment);

export default router;
