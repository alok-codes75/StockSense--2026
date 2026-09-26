import { Router } from 'express';
import { ReceiptController } from '../controllers/receiptController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', ReceiptController.listReceipts);
router.get('/:id', ReceiptController.getReceiptById);
router.post('/', ReceiptController.createReceipt);
router.post('/:id/validate', ReceiptController.validateReceipt);
router.post('/:id/cancel', ReceiptController.cancelReceipt);

export default router;
