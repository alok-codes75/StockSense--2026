import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/summary', DashboardController.getSummary);
router.get('/alerts', DashboardController.getLowStockAlerts);

export default router;
