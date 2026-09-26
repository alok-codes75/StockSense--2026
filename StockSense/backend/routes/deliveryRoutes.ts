import { Router } from 'express';
import { DeliveryController } from '../controllers/deliveryController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', DeliveryController.listDeliveries);
router.get('/:id', DeliveryController.getDeliveryById);
router.post('/', DeliveryController.createDelivery);
router.post('/:id/validate', DeliveryController.validateDelivery);
router.post('/:id/cancel', DeliveryController.cancelDelivery);

export default router;
