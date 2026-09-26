import { Response } from 'express';
import { getStore } from '../models/store.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { StockService } from '../services/stockService.js';

export class DashboardController {
  static async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = getStore();
      const { warehouseId, category } = req.query as { warehouseId?: string; category?: string };

      // Filter products by category
      let activeProducts = store.products.filter(p => !p.isArchived && p.isActive);
      if (category && category !== 'ALL') {
        activeProducts = activeProducts.filter(p => p.category === category);
      }

      // Warehouse filter on locations
      let validLocationIds: string[] | null = null;
      if (warehouseId && warehouseId !== 'ALL') {
        const whLocations = store.locations.filter(l => l.warehouseId === warehouseId);
        validLocationIds = whLocations.map(l => l._id);
      }

      let totalStockQuantity = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      const lowStockAlerts: any[] = [];

      for (const p of activeProducts) {
        let balances = store.stockBalances.filter(sb => sb.productId === p._id);
        if (validLocationIds) {
          balances = balances.filter(sb => validLocationIds!.includes(sb.locationId));
        }

        const totalQty = balances.reduce((sum, b) => sum + b.quantity, 0);
        totalStockQuantity += totalQty;

        if (totalQty === 0) {
          outOfStockCount++;
          lowStockAlerts.push({
            productId: p._id,
            sku: p.sku,
            name: p.name,
            category: p.category,
            currentStock: totalQty,
            reorderThreshold: p.reorderThreshold,
            status: 'OUT_OF_STOCK',
            unitOfMeasure: p.unitOfMeasure
          });
        } else if (totalQty <= p.reorderThreshold) {
          lowStockCount++;
          lowStockAlerts.push({
            productId: p._id,
            sku: p.sku,
            name: p.name,
            category: p.category,
            currentStock: totalQty,
            reorderThreshold: p.reorderThreshold,
            status: 'LOW_STOCK',
            unitOfMeasure: p.unitOfMeasure
          });
        }
      }

      // Pending Receipts (READY or DRAFT)
      let pendingReceipts = store.receipts.filter(r => r.status === 'READY' || r.status === 'DRAFT');
      if (validLocationIds) {
        pendingReceipts = pendingReceipts.filter(r => validLocationIds!.includes(r.destinationLocationId));
      }

      // Pending Deliveries (READY or DRAFT)
      let pendingDeliveries = store.deliveries.filter(d => d.status === 'READY' || d.status === 'DRAFT');
      if (validLocationIds) {
        pendingDeliveries = pendingDeliveries.filter(d => validLocationIds!.includes(d.sourceLocationId));
      }

      // Transfers
      const pendingTransfers = store.transfers.filter(t => t.status === 'READY' || t.status === 'DRAFT');

      // Recent Stock Movements (latest 8 from ledger)
      let recentMovements = store.stockLedger;
      if (validLocationIds) {
        recentMovements = recentMovements.filter(m => validLocationIds!.includes(m.locationId));
      }
      const topMovements = recentMovements.slice(0, 8);

      res.status(200).json({
        success: true,
        data: {
          kpis: {
            distinctProducts: activeProducts.length,
            totalStockQuantity,
            lowStockCount,
            outOfStockCount,
            pendingReceiptsCount: pendingReceipts.length,
            pendingDeliveriesCount: pendingDeliveries.length,
            scheduledTransfersCount: pendingTransfers.length,
            totalLedgerMovements: store.stockLedger.length
          },
          lowStockAlerts: lowStockAlerts.slice(0, 6),
          recentMovements: topMovements,
          meta: {
            warehousesCount: store.warehouses.length,
            locationsCount: store.locations.length
          }
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getLowStockAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = getStore();
      const activeProducts = store.products.filter(p => !p.isArchived && p.isActive);

      const alerts: any[] = [];
      for (const p of activeProducts) {
        const stock = StockService.getProductTotalStock(p._id);
        if (stock.onHand <= p.reorderThreshold) {
          const balances = store.stockBalances
            .filter(sb => sb.productId === p._id && sb.quantity > 0)
            .map(sb => {
              const loc = store.locations.find(l => l._id === sb.locationId);
              return {
                locationCode: loc ? loc.code : 'UNKNOWN',
                quantity: sb.quantity
              };
            });

          alerts.push({
            productId: p._id,
            sku: p.sku,
            name: p.name,
            category: p.category,
            currentStock: stock.onHand,
            reorderThreshold: p.reorderThreshold,
            deficit: Math.max(0, p.reorderThreshold - stock.onHand),
            suggestedOrderQty: Math.max(p.reorderThreshold * 2, 50),
            unitOfMeasure: p.unitOfMeasure,
            status: stock.onHand === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
            locationBreakdown: balances
          });
        }
      }

      res.status(200).json({ success: true, data: alerts });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
