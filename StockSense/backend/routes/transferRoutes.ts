import { Router } from 'express';
import { TransferController } from '../controllers/transferController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', TransferController.listTransfers);
router.post('/', TransferController.executeTransfer);

export default router;
