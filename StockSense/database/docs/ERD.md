# StockSense Database Documentation

## Architecture Overview
StockSense uses MongoDB as its primary data store, with full support for MongoDB Atlas and self-hosted MongoDB clusters.

### Primary Collections:
1. **users**: System users with role-based access (`INVENTORY_MANAGER`, `WAREHOUSE_STAFF`), hashed passwords (bcrypt), and account statuses.
2. **products**: Catalog items with unique SKUs, reorder thresholds, categories, UOM, and active status.
3. **warehouses**: Physical or logical distribution facilities (e.g., Central Warehouse, Regional Hub).
4. **locations**: Specific bins, aisles, or zones within a warehouse (e.g., Zone A - Bin 101).
5. **stock_balances**: Real-time quantity balances keyed by `(productId, locationId)` with non-negative constraints.
6. **receipts**: Inbound purchase receipts from suppliers with multi-line items and validation workflows.
7. **deliveries**: Outbound customer fulfillment orders with picking/packing statuses and validation stock deductions.
8. **transfers**: Internal movements transferring stock from source location to destination location.
9. **adjustments**: Cycle count corrections reconciling physical count against book inventory.
10. **stock_ledger**: Immutable, auditable double-entry ledger logging every stock movement with reference, delta, and actor.
11. **password_resets**: Hashed OTP tokens with expiration (15 minutes), attempt limits (max 5), and verification status.

## Indexes Summary
- `users`: `{ email: 1 }` (unique)
- `products`: `{ sku: 1 }` (unique), `{ category: 1 }`, `{ isActive: 1 }`
- `warehouses`: `{ code: 1 }` (unique)
- `locations`: `{ code: 1, warehouseId: 1 }` (unique compound)
- `stock_balances`: `{ productId: 1, locationId: 1 }` (unique compound)
- `receipts`: `{ receiptNumber: 1 }` (unique), `{ status: 1 }`, `{ createdAt: -1 }`
- `deliveries`: `{ deliveryNumber: 1 }` (unique), `{ status: 1 }`, `{ createdAt: -1 }`
- `transfers`: `{ transferNumber: 1 }` (unique), `{ status: 1 }`
- `adjustments`: `{ adjustmentNumber: 1 }` (unique)
- `stock_ledger`: `{ productId: 1, createdAt: -1 }`, `{ referenceNumber: 1 }`, `{ locationId: 1 }`
