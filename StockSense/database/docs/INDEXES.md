# StockSense Index Strategy & Performance

## MongoDB Index Specifications

### 1. Unique Constraints
- **users.email**: Prevents duplicate account registrations.
- **products.sku**: Enforces global SKU uniqueness across all catalog entries.
- **warehouses.code**: Ensures distinct warehouse code identifiers (e.g., `WH-MAIN`, `WH-WEST`).
- **locations (code, warehouseId)**: Ensures unique location code within a warehouse.
- **stock_balances (productId, locationId)**: Guarantees a single source-of-truth document per product per location.
- **receipts.receiptNumber**: Unique inbound transaction identifier.
- **deliveries.deliveryNumber**: Unique outbound transaction identifier.
- **transfers.transferNumber**: Unique internal movement identifier.
- **adjustments.adjustmentNumber**: Unique physical count adjustment identifier.

### 2. Query Performance Indexes
- `stock_ledger`: Compound index `{ productId: 1, createdAt: -1 }` accelerates timeline queries for product movement histories.
- `stock_ledger`: Index `{ referenceNumber: 1 }` allows instant cross-referencing between order documents and ledger movements.
- `products`: Index `{ category: 1, isActive: 1 }` accelerates filtered product catalog listing and reorder calculations.
- `password_resets`: TTL index `{ expiresAt: 1 }` automatically cleans expired OTP records after expiration.
