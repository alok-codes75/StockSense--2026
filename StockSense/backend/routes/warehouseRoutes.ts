import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouseController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', WarehouseController.listWarehouses);
router.post('/', requireRole(['INVENTORY_MANAGER']), WarehouseController.createWarehouse);
router.get('/locations', WarehouseController.listLocations);
router.post('/locations', requireRole(['INVENTORY_MANAGER']), WarehouseController.createLocation);
router.delete('/locations/:id', requireRole(['INVENTORY_MANAGER']), WarehouseController.deleteLocation);

export default router;
