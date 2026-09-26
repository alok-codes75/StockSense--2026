import { Response } from 'express';
import { getStore } from '../models/store.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export class LedgerController {
  static async listLedger(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = getStore();
      const {
        movementType = 'ALL',
        productId,
        locationId,
        search = '',
        startDate,
        endDate,
        page = '1',
        limit = '25'
      } = req.query as Record<string, string>;

      let records = store.stockLedger.filter(entry => {
        if (movementType !== 'ALL' && entry.movementType !== movementType) return false;
        if (productId && entry.productId !== productId) return false;
        if (locationId && entry.locationId !== locationId) return false;

        if (startDate) {
          const from = new Date(startDate).getTime();
          if (new Date(entry.createdAt).getTime() < from) return false;
        }

        if (endDate) {
          const to = new Date(endDate).getTime();
          if (new Date(entry.createdAt).getTime() > to) return false;
        }

        if (search) {
          const s = search.toLowerCase();
          const matchSku = entry.sku.toLowerCase().includes(s);
          const matchProd = entry.productName.toLowerCase().includes(s);
          const matchRef = entry.referenceNumber.toLowerCase().includes(s);
          const matchReason = entry.reason && entry.reason.toLowerCase().includes(s);
          const matchUser = entry.performedByName.toLowerCase().includes(s);
          if (!matchSku && !matchProd && !matchRef && !matchReason && !matchUser) return false;
        }

        return true;
      });

      // Sort by newest first
      records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 25);
      const total = records.length;
      const startIdx = (pageNum - 1) * limitNum;
      const paginated = records.slice(startIdx, startIdx + limitNum);

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
}
