import { Response } from 'express';
import { getStore, saveStore } from '../models/store.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { StockService } from '../services/stockService.js';
import { IDelivery } from '../models/types.js';

export class DeliveryController {
  static async listDeliveries(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = getStore();
      const { status = 'ALL', search = '', page = '1', limit = '20' } = req.query as Record<string, string>;

      let deliveries = store.deliveries.filter(d => {
        if (status !== 'ALL' && d.status !== status) return false;
        if (search) {
          const s = search.toLowerCase();
          const matchNum = d.deliveryNumber.toLowerCase().includes(s);
          const matchCust = d.customerName.toLowerCase().includes(s);
          if (!matchNum && !matchCust) return false;
        }
        return true;
      });

      const enriched = deliveries.map(d => {
        const loc = store.locations.find(l => l._id === d.sourceLocationId);
        const wh = loc ? store.warehouses.find(w => w._id === loc.warehouseId) : null;
        const totalItemsCount = d.items.reduce((acc, it) => acc + it.quantity, 0);

        // Check if all items are currently available for this delivery
        let hasSufficientStock = true;
        for (const item of d.items) {
          const balance = store.stockBalances.find(
            sb => sb.productId === item.productId && sb.locationId === d.sourceLocationId
          );
          if (!balance || balance.quantity < item.quantity) {
            hasSufficientStock = false;
            break;
          }
        }

        return {
          ...d,
          sourceLocationName: loc ? `${loc.code} - ${loc.name}` : 'Unknown Location',
          warehouseName: wh ? wh.name : 'Unknown Warehouse',
          totalItemsCount,
          hasSufficientStock
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

  static async getDeliveryById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const store = getStore();
      const delivery = store.deliveries.find(d => d._id === id);

      if (!delivery) {
        res.status(404).json({ success: false, message: 'Delivery order not found.' });
        return;
      }

      const loc = store.locations.find(l => l._id === delivery.sourceLocationId);
      const wh = loc ? store.warehouses.find(w => w._id === loc.warehouseId) : null;

      const detailedItems = delivery.items.map(item => {
        const prod = store.products.find(p => p._id === item.productId);
        const balance = store.stockBalances.find(
          sb => sb.productId === item.productId && sb.locationId === delivery.sourceLocationId
        );
        const availableAtSource = balance ? balance.quantity : 0;
        return {
          ...item,
          productSku: prod ? prod.sku : 'UNKNOWN',
          productName: prod ? prod.name : 'Unknown Product',
          unitOfMeasure: prod ? prod.unitOfMeasure : 'UNIT',
          availableAtSource,
          canFulfill: availableAtSource >= item.quantity
        };
      });

      res.status(200).json({
        success: true,
        data: {
          ...delivery,
          sourceLocationName: loc ? `${loc.code} - ${loc.name}` : 'Unknown Location',
          warehouseName: wh ? wh.name : 'Unknown Warehouse',
          items: detailedItems
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createDelivery(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { customerName, sourceLocationId, items, shippingAddress, trackingNumber, notes } = req.body;

      if (!customerName || !sourceLocationId || !items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Customer name, source location, and at least one item line are required.'
        });
        return;
      }

      const store = getStore();
      const location = store.locations.find(l => l._id === sourceLocationId);
      if (!location) {
        res.status(400).json({ success: false, message: 'Invalid source location ID.' });
        return;
      }

      const deliveryNumber = `DEL-${new Date().getFullYear()}-${String(store.deliveries.length + 1).padStart(4, '0')}`;

      const newDelivery: IDelivery = {
        _id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        deliveryNumber,
        customerName: customerName.trim(),
        sourceLocationId,
        status: 'READY',
        items: items.map(it => ({
          productId: it.productId,
          quantity: Math.max(1, Number(it.quantity) || 1)
        })),
        shippingAddress: shippingAddress ? shippingAddress.trim() : '',
        trackingNumber: trackingNumber ? trackingNumber.trim() : '',
        notes: notes ? notes.trim() : '',
        createdAt: new Date().toISOString()
      };

      store.deliveries.unshift(newDelivery);
      saveStore();

      res.status(201).json({
        success: true,
        message: `Outbound delivery ${deliveryNumber} created.`,
        data: newDelivery
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async validateDelivery(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const validated = StockService.validateDelivery(id, user);

      res.status(200).json({
        success: true,
        message: `Delivery ${validated.deliveryNumber} validated and dispatched. Inventory deducted and stock ledger updated.`,
        data: validated
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async cancelDelivery(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const store = getStore();
      const delivery = store.deliveries.find(d => d._id === id);

      if (!delivery) {
        res.status(404).json({ success: false, message: 'Delivery not found.' });
        return;
      }

      if (delivery.status === 'DONE') {
        res.status(400).json({
          success: false,
          message: 'Cannot cancel an order that has already been validated and shipped.'
        });
        return;
      }

      delivery.status = 'CANCELLED';
      saveStore();

      res.status(200).json({
        success: true,
        message: `Delivery ${delivery.deliveryNumber} has been cancelled.`,
        data: delivery
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
