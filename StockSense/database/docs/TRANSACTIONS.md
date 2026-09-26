# MongoDB Multi-Document Transactions & Concurrency

## Overview
Inventory systems must strictly adhere to ACID transactions to prevent:
1. Negative inventory balances (overselling)
2. Half-completed transfers (stock deducted from source but not credited to destination)
3. Unaudited stock changes (balance altered without an immutable ledger entry)

## MongoDB Requirements
Multi-document transactions in MongoDB require:
- A MongoDB Replica Set or MongoDB Atlas cluster (MongoDB v4.0+).
- Single-node standalone MongoDB instances do not support multi-document transactions unless initiated with `--replSet rs0`.

## StockSense Concurrency Protection Architecture
StockSense implements a dual-layer strategy:
1. **Replica Set Mode**: When connected to MongoDB Atlas or a replica set, StockSense wraps stock operations (receipt validation, delivery confirmation, transfers, and adjustments) in `session.withTransaction()`.
2. **Atomic Compare-and-Swap Fallback**: For standalone MongoDB instances or when running in embedded mode, StockSense utilizes conditional atomic operators:
   ```javascript
   // Atomic balance deduction preventing negative inventory
   const res = await StockBalance.updateOne(
     { productId, locationId, quantity: { $gte: requiredQty } },
     { $inc: { quantity: -requiredQty }, $set: { updatedAt: new Date() } }
   );
   if (res.matchedCount === 0) {
     throw new Error("Insufficient stock available at specified location");
   }
   ```
This guarantees that regardless of database deployment mode, no race condition can ever cause negative stock or phantom inventory.
