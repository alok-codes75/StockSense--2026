# StockSense Database Architecture

## Directory Structure
- `schemas/`: JSON Schema definitions specifying BSON validation rules for all 10 collections.
- `scripts/`: TypeScript utility scripts including database seeding and automated JSON/BSON backup & restore.
- `seed/`: Master fixture dataset containing baseline warehouses, storage bins, catalog products, and initial stock balances.
- `docs/`: In-depth documentation on Entity Relationships (`ERD.md`), Indexes (`INDEXES.md`), and Replica Set Transactions (`TRANSACTIONS.md`).

## Initialization & Seeding
To populate a fresh MongoDB database with sample products, warehouses, locations, and demo credentials:
```bash
npm run seed
# or
npx tsx StockSense/database/scripts/seed.ts
```

## Backup & Restore
- Run `npx tsx StockSense/database/scripts/backup_restore.ts backup` to export collections to JSON snapshots.
- Run `npx tsx StockSense/database/scripts/backup_restore.ts restore` to re-import snapshots.
