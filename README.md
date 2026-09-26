# StockSense - Modular Inventory Management System

StockSense is an enterprise-grade, production-ready Inventory Management System (IMS) designed to replace manual inventory registers, disjointed spreadsheets, and paper records with a centralized, auditable application. Built for **Inventory Managers** and **Warehouse Staff**, StockSense provides real-time stock balance tracking, inbound purchase receipts, outbound customer fulfillment, inter-location transfers, cycle count adjustments, and a double-entry stock ledger.

---

## 1. Key Features & Highlights

- **Live Database-Backed Dashboard KPIs**: Real-time distinct SKU counts, physical units on hand, low-stock/out-of-stock monitors, pending receipts, pending deliveries, and scheduled transfers.
- **Product Catalog Management**: Master item creation, unique SKU validation, category indexing, units of measure (UOM), cost and selling prices, reorder thresholds, and historical preservation on archival.
- **Inbound Purchase Receipts**: Supplier receipt staging with multi-line items, receipt validation workflow, atomic stock increments, and ledger recording.
- **Outbound Delivery Fulfillment**: Picking, packing, and validation workflow with pre-flight stock availability verification. Strictly prevents negative inventory or overselling.
- **Internal Stock Transfers**: Instant bin-to-bin and warehouse-to-warehouse stock relocation. Conserves total company inventory and logs dual transfer movements (OUT/IN).
- **Physical Cycle Count Adjustments**: Reconcile physical inventory against book balances. Requires mandatory audit justifications and logs variances.
- **Auditable Stock Ledger**: Cryptographic audit trail of all historical movements with timestamps, SKU, location, reference numbers, quantity changes, and user attribution. Includes CSV export.
- **Warehouses & Storage Locations**: Hierarchical storage architecture (Warehouse -> Zone -> Aisle -> Shelf -> Bin). Enforces safety checks preventing deletion of locations containing active stock.
- **Automated Low-Stock Alerts**: Real-time safety stock calculations, unit deficits, and suggested replenishment purchase batches.
- **Role-Based Access Control (RBAC)**: Distinct authorization tiers for **Inventory Managers** (full administrative, catalog, cycle count, user management) and **Warehouse Staff** (fulfillment, receiving, transfers).
- **Cryptographic OTP Password Recovery**: 6-digit one-time password flow with 15-minute expiration, max 5 failed attempts limit, and bcrypt-hashed storage.

---

## 2. Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React, React Router v7.
- **Backend**: Node.js v22, Express REST API, JSON Web Tokens (JWT), Bcrypt password hashing.
- **Database Layer**: MongoDB with Mongoose ODM support for MongoDB Atlas / Replica Sets, and integrated file-backed persistent storage fallback (`StockSense/database/data/`) for zero-configuration local execution.
- **Architecture**: Decoupled 3-tier modular architecture organized into `frontend/`, `backend/`, and `database/`.

---

## 3. Mandatory Project Structure

```
StockSense/
|
|-- frontend/
|   |-- src/
|   |   |-- components/       # Layout, StatCard, Badge, Modal, ConfirmDialog, Pagination, EmptyState
|   |   |-- context/          # AuthContext, NotificationContext (Toasts)
|   |   |-- pages/            # Dashboard, Products, Receipts, Deliveries, Transfers, Adjustments, Ledger, Warehouses, Alerts, Users, Profile, Login, Register, ForgotPassword, Settings
|   |   |-- services/         # Typed API client with JWT interception
|   |   |-- types/            # TypeScript domain interfaces
|   |   |-- App.tsx           # React Router route declarations
|
|-- backend/
|   |-- config/               # Database connector, JWT configuration
|   |-- controllers/          # Express route controllers for all domains
|   |-- middleware/           # authMiddleware, requireRole, errorHandler
|   |-- models/               # TypeScript domain interfaces & persistent store engine
|   |-- routes/               # Modular Express API routers
|   |-- services/             # StockService (atomic stock math), OTPService (hashed OTPs)
|   |-- tests/                # Automated verification test suite (run_tests.ts)
|   |-- server.ts             # Express application setup
|
|-- database/
|   |-- schemas/              # JSON Schema validation definitions for all collections
|   |-- scripts/              # Database seeding (seed.ts) and snapshot utilities (backup_restore.ts)
|   |-- seed/                 # Baseline master JSON fixtures (seed_data.json)
|   |-- docs/                 # ERD.md, INDEXES.md, TRANSACTIONS.md
|   |-- README.md             # Database architecture documentation
|
|-- README.md                 # Complete system guide
|-- .gitignore                # Git exclusions
```

---

## 4. Prerequisites

Before installing, ensure your machine has:
1. **Node.js**: v18.0.0 or higher (v20+ or v22 LTS recommended).
2. **Git**: v2.30.0 or higher.
3. **MongoDB** (Optional): A free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or local MongoDB instance. If not provided, StockSense will automatically run using its built-in persistent storage engine.

---

## 5. Fresh-PC Installation (Windows PowerShell & Bash)

### Step 1: Clone Repository
```powershell
git clone <YOUR_REPOSITORY_URL> StockSense
cd StockSense
```

### Step 2: Install Dependencies
```powershell
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
# Windows PowerShell:
Copy-Item .env.example .env

# macOS / Linux Bash:
cp .env.example .env
```

Edit `.env` to customize settings:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secure-production-secret-key-32-chars-min
# Optional MongoDB connection (leave empty or comment out to use embedded engine):
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/stocksense?retryWrites=true&w=majority
```

### Step 4: Seed Database
Seed baseline warehouses, storage bins, products, and default user accounts:
```powershell
npm run seed
```

### Step 5: Start Application
```powershell
npm run dev
```
The application will launch at:
- **Local Application URL**: `http://localhost:3000`

---

## 6. Pre-configured Demo Accounts

| Role | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Inventory Manager** | `manager@stocksense.io` | `Password123!` | Full Access (Products, Receipts, Deliveries, Transfers, Adjustments, Users, Settings) |
| **Warehouse Staff** | `staff@stocksense.io` | `Password123!` | Operational Access (Receipts, Deliveries, Transfers, Ledger, Bin Views) |

*Tip: The login page includes one-click demo login buttons to instantly switch between Manager and Staff roles without typing.*

---

## 7. Operational Workflow Guide

### A. Receiving Inbound Inventory
1. Navigate to **Receipts (Inbound)** -> click **+ New Inbound Receipt**.
2. Select supplier name, destination receiving location (e.g. `RCV-DOCK-1`), add product lines with quantities and unit costs.
3. Click **Create Inbound Order** (status will be `READY`).
4. Upon delivery truck arrival, inspect items and click **Validate Receipt & Increase Stock**.
5. Stock on hand is instantly credited to that location and immutable ledger entries are recorded.

### B. Outbound Customer Fulfillment
1. Navigate to **Delivery Orders (Outbound)** -> click **+ New Delivery Order**.
2. Enter customer name, source picking location (e.g. `A-01-BIN`), shipping address, and line items.
3. The system automatically inspects stock on hand at that location and indicates whether items are in stock.
4. Click **Validate & Dispatch Order**.
5. Stock is deducted immediately. If any SKU has insufficient stock, the system safely aborts to prevent negative inventory.

### C. Internal Stock Transfers
1. Navigate to **Internal Transfers** -> click **+ New Stock Transfer**.
2. Select source location and destination location (e.g., from `RCV-DOCK-1` to `BULK-RACK-04`).
3. Add item and quantity, provide an optional transfer purpose, and click **Execute Stock Transfer**.
4. Source stock decrements, destination stock increments, total company stock is strictly preserved, and dual ledger entries (`INTERNAL_TRANSFER_OUT` and `INTERNAL_TRANSFER_IN`) are logged.

### D. Cycle Count Reconciliations (Stock Adjustments)
1. Navigate to **Inventory Adjustments** -> click **Record Stock Adjustment** (Manager only).
2. Choose product and location. System loads current book quantity.
3. Enter physical counted quantity. The system automatically calculates variance (e.g., `+3` or `-2`).
4. Provide mandatory audit reason (e.g., "Monthly shelf audit discrepancy") and submit.
5. Stock is updated to the physical count and an `INVENTORY_ADJUSTMENT` ledger record is created.

---

## 8. REST API Reference

All protected endpoints require an `Authorization: Bearer <JWT_TOKEN>` header.

### Authentication Endpoints
- `POST /api/auth/login`: Authenticate with email and password. Returns JWT token and user profile.
- `POST /api/auth/register`: Create a new user account.
- `GET /api/auth/me`: Retrieve currently authenticated user profile.
- `PUT /api/auth/profile`: Update user name, department, or change password.
- `POST /api/auth/forgot-password`: Request 6-digit password reset OTP.
- `POST /api/auth/reset-password`: Verify 6-digit OTP and set new password.

### Products Endpoints
- `GET /api/products`: List products with search, category, and stock status filters (`page`, `limit`).
- `GET /api/products/:id`: Fetch product detail with warehouse breakdown and movement history.
- `POST /api/products`: Create catalog product (Manager only). Validates unique SKU.
- `PUT /api/products/:id`: Update product fields (Manager only).
- `POST /api/products/:id/archive`: Archive product while preserving all historical stock and ledger entries.

### Receipts Endpoints
- `GET /api/receipts`: List inbound receipts with status filter and search.
- `GET /api/receipts/:id`: Retrieve receipt line item details.
- `POST /api/receipts`: Create inbound receipt draft.
- `POST /api/receipts/:id/validate`: Validate receipt, add stock, and log ledger entries.
- `POST /api/receipts/:id/cancel`: Cancel non-completed receipt.

### Deliveries Endpoints
- `GET /api/deliveries`: List customer delivery orders.
- `GET /api/deliveries/:id`: Inspect delivery order lines and bin availability.
- `POST /api/deliveries`: Create outbound delivery order.
- `POST /api/deliveries/:id/validate`: Validate delivery, deduct stock, and log ledger entries.
- `POST /api/deliveries/:id/cancel`: Cancel order.

### Transfers & Adjustments
- `GET /api/transfers`: List internal transfers.
- `POST /api/transfers`: Execute stock transfer between two locations.
- `GET /api/adjustments`: List cycle count adjustments.
- `POST /api/adjustments`: Record cycle count adjustment (Manager only).

### Stock Ledger
- `GET /api/ledger`: Searchable, filterable audit ledger (`movementType`, `search`, `startDate`, `endDate`).

### Warehouses & Locations
- `GET /api/warehouses`: List warehouses and active bin counts.
- `POST /api/warehouses`: Create warehouse facility.
- `GET /api/warehouses/locations`: List locations with stored physical unit counts.
- `POST /api/warehouses/locations`: Create storage bin.
- `DELETE /api/warehouses/locations/:id`: Safely remove/deactivate location (blocks deletion if stock > 0).

---

## 9. Automated Testing

StockSense features an automated backend verification test suite validating inventory mathematical correctness, idempotency, and concurrency safety:
```powershell
npm test
# or
npx tsx StockSense/backend/tests/run_tests.ts
```

### Verified Test Cases:
1. `PASS`: Authentication & Password Hashing verification with bcrypt and JWT.
2. `PASS`: Duplicate SKU rejection constraint.
3. `PASS`: Inbound Receipt stock increase, idempotency & ledger logging.
4. `PASS`: Outbound Delivery stock deduction and ledger logging.
5. `PASS`: Outbound Delivery insufficient stock rejection (negative stock prevention).
6. `PASS`: Internal Transfer between locations with total stock conservation.
7. `PASS`: Stock Adjustment (cycle count) accuracy and delta recording.
8. `PASS`: OTP Password-Reset security flow with attempt limits and expiration.

---

## 10. Production Build & Deployment

### Build Frontend
```powershell
npm run build
```
This compiles the React application into `/dist`.

### Run Production Server
```powershell
npm start
```
Starts the Node.js Express server on `PORT` (default 3000), serving both API endpoints under `/api/*` and the compiled single-page frontend.

---

## 11. Security Architecture

1. **Password Hashing**: Bcrypt with salt factor 10. Passwords are never stored in plaintext.
2. **Session Security**: JWT bearer tokens signed with `HS256` and expiration time limits.
3. **Role Authorization**: Role-based middleware (`requireRole`) protects catalog alterations, inventory adjustments, and user management.
4. **Negative Stock Guard**: Atomic compare-and-swap checks reject any dispatch where `quantity > availableStock`.
5. **OTP Expiry**: Hashed OTP tokens expire automatically after 15 minutes, with a maximum limit of 5 verification attempts.

---

## 12. Troubleshooting Guide

- **Port in use error (`EADDRINUSE: 3000`)**: Set a different port in `.env` (e.g., `PORT=3001`) or terminate the conflicting process:
  ```powershell
  # Windows PowerShell:
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
  ```
- **Session Expired (401 Unauthorized)**: Tokens expire after 24 hours. Simply log back in using the demo buttons or your credentials.
- **Resetting state**: Run `npm run seed` or click **Reset Demo Seed Data** in the Settings or User Management page.

---

## 13. License

StockSense is released under the **MIT License**.
