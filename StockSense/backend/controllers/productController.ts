import { Response } from 'express';
import { getStore, saveStore } from '../models/store.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { StockService } from '../services/stockService.js';
import { IProduct } from '../models/types.js';

export class ProductController {
  static async listProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = getStore();
      const {
        search = '',
        category = 'ALL',
        stockStatus = 'ALL',
        page = '1',
        limit = '20',
        includeArchived = 'false'
      } = req.query as Record<string, string>;

      let items = store.products.filter(p => {
        if (includeArchived !== 'true' && p.isArchived) return false;
        if (category !== 'ALL' && p.category !== category) return false;
        if (search) {
          const s = search.toLowerCase();
          const matchSku = p.sku.toLowerCase().includes(s);
          const matchName = p.name.toLowerCase().includes(s);
          const matchCat = p.category.toLowerCase().includes(s);
          if (!matchSku && !matchName && !matchCat) return false;
        }
        return true;
      });

      // Enrich with stock calculation and apply stockStatus filter
      const enriched = items.map(p => {
        const stock = StockService.getProductTotalStock(p._id);
        const isOutOfStock = stock.onHand === 0;
        const isLowStock = stock.onHand > 0 && stock.onHand <= p.reorderThreshold;
        return {
          ...p,
          stock,
          statusLabel: isOutOfStock ? 'OUT_OF_STOCK' : isLowStock ? 'LOW_STOCK' : 'IN_STOCK'
        };
      });

      const filtered = enriched.filter(p => {
        if (stockStatus === 'OUT_OF_STOCK') return p.stock.onHand === 0;
        if (stockStatus === 'LOW_STOCK') return p.stock.onHand > 0 && p.stock.onHand <= p.reorderThreshold;
        if (stockStatus === 'IN_STOCK') return p.stock.onHand > p.reorderThreshold;
        return true;
      });

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 20);
      const total = filtered.length;
      const startIdx = (pageNum - 1) * limitNum;
      const paginated = filtered.slice(startIdx, startIdx + limitNum);

      // Distinct categories for filter dropdown
      const categories = Array.from(new Set(store.products.map(p => p.category))).sort();

      res.status(200).json({
        success: true,
        data: paginated,
        categories,
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

  static async getProductById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const store = getStore();
      const product = store.products.find(p => p._id === id);

      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found.' });
        return;
      }

      const stock = StockService.getProductTotalStock(product._id);
      // Location breakdown
      const locationBalances = store.stockBalances
        .filter(sb => sb.productId === product._id)
        .map(sb => {
          const loc = store.locations.find(l => l._id === sb.locationId);
          const wh = loc ? store.warehouses.find(w => w._id === loc.warehouseId) : null;
          return {
            balanceId: sb._id,
            locationId: sb.locationId,
            locationCode: loc ? loc.code : 'UNKNOWN',
            locationName: loc ? loc.name : 'Unknown Location',
            warehouseName: wh ? wh.name : 'Unknown Warehouse',
            quantity: sb.quantity,
            reservedQuantity: sb.reservedQuantity
          };
        });

      // Recent product movements from ledger
      const movements = store.stockLedger
        .filter(l => l.productId === product._id)
        .slice(0, 10);

      res.status(200).json({
        success: true,
        data: {
          ...product,
          stock,
          locations: locationBalances,
          recentMovements: movements
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        sku,
        name,
        description,
        category,
        unitOfMeasure,
        costPrice,
        sellingPrice,
        reorderThreshold,
        initialStock,
        initialLocationId
      } = req.body;

      if (!sku || !name || !category || !unitOfMeasure) {
        res.status(400).json({ success: false, message: 'SKU, name, category, and unit of measure are required.' });
        return;
      }

      const store = getStore();
      const trimmedSku = sku.toUpperCase().trim();
      const existing = store.products.find(p => p.sku === trimmedSku);
      if (existing) {
        res.status(409).json({ success: false, message: `Product with SKU "${trimmedSku}" already exists.` });
        return;
      }

      const newProduct: IProduct = {
        _id: `prd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sku: trimmedSku,
        name: name.trim(),
        description: description ? description.trim() : '',
        category: category.trim(),
        unitOfMeasure: unitOfMeasure.trim().toUpperCase(),
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        reorderThreshold: Math.max(0, Number(reorderThreshold) || 0),
        isActive: true,
        isArchived: false,
        createdAt: new Date().toISOString()
      };

      store.products.push(newProduct);

      // Handle optional initial stock setup
      if (initialStock && Number(initialStock) > 0 && initialLocationId) {
        const qty = Number(initialStock);
        const loc = store.locations.find(l => l._id === initialLocationId);
        if (loc) {
          const balance = StockService.getOrCreateBalance(newProduct._id, initialLocationId);
          balance.quantity = qty;
          balance.updatedAt = new Date().toISOString();

          StockService.logLedgerEntry({
            movementType: 'RECEIPT',
            productId: newProduct._id,
            locationId: initialLocationId,
            quantityChange: qty,
            balanceAfter: qty,
            referenceType: 'SEED',
            referenceNumber: `INIT-${newProduct.sku}`,
            reason: 'Initial product catalog creation stock count',
            performedBy: req.user!.userId,
            performedByName: req.user!.fullName
          });
        }
      }

      saveStore();

      res.status(201).json({
        success: true,
        message: 'Product catalog item created successfully.',
        data: newProduct
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        category,
        unitOfMeasure,
        costPrice,
        sellingPrice,
        reorderThreshold,
        isActive
      } = req.body;

      const store = getStore();
      const product = store.products.find(p => p._id === id);
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found.' });
        return;
      }

      if (name) product.name = name.trim();
      if (description !== undefined) product.description = description.trim();
      if (category) product.category = category.trim();
      if (unitOfMeasure) product.unitOfMeasure = unitOfMeasure.trim().toUpperCase();
      if (costPrice !== undefined) product.costPrice = Number(costPrice);
      if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
      if (reorderThreshold !== undefined) product.reorderThreshold = Math.max(0, Number(reorderThreshold));
      if (isActive !== undefined) product.isActive = Boolean(isActive);

      product.updatedAt = new Date().toISOString();
      saveStore();

      res.status(200).json({
        success: true,
        message: 'Product updated successfully.',
        data: product
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async archiveProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const store = getStore();
      const product = store.products.find(p => p._id === id);
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found.' });
        return;
      }

      // Preserve historical transactions while deactivating
      product.isArchived = true;
      product.isActive = false;
      product.updatedAt = new Date().toISOString();
      saveStore();

      res.status(200).json({
        success: true,
        message: `Product ${product.sku} has been archived. Historical stock and ledger records are fully preserved.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
