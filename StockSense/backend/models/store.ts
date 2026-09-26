import fs from 'fs';
import path from 'path';
import {
  IUser,
  IProduct,
  IWarehouse,
  ILocation,
  IStockBalance,
  IReceipt,
  IDelivery,
  ITransfer,
  IAdjustment,
  IStockLedger,
  IPasswordReset
} from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'StockSense/database/data');
const SEED_FILE = path.resolve(process.cwd(), 'StockSense/database/seed/seed_data.json');

export interface DatabaseState {
  users: IUser[];
  products: IProduct[];
  warehouses: IWarehouse[];
  locations: ILocation[];
  stockBalances: IStockBalance[];
  receipts: IReceipt[];
  deliveries: IDelivery[];
  transfers: ITransfer[];
  adjustments: IAdjustment[];
  stockLedger: IStockLedger[];
  passwordResets: IPasswordReset[];
}

let dbState: DatabaseState = {
  users: [],
  products: [],
  warehouses: [],
  locations: [],
  stockBalances: [],
  receipts: [],
  deliveries: [],
  transfers: [],
  adjustments: [],
  stockLedger: [],
  passwordResets: []
};

let isInitialized = false;

function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function initStore(): DatabaseState {
  if (isInitialized) return dbState;

  ensureDirectoryExists(DATA_DIR);
  const dataFilePath = path.join(DATA_DIR, 'db_state.json');

  if (fs.existsSync(dataFilePath)) {
    try {
      const raw = fs.readFileSync(dataFilePath, 'utf-8');
      dbState = JSON.parse(raw);
      isInitialized = true;
      return dbState;
    } catch (err) {
      console.error('Failed to load existing db_state.json, reseeding...', err);
    }
  }

  // Load from seed_data.json
  if (fs.existsSync(SEED_FILE)) {
    try {
      const seedRaw = fs.readFileSync(SEED_FILE, 'utf-8');
      const seed = JSON.parse(seedRaw);
      const now = new Date().toISOString();

      dbState.users = (seed.users || []).map((u: any) => ({
        _id: u.id,
        email: u.email,
        passwordHash: u.passwordHash,
        fullName: u.fullName,
        role: u.role,
        department: u.department,
        isActive: u.isActive,
        createdAt: now
      }));

      dbState.warehouses = (seed.warehouses || []).map((w: any) => ({
        _id: w.id,
        code: w.code,
        name: w.name,
        address: w.address,
        city: w.city,
        contactEmail: w.contactEmail,
        contactPhone: w.contactPhone,
        isActive: w.isActive,
        createdAt: now
      }));

      dbState.locations = (seed.locations || []).map((l: any) => ({
        _id: l.id,
        warehouseId: l.warehouseId,
        code: l.code,
        name: l.name,
        zone: l.zone,
        aisle: l.aisle,
        shelf: l.shelf,
        capacity: l.capacity,
        isActive: l.isActive,
        createdAt: now
      }));

      dbState.products = (seed.products || []).map((p: any) => ({
        _id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        category: p.category,
        unitOfMeasure: p.unitOfMeasure,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        reorderThreshold: p.reorderThreshold,
        isActive: p.isActive,
        isArchived: p.isArchived || false,
        createdAt: now
      }));

      dbState.stockBalances = (seed.stockBalances || []).map((sb: any, idx: number) => ({
        _id: `sb_${idx + 1}`,
        productId: sb.productId,
        locationId: sb.locationId,
        quantity: sb.quantity,
        reservedQuantity: sb.reservedQuantity || 0,
        updatedAt: now
      }));

      // Generate initial ledger entries from seed balances
      dbState.stockLedger = dbState.stockBalances.map((sb, idx) => {
        const prod = dbState.products.find(p => p._id === sb.productId);
        const loc = dbState.locations.find(l => l._id === sb.locationId);
        return {
          _id: `ldg_init_${idx + 1}`,
          movementType: 'INITIAL_BALANCE',
          productId: sb.productId,
          sku: prod ? prod.sku : 'SKU-UNKNOWN',
          productName: prod ? prod.name : 'Unknown Product',
          locationId: sb.locationId,
          locationName: loc ? `${loc.code} (${loc.name})` : 'Unknown Location',
          quantityChange: sb.quantity,
          balanceAfter: sb.quantity,
          referenceType: 'SEED',
          referenceNumber: `INIT-${String(idx + 1).padStart(4, '0')}`,
          reason: 'Initial system baseline stock load',
          performedBy: 'usr_mgr_001',
          performedByName: 'System Administrator (Sarah Jenkins)',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        };
      });

      // Sample Receipts
      dbState.receipts = [
        {
          _id: 'rec_001',
          receiptNumber: 'REC-2026-0001',
          supplierName: 'Apex Industrial Fasteners Ltd',
          destinationLocationId: 'loc_001',
          status: 'DONE',
          items: [
            { productId: 'prd_001', quantity: 50, unitPrice: 14.50, receivedQuantity: 50 }
          ],
          notes: 'Standard stock replenishment PO-9942',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          validatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          validatedBy: 'usr_mgr_001'
        },
        {
          _id: 'rec_002',
          receiptNumber: 'REC-2026-0002',
          supplierName: 'Global Power Systems Inc',
          destinationLocationId: 'loc_002',
          status: 'READY',
          items: [
            { productId: 'prd_002', quantity: 10, unitPrice: 380.00 }
          ],
          notes: 'Priority delivery for Q4 warehouse buffer',
          createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
        }
      ];

      // Sample Deliveries
      dbState.deliveries = [
        {
          _id: 'del_001',
          deliveryNumber: 'DEL-2026-0001',
          customerName: 'Meridian Manufacturing Corp',
          sourceLocationId: 'loc_001',
          status: 'DONE',
          items: [
            { productId: 'prd_001', quantity: 20, shippedQuantity: 20 }
          ],
          trackingNumber: 'TRK-FX-889021',
          shippingAddress: '450 Northside Road, Milwaukee, WI',
          notes: 'Expedited dock freight',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          validatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          validatedBy: 'usr_stf_001'
        },
        {
          _id: 'del_002',
          deliveryNumber: 'DEL-2026-0002',
          customerName: 'Vanguard Industrial Services',
          sourceLocationId: 'loc_001',
          status: 'READY',
          items: [
            { productId: 'prd_003', quantity: 15 }
          ],
          trackingNumber: 'TRK-UPS-11029',
          shippingAddress: '88 Commerce Blvd, Joliet, IL',
          notes: 'Standard ground delivery',
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
        }
      ];

      // Sample Transfers
      dbState.transfers = [
        {
          _id: 'trf_001',
          transferNumber: 'TRF-2026-0001',
          sourceLocationId: 'loc_001',
          destinationLocationId: 'loc_003',
          status: 'DONE',
          items: [
            { productId: 'prd_001', quantity: 30 }
          ],
          reason: 'Replenishing bulk reserve from pick zone',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          validatedAt: new Date(Date.now() - 86400000).toISOString(),
          validatedBy: 'usr_mgr_001'
        }
      ];

      saveStore();
    } catch (e) {
      console.error('Error seeding initial database data:', e);
    }
  }

  isInitialized = true;
  return dbState;
}

export function getStore(): DatabaseState {
  if (!isInitialized) {
    return initStore();
  }
  return dbState;
}

export function saveStore() {
  try {
    ensureDirectoryExists(DATA_DIR);
    const dataFilePath = path.join(DATA_DIR, 'db_state.json');
    fs.writeFileSync(dataFilePath, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db_state.json:', err);
  }
}

export function resetDatabase() {
  const dataFilePath = path.join(DATA_DIR, 'db_state.json');
  if (fs.existsSync(dataFilePath)) {
    fs.unlinkSync(dataFilePath);
  }
  isInitialized = false;
  return initStore();
}
