import { Router } from 'express';
import { LedgerController } from '../controllers/ledgerController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', LedgerController.listLedger);

export default router;
