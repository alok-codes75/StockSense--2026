import { Response } from 'express';
import { getStore, saveStore } from '../models/store.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { StockService } from '../services/stockService.js';
import { IReceipt } from '../models/types.js';

export class ReceiptController {
  static async listReceipts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = getStore();
      const { status = 'ALL', search = '', page = '1', limit = '20' } = req.query as Record<string, string>;

      let receipts = store.receipts.filter(r => {
        if (status !== 'ALL' && r.status !== status) return false;
        if (search) {
          const s = search.toLowerCase();
          const matchNum = r.receiptNumber.toLowerCase().includes(s);
          const matchSup = r.supplierName.toLowerCase().includes(s);
          if (!matchNum && !matchSup) return false;
        }
        return true;
      });

      // Enrich with destination location & warehouse info
      const enriched = receipts.map(r => {
        const loc = store.locations.find(l => l._id === r.destinationLocationId);
        const wh = loc ? store.warehouses.find(w => w._id === loc.warehouseId) : null;
        const totalItemsCount = r.items.reduce((acc, it) => acc + it.quantity, 0);
        return {
          ...r,
          destinationLocationName: loc ? `${loc.code} - ${loc.name}` : 'Unknown Location',
          warehouseName: wh ? wh.name : 'Unknown Warehouse',
          totalItemsCount
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

  static async getReceiptById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const store = getStore();
      const receipt = store.receipts.find(r => r._id === id);

      if (!receipt) {
        res.status(404).json({ success: false, message: 'Receipt not found.' });
        return;
      }

      const loc = store.locations.find(l => l._id === receipt.destinationLocationId);
      const wh = loc ? store.warehouses.find(w => w._id === loc.warehouseId) : null;

      // Enrich line items with product names and current stock
      const detailedItems = receipt.items.map(item => {
        const prod = store.products.find(p => p._id === item.productId);
        const stock = prod ? StockService.getProductTotalStock(prod._id) : null;
        return {
          ...item,
          productSku: prod ? prod.sku : 'UNKNOWN',
          productName: prod ? prod.name : 'Unknown Product',
          unitOfMeasure: prod ? prod.unitOfMeasure : 'UNIT',
          currentOnHand: stock ? stock.onHand : 0
        };
      });

      res.status(200).json({
        success: true,
        data: {
          ...receipt,
          destinationLocationName: loc ? `${loc.code} - ${loc.name}` : 'Unknown Location',
          warehouseName: wh ? wh.name : 'Unknown Warehouse',
          items: detailedItems
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createReceipt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { supplierName, destinationLocationId, items, notes } = req.body;

      if (!supplierName || !destinationLocationId || !items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Supplier name, destination location, and at least one line item are required.'
        });
        return;
      }

      const store = getStore();
      const location = store.locations.find(l => l._id === destinationLocationId);
      if (!location) {
        res.status(400).json({ success: false, message: 'Invalid destination location ID specified.' });
        return;
      }

      const receiptNumber = `REC-${new Date().getFullYear()}-${String(store.receipts.length + 1).padStart(4, '0')}`;

      const newReceipt: IReceipt = {
        _id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        receiptNumber,
        supplierName: supplierName.trim(),
        destinationLocationId,
        status: 'READY',
        items: items.map(it => ({
          productId: it.productId,
          quantity: Math.max(1, Number(it.quantity) || 1),
          unitPrice: Number(it.unitPrice) || 0
        })),
        notes: notes ? notes.trim() : '',
        createdAt: new Date().toISOString()
      };

      store.receipts.unshift(newReceipt);
      saveStore();

      res.status(201).json({
        success: true,
        message: `Inbound receipt ${receiptNumber} created in READY status.`,
        data: newReceipt
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async validateReceipt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const validated = StockService.validateReceipt(id, user);

      res.status(200).json({
        success: true,
        message: `Receipt ${validated.receiptNumber} successfully validated. Stock balances increased and ledger entries recorded.`,
        data: validated
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async cancelReceipt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const store = getStore();
      const receipt = store.receipts.find(r => r._id === id);

      if (!receipt) {
        res.status(404).json({ success: false, message: 'Receipt not found.' });
        return;
      }

      if (receipt.status === 'DONE') {
        res.status(400).json({ success: false, message: 'Cannot cancel a receipt that has already been validated and added to stock.' });
        return;
      }

      receipt.status = 'CANCELLED';
      saveStore();

      res.status(200).json({
        success: true,
        message: `Receipt ${receipt.receiptNumber} marked as CANCELLED.`,
        data: receipt
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
