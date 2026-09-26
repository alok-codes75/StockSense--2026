export type UserRole = 'INVENTORY_MANAGER' | 'WAREHOUSE_STAFF';

export interface IUser {
  _id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface IProduct {
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
  updatedAt?: string;
}

export interface IWarehouse {
  _id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
  createdAt: string;
}

export interface ILocation {
  _id: string;
  warehouseId: string;
  code: string;
  name: string;
  zone: string;
  aisle?: string;
  shelf?: string;
  capacity: number;
  isActive: boolean;
  createdAt: string;
}

export interface IStockBalance {
  _id: string;
  productId: string;
  locationId: string;
  quantity: number;
  reservedQuantity: number;
  updatedAt: string;
}

export type DocumentStatus = 'DRAFT' | 'READY' | 'DONE' | 'CANCELLED';

export interface IReceiptItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity?: number;
}

export interface IReceipt {
  _id: string;
  receiptNumber: string;
  supplierName: string;
  destinationLocationId: string;
  status: DocumentStatus;
  items: IReceiptItem[];
  notes?: string;
  createdAt: string;
  validatedAt?: string;
  validatedBy?: string;
}

export interface IDeliveryItem {
  productId: string;
  quantity: number;
  shippedQuantity?: number;
}

export interface IDelivery {
  _id: string;
  deliveryNumber: string;
  customerName: string;
  sourceLocationId: string;
  status: DocumentStatus;
  items: IDeliveryItem[];
  trackingNumber?: string;
  shippingAddress?: string;
  notes?: string;
  createdAt: string;
  validatedAt?: string;
  validatedBy?: string;
}

export interface ITransfer {
  _id: string;
  transferNumber: string;
  sourceLocationId: string;
  destinationLocationId: string;
  status: DocumentStatus;
  items: {
    productId: string;
    quantity: number;
  }[];
  reason?: string;
  createdAt: string;
  validatedAt?: string;
  validatedBy?: string;
}

export interface IAdjustment {
  _id: string;
  adjustmentNumber: string;
  productId: string;
  locationId: string;
  systemQuantity: number;
  countedQuantity: number;
  difference: number;
  reason: string;
  createdAt: string;
  validatedBy: string;
}

export type MovementType =
  | 'RECEIPT'
  | 'DELIVERY'
  | 'INTERNAL_TRANSFER_OUT'
  | 'INTERNAL_TRANSFER_IN'
  | 'INVENTORY_ADJUSTMENT'
  | 'INITIAL_BALANCE';

export interface IStockLedger {
  _id: string;
  movementType: MovementType;
  productId: string;
  sku: string;
  productName: string;
  locationId: string;
  locationName: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
  quantityChange: number;
  balanceAfter: number;
  referenceType: 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT' | 'SEED';
  referenceNumber: string;
  reason?: string;
  performedBy: string;
  performedByName: string;
  createdAt: string;
}

export interface IPasswordReset {
  _id: string;
  email: string;
  otpHash: string;
  attempts: number;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}
