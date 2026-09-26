import { Router } from 'express';
import { ProductController } from '../controllers/productController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', ProductController.listProducts);
router.get('/:id', ProductController.getProductById);
router.post('/', requireRole(['INVENTORY_MANAGER']), ProductController.createProduct);
router.put('/:id', requireRole(['INVENTORY_MANAGER']), ProductController.updateProduct);
router.post('/:id/archive', requireRole(['INVENTORY_MANAGER']), ProductController.archiveProduct);

export default router;
