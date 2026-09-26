export type UserRole = 'INVENTORY_MANAGER' | 'WAREHOUSE_STAFF';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department?: string;
  isActive?: boolean;
}

export interface ProductStock {
  onHand: number;
  reserved: number;
  available: number;
}

export interface Product {
  _id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  costPrice: number;
  sellingPrice: number;
  reorderThreshold: number;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  stock?: ProductStock;
  statusLabel?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface LocationStock {
  balanceId: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  warehouseName: string;
  quantity: number;
  reservedQuantity: number;
}

export interface Warehouse {
  _id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
  locationsCount?: number;
  totalStockUnits?: number;
}

export interface Location {
  _id: string;
  warehouseId: string;
  warehouseCode?: string;
  warehouseName?: string;
  code: string;
  name: string;
  zone: string;
  aisle?: string;
  shelf?: string;
  capacity: number;
  isActive: boolean;
  totalItemsInLocation?: number;
  distinctProductsCount?: number;
}

export type DocumentStatus = 'DRAFT' | 'READY' | 'DONE' | 'CANCELLED';

export interface ReceiptItem {
  productId: string;
  productSku?: string;
  productName?: string;
  unitOfMeasure?: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity?: number;
  currentOnHand?: number;
}

export interface Receipt {
  _id: string;
  receiptNumber: string;
  supplierName: string;
  destinationLocationId: string;
  destinationLocationName?: string;
  warehouseName?: string;
  status: DocumentStatus;
  items: ReceiptItem[];
  notes?: string;
  totalItemsCount?: number;
  createdAt: string;
  validatedAt?: string;
  validatedBy?: string;
}

export interface DeliveryItem {
  productId: string;
  productSku?: string;
  productName?: string;
  unitOfMeasure?: string;
  quantity: number;
  shippedQuantity?: number;
  availableAtSource?: number;
  canFulfill?: boolean;
}

export interface Delivery {
  _id: string;
  deliveryNumber: string;
  customerName: string;
  sourceLocationId: string;
  sourceLocationName?: string;
  warehouseName?: string;
  status: DocumentStatus;
  items: DeliveryItem[];
  trackingNumber?: string;
  shippingAddress?: string;
  notes?: string;
  totalItemsCount?: number;
  hasSufficientStock?: boolean;
  createdAt: string;
  validatedAt?: string;
  validatedBy?: string;
}

export interface Transfer {
  _id: string;
  transferNumber: string;
  sourceLocationId: string;
  destinationLocationId: string;
  sourceLocationName?: string;
  destinationLocationName?: string;
  status: DocumentStatus;
  items: {
    productId: string;
    productSku?: string;
    productName?: string;
    quantity: number;
  }[];
  reason?: string;
  createdAt: string;
  validatedAt?: string;
}

export interface Adjustment {
  _id: string;
  adjustmentNumber: string;
  productId: string;
  productSku?: string;
  productName?: string;
  locationId: string;
  locationCode?: string;
  locationName?: string;
  systemQuantity: number;
  countedQuantity: number;
  difference: number;
  reason: string;
  createdAt: string;
  validatedByName?: string;
}

export interface StockLedgerEntry {
  _id: string;
  movementType: 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER_OUT' | 'INTERNAL_TRANSFER_IN' | 'INVENTORY_ADJUSTMENT' | 'INITIAL_BALANCE';
  productId: string;
  sku: string;
  productName: string;
  locationId: string;
  locationName: string;
  quantityChange: number;
  balanceAfter: number;
  referenceType: string;
  referenceNumber: string;
  reason?: string;
  performedBy: string;
  performedByName: string;
  createdAt: string;
}

export interface DashboardKPIs {
  distinctProducts: number;
  totalStockQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingReceiptsCount: number;
  pendingDeliveriesCount: number;
  scheduledTransfersCount: number;
  totalLedgerMovements: number;
}

export interface LowStockAlert {
  productId: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  reorderThreshold: number;
  deficit?: number;
  suggestedOrderQty?: number;
  unitOfMeasure: string;
  status: 'LOW_STOCK' | 'OUT_OF_STOCK';
  locationBreakdown?: { locationCode: string; quantity: number }[];
}
