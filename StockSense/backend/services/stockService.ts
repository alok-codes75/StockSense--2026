import { getStore, saveStore } from '../models/store.js';
import {
  IStockBalance,
  IStockLedger,
  IReceipt,
  IDelivery,
  ITransfer,
  IAdjustment,
  MovementType
} from '../models/types.js';

export class StockService {
  /**
   * Helper to fetch or create a stock balance record for a product and location.
   */
  static getOrCreateBalance(productId: string, locationId: string): IStockBalance {
    const store = getStore();
    let balance = store.stockBalances.find(
      sb => sb.productId === productId && sb.locationId === locationId
    );

    if (!balance) {
      balance = {
        _id: `sb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        productId,
        locationId,
        quantity: 0,
        reservedQuantity: 0,
        updatedAt: new Date().toISOString()
      };
      store.stockBalances.push(balance);
    }

    return balance;
  }

  /**
   * Checks if a location has sufficient stock for a product.
   */
  static checkAvailability(productId: string, locationId: string, requiredQuantity: number): boolean {
    const store = getStore();
    const balance = store.stockBalances.find(
      sb => sb.productId === productId && sb.locationId === locationId
    );
    if (!balance) return false;
    return balance.quantity >= requiredQuantity;
  }

  /**
   * Append an immutable audit record to the Stock Ledger.
   */
  static logLedgerEntry(entry: {
    movementType: MovementType;
    productId: string;
    locationId: string;
    sourceLocationId?: string;
    destinationLocationId?: string;
    quantityChange: number;
    balanceAfter: number;
    referenceType: 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT' | 'SEED';
    referenceNumber: string;
    reason?: string;
    performedBy: string;
    performedByName: string;
  }): IStockLedger {
    const store = getStore();
    const product = store.products.find(p => p._id === entry.productId);
    const location = store.locations.find(l => l._id === entry.locationId);

    const record: IStockLedger = {
      _id: `ldg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      movementType: entry.movementType,
      productId: entry.productId,
      sku: product ? product.sku : 'SKU-UNKNOWN',
      productName: product ? product.name : 'Unknown Product',
      locationId: entry.locationId,
      locationName: location ? `${location.code} (${location.name})` : 'Unknown Location',
      sourceLocationId: entry.sourceLocationId,
      destinationLocationId: entry.destinationLocationId,
      quantityChange: entry.quantityChange,
      balanceAfter: entry.balanceAfter,
      referenceType: entry.referenceType,
      referenceNumber: entry.referenceNumber,
      reason: entry.reason,
      performedBy: entry.performedBy,
      performedByName: entry.performedByName,
      createdAt: new Date().toISOString()
    };

    store.stockLedger.unshift(record);
    return record;
  }

  /**
   * Validate an Inbound Receipt:
   * Increases inventory for each line item and records ledger transactions.
   * Prevents double-validation.
   */
  static validateReceipt(receiptId: string, user: { userId: string; fullName: string }): IReceipt {
    const store = getStore();
    const receipt = store.receipts.find(r => r._id === receiptId);

    if (!receipt) {
      throw new Error(`Receipt not found: ${receiptId}`);
    }

    if (receipt.status === 'DONE') {
      throw new Error('This receipt has already been validated and processed.');
    }

    if (receipt.status === 'CANCELLED') {
      throw new Error('Cannot validate a cancelled receipt.');
    }

    if (!receipt.items || receipt.items.length === 0) {
      throw new Error('Receipt must contain at least one line item to validate.');
    }

    // Atomic update of stock balances and ledger logging
    for (const item of receipt.items) {
      if (item.quantity <= 0) {
        throw new Error(`Line quantity must be greater than 0 for product ${item.productId}`);
      }

      const balance = this.getOrCreateBalance(item.productId, receipt.destinationLocationId);
      balance.quantity += item.quantity;
      balance.updatedAt = new Date().toISOString();
      item.receivedQuantity = item.quantity;

      this.logLedgerEntry({
        movementType: 'RECEIPT',
        productId: item.productId,
        locationId: receipt.destinationLocationId,
        quantityChange: item.quantity,
        balanceAfter: balance.quantity,
        referenceType: 'RECEIPT',
        referenceNumber: receipt.receiptNumber,
        reason: receipt.notes || `Inbound receipt from ${receipt.supplierName}`,
        performedBy: user.userId,
        performedByName: user.fullName
      });
    }

    receipt.status = 'DONE';
    receipt.validatedAt = new Date().toISOString();
    receipt.validatedBy = user.userId;

    saveStore();
    return receipt;
  }

  /**
   * Validate an Outbound Delivery:
   * Validates stock sufficiency, deducts inventory, and records ledger entries.
   * Prevents negative inventory and duplicate execution.
   */
  static validateDelivery(deliveryId: string, user: { userId: string; fullName: string }): IDelivery {
    const store = getStore();
    const delivery = store.deliveries.find(d => d._id === deliveryId);

    if (!delivery) {
      throw new Error(`Delivery not found: ${deliveryId}`);
    }

    if (delivery.status === 'DONE') {
      throw new Error('This delivery order has already been validated and shipped.');
    }

    if (delivery.status === 'CANCELLED') {
      throw new Error('Cannot validate a cancelled delivery.');
    }

    if (!delivery.items || delivery.items.length === 0) {
      throw new Error('Delivery must contain at least one line item to validate.');
    }

    // Pre-flight check: ensure sufficient stock exists for ALL line items before modifying any
    for (const item of delivery.items) {
      const balance = store.stockBalances.find(
        sb => sb.productId === item.productId && sb.locationId === delivery.sourceLocationId
      );
      const available = balance ? balance.quantity : 0;
      const product = store.products.find(p => p._id === item.productId);
      const prodName = product ? `${product.name} (${product.sku})` : item.productId;

      if (available < item.quantity) {
        throw new Error(
          `Insufficient stock for "${prodName}". Required: ${item.quantity}, Available at location: ${available}. Validation aborted.`
        );
      }
    }

    // Atomic deductions
    for (const item of delivery.items) {
      const balance = this.getOrCreateBalance(item.productId, delivery.sourceLocationId);
      balance.quantity -= item.quantity;
      balance.updatedAt = new Date().toISOString();
      item.shippedQuantity = item.quantity;

      this.logLedgerEntry({
        movementType: 'DELIVERY',
        productId: item.productId,
        locationId: delivery.sourceLocationId,
        quantityChange: -item.quantity,
        balanceAfter: balance.quantity,
        referenceType: 'DELIVERY',
        referenceNumber: delivery.deliveryNumber,
        reason: delivery.notes || `Fulfillment dispatch for customer: ${delivery.customerName}`,
        performedBy: user.userId,
        performedByName: user.fullName
      });
    }

    delivery.status = 'DONE';
    delivery.validatedAt = new Date().toISOString();
    delivery.validatedBy = user.userId;

    saveStore();
    return delivery;
  }

  /**
   * Execute an Internal Transfer between two distinct warehouse locations.
   */
  static executeTransfer(params: {
    sourceLocationId: string;
    destinationLocationId: string;
    items: { productId: string; quantity: number }[];
    reason?: string;
    user: { userId: string; fullName: string };
  }): ITransfer {
    const store = getStore();

    if (params.sourceLocationId === params.destinationLocationId) {
      throw new Error('Source location and destination location must be different.');
    }

    if (!params.items || params.items.length === 0) {
      throw new Error('Transfer must include at least one item.');
    }

    // Pre-flight check: stock availability
    for (const item of params.items) {
      if (item.quantity <= 0) {
        throw new Error('Transfer quantity must be positive.');
      }
      const balance = store.stockBalances.find(
        sb => sb.productId === item.productId && sb.locationId === params.sourceLocationId
      );
      const available = balance ? balance.quantity : 0;
      if (available < item.quantity) {
        const prod = store.products.find(p => p._id === item.productId);
        throw new Error(
          `Insufficient stock for "${prod ? prod.name : item.productId}". Available: ${available}, Requested: ${item.quantity}.`
        );
      }
    }

    const transferNumber = `TRF-${new Date().getFullYear()}-${String(store.transfers.length + 1).padStart(4, '0')}`;
    const now = new Date().toISOString();

    // Execute atomic balance movements
    for (const item of params.items) {
      const srcBalance = this.getOrCreateBalance(item.productId, params.sourceLocationId);
      const destBalance = this.getOrCreateBalance(item.productId, params.destinationLocationId);

      srcBalance.quantity -= item.quantity;
      srcBalance.updatedAt = now;

      destBalance.quantity += item.quantity;
      destBalance.updatedAt = now;

      // Transfer Out entry
      this.logLedgerEntry({
        movementType: 'INTERNAL_TRANSFER_OUT',
        productId: item.productId,
        locationId: params.sourceLocationId,
        sourceLocationId: params.sourceLocationId,
        destinationLocationId: params.destinationLocationId,
        quantityChange: -item.quantity,
        balanceAfter: srcBalance.quantity,
        referenceType: 'TRANSFER',
        referenceNumber: transferNumber,
        reason: params.reason || 'Internal location reallocation',
        performedBy: params.user.userId,
        performedByName: params.user.fullName
      });

      // Transfer In entry
      this.logLedgerEntry({
        movementType: 'INTERNAL_TRANSFER_IN',
        productId: item.productId,
        locationId: params.destinationLocationId,
        sourceLocationId: params.sourceLocationId,
        destinationLocationId: params.destinationLocationId,
        quantityChange: item.quantity,
        balanceAfter: destBalance.quantity,
        referenceType: 'TRANSFER',
        referenceNumber: transferNumber,
        reason: params.reason || 'Internal location reallocation',
        performedBy: params.user.userId,
        performedByName: params.user.fullName
      });
    }

    const transfer: ITransfer = {
      _id: `trf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      transferNumber,
      sourceLocationId: params.sourceLocationId,
      destinationLocationId: params.destinationLocationId,
      status: 'DONE',
      items: params.items,
      reason: params.reason,
      createdAt: now,
      validatedAt: now,
      validatedBy: params.user.userId
    };

    store.transfers.unshift(transfer);
    saveStore();
    return transfer;
  }

  /**
   * Process a Stock Adjustment (cycle count reconciliation).
   */
  static processAdjustment(params: {
    productId: string;
    locationId: string;
    countedQuantity: number;
    reason: string;
    user: { userId: string; fullName: string };
  }): IAdjustment {
    const store = getStore();

    if (params.countedQuantity < 0) {
      throw new Error('Counted quantity cannot be negative.');
    }

    if (!params.reason || params.reason.trim() === '') {
      throw new Error('A valid audit reason is required for inventory adjustments.');
    }

    const balance = this.getOrCreateBalance(params.productId, params.locationId);
    const systemQuantity = balance.quantity;
    const difference = params.countedQuantity - systemQuantity;

    balance.quantity = params.countedQuantity;
    balance.updatedAt = new Date().toISOString();

    const adjustmentNumber = `ADJ-${new Date().getFullYear()}-${String(store.adjustments.length + 1).padStart(4, '0')}`;

    this.logLedgerEntry({
      movementType: 'INVENTORY_ADJUSTMENT',
      productId: params.productId,
      locationId: params.locationId,
      quantityChange: difference,
      balanceAfter: params.countedQuantity,
      referenceType: 'ADJUSTMENT',
      referenceNumber: adjustmentNumber,
      reason: `Cycle Count: ${params.reason} (System: ${systemQuantity} -> Physical: ${params.countedQuantity}, Diff: ${difference >= 0 ? '+' : ''}${difference})`,
      performedBy: params.user.userId,
      performedByName: params.user.fullName
    });

    const adjustment: IAdjustment = {
      _id: `adj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      adjustmentNumber,
      productId: params.productId,
      locationId: params.locationId,
      systemQuantity,
      countedQuantity: params.countedQuantity,
      difference,
      reason: params.reason,
      createdAt: new Date().toISOString(),
      validatedBy: params.user.userId
    };

    store.adjustments.unshift(adjustment);
    saveStore();
    return adjustment;
  }

  /**
   * Computes stock quantities per product across all locations.
   */
  static getProductTotalStock(productId: string): { onHand: number; reserved: number; available: number } {
    const store = getStore();
    const balances = store.stockBalances.filter(sb => sb.productId === productId);
    const onHand = balances.reduce((sum, b) => sum + b.quantity, 0);
    const reserved = balances.reduce((sum, b) => sum + b.reservedQuantity, 0);
    return {
      onHand,
      reserved,
      available: Math.max(0, onHand - reserved)
    };
  }
}
