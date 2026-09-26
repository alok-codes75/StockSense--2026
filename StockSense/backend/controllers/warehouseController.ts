import { Response } from 'express';
import { getStore, saveStore } from '../models/store.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { IWarehouse, ILocation } from '../models/types.js';

export class WarehouseController {
  static async listWarehouses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = getStore();

      const enriched = store.warehouses.map(wh => {
        const locations = store.locations.filter(l => l.warehouseId === wh._id);
        const locIds = locations.map(l => l._id);
        const totalStockUnits = store.stockBalances
          .filter(sb => locIds.includes(sb.locationId))
          .reduce((sum, sb) => sum + sb.quantity, 0);

        return {
          ...wh,
          locationsCount: locations.length,
          totalStockUnits,
          locations
        };
      });

      res.status(200).json({ success: true, data: enriched });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createWarehouse(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { code, name, address, city, contactEmail, contactPhone } = req.body;
      if (!code || !name) {
        res.status(400).json({ success: false, message: 'Warehouse code and name are required.' });
        return;
      }

      const store = getStore();
      const upperCode = code.toUpperCase().trim();
      if (store.warehouses.some(w => w.code === upperCode)) {
        res.status(409).json({ success: false, message: `Warehouse code ${upperCode} already exists.` });
        return;
      }

      const newWh: IWarehouse = {
        _id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        code: upperCode,
        name: name.trim(),
        address: address ? address.trim() : '',
        city: city ? city.trim() : '',
        contactEmail: contactEmail ? contactEmail.trim() : '',
        contactPhone: contactPhone ? contactPhone.trim() : '',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      store.warehouses.push(newWh);
      saveStore();

      res.status(201).json({ success: true, message: 'Warehouse created.', data: newWh });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async listLocations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = getStore();
      const { warehouseId } = req.query as { warehouseId?: string };

      let locations = store.locations;
      if (warehouseId) {
        locations = locations.filter(l => l.warehouseId === warehouseId);
      }

      const enriched = locations.map(loc => {
        const wh = store.warehouses.find(w => w._id === loc.warehouseId);
        const balances = store.stockBalances.filter(sb => sb.locationId === loc._id);
        const totalItemsInLocation = balances.reduce((sum, sb) => sum + sb.quantity, 0);

        return {
          ...loc,
          warehouseCode: wh ? wh.code : 'UNKNOWN',
          warehouseName: wh ? wh.name : 'Unknown Warehouse',
          totalItemsInLocation,
          distinctProductsCount: balances.filter(sb => sb.quantity > 0).length
        };
      });

      res.status(200).json({ success: true, data: enriched });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { warehouseId, code, name, zone, aisle, shelf, capacity } = req.body;
      if (!warehouseId || !code || !name || !zone) {
        res.status(400).json({ success: false, message: 'Warehouse ID, code, name, and zone are required.' });
        return;
      }

      const store = getStore();
      const wh = store.warehouses.find(w => w._id === warehouseId);
      if (!wh) {
        res.status(404).json({ success: false, message: 'Specified warehouse not found.' });
        return;
      }

      const upperCode = code.toUpperCase().trim();
      const exists = store.locations.some(l => l.warehouseId === warehouseId && l.code === upperCode);
      if (exists) {
        res.status(409).json({ success: false, message: `Location code ${upperCode} already exists in this warehouse.` });
        return;
      }

      const newLoc: ILocation = {
        _id: `loc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        warehouseId,
        code: upperCode,
        name: name.trim(),
        zone: zone.trim(),
        aisle: aisle ? aisle.trim() : '',
        shelf: shelf ? shelf.trim() : '',
        capacity: Number(capacity) || 1000,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      store.locations.push(newLoc);
      saveStore();

      res.status(201).json({ success: true, message: 'Location created successfully.', data: newLoc });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const store = getStore();
      const loc = store.locations.find(l => l._id === id);

      if (!loc) {
        res.status(404).json({ success: false, message: 'Location not found.' });
        return;
      }

      // Safety check: Prevent deletion if stock balance > 0
      const activeBalance = store.stockBalances.find(sb => sb.locationId === id && sb.quantity > 0);
      if (activeBalance) {
        res.status(400).json({
          success: false,
          message: `Cannot delete location "${loc.code}". Location currently holds ${activeBalance.quantity} units of stock. Please transfer or adjust stock first.`
        });
        return;
      }

      // Check if referenced in historical ledger
      const hasHistory = store.stockLedger.some(l => l.locationId === id);
      if (hasHistory) {
        // Soft delete / deactivate to preserve historical integrity
        loc.isActive = false;
        saveStore();
        res.status(200).json({
          success: true,
          message: `Location "${loc.code}" has historical audit movements; it has been deactivated rather than deleted to preserve ledger integrity.`
        });
        return;
      }

      // If no history and no stock, safe hard delete
      store.locations = store.locations.filter(l => l._id !== id);
      store.stockBalances = store.stockBalances.filter(sb => sb.locationId !== id);
      saveStore();

      res.status(200).json({ success: true, message: `Location "${loc.code}" deleted.` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
