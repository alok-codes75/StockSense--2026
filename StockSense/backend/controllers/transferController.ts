import { Response } from 'express';
import { getStore } from '../models/store.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { StockService } from '../services/stockService.js';

export class TransferController {
  static async listTransfers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = getStore();
      const { search = '', page = '1', limit = '20' } = req.query as Record<string, string>;

      let transfers = store.transfers.filter(t => {
        if (search) {
          const s = search.toLowerCase();
          return t.transferNumber.toLowerCase().includes(s) || (t.reason && t.reason.toLowerCase().includes(s));
        }
        return true;
      });

      const enriched = transfers.map(t => {
        const srcLoc = store.locations.find(l => l._id === t.sourceLocationId);
        const destLoc = store.locations.find(l => l._id === t.destinationLocationId);
        const srcWh = srcLoc ? store.warehouses.find(w => w._id === srcLoc.warehouseId) : null;
        const destWh = destLoc ? store.warehouses.find(w => w._id === destLoc.warehouseId) : null;

        const detailedItems = t.items.map(it => {
          const prod = store.products.find(p => p._id === it.productId);
          return {
            ...it,
            productSku: prod ? prod.sku : 'UNKNOWN',
            productName: prod ? prod.name : 'Unknown Product'
          };
        });

        return {
          ...t,
          sourceLocationName: srcLoc ? `${srcLoc.code} (${srcWh?.name || ''})` : 'Unknown Source',
          destinationLocationName: destLoc ? `${destLoc.code} (${destWh?.name || ''})` : 'Unknown Destination',
          items: detailedItems
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

  static async executeTransfer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sourceLocationId, destinationLocationId, items, reason } = req.body;

      if (!sourceLocationId || !destinationLocationId || !items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Source location, destination location, and items are required.'
        });
        return;
      }

      const transfer = StockService.executeTransfer({
        sourceLocationId,
        destinationLocationId,
        items,
        reason,
        user: {
          userId: req.user!.userId,
          fullName: req.user!.fullName
        }
      });

      res.status(201).json({
        success: true,
        message: `Internal Transfer ${transfer.transferNumber} executed successfully.`,
        data: transfer
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}
