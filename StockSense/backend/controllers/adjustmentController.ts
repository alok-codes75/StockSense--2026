import { Response } from 'express';
import { getStore } from '../models/store.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { StockService } from '../services/stockService.js';

export class AdjustmentController {
  static async listAdjustments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = getStore();
      const { search = '', page = '1', limit = '20' } = req.query as Record<string, string>;

      let adjustments = store.adjustments.filter(a => {
        if (search) {
          const s = search.toLowerCase();
          const p = store.products.find(prod => prod._id === a.productId);
          const matchNum = a.adjustmentNumber.toLowerCase().includes(s);
          const matchReason = a.reason.toLowerCase().includes(s);
          const matchSku = p && p.sku.toLowerCase().includes(s);
          const matchName = p && p.name.toLowerCase().includes(s);
          if (!matchNum && !matchReason && !matchSku && !matchName) return false;
        }
        return true;
      });

      const enriched = adjustments.map(a => {
        const product = store.products.find(p => p._id === a.productId);
        const location = store.locations.find(l => l._id === a.locationId);
        const user = store.users.find(u => u._id === a.validatedBy);
        return {
          ...a,
          productSku: product ? product.sku : 'UNKNOWN',
          productName: product ? product.name : 'Unknown Product',
          locationCode: location ? location.code : 'UNKNOWN',
          locationName: location ? location.name : 'Unknown Location',
          validatedByName: user ? user.fullName : 'Inventory Specialist'
        };
      });

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 20);
      const total = enriched.length;
      const startIdx = (pageNum - 1) * limitNum;
      const paginated = enriched.slice(startIdx, startIdx + limitNum);

      res.status(200).json({
        success: true,
        data: paginated,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createAdjustment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { productId, locationId, countedQuantity, reason } = req.body;

      if (!productId || !locationId || countedQuantity === undefined || countedQuantity === null || !reason) {
        res.status(400).json({
          success: false,
          message: 'Product, location, counted physical quantity, and audit reason are required.'
        });
        return;
      }

      const adjustment = StockService.processAdjustment({
        productId,
        locationId,
        countedQuantity: Number(countedQuantity),
        reason: reason.trim(),
        user: {
          userId: req.user!.userId,
          fullName: req.user!.fullName
        }
      });

      res.status(201).json({
        success: true,
        message: `Inventory adjustment ${adjustment.adjustmentNumber} recorded. Stock updated by ${adjustment.difference >= 0 ? '+' : ''}${adjustment.difference}.`,
        data: adjustment
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}
