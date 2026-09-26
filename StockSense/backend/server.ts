import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import receiptRoutes from './routes/receiptRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import adjustmentRoutes from './routes/adjustmentRoutes.js';
import ledgerRoutes from './routes/ledgerRoutes.js';
import warehouseRoutes from './routes/warehouseRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import userRoutes from './routes/userRoutes.js';

export function createStockSenseApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Initialize database / store
  connectDB();

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      system: 'StockSense Modular IMS',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API modules
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/receipts', receiptRoutes);
  app.use('/api/deliveries', deliveryRoutes);
  app.use('/api/transfers', transferRoutes);
  app.use('/api/adjustments', adjustmentRoutes);
  app.use('/api/ledger', ledgerRoutes);
  app.use('/api/warehouses', warehouseRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/users', userRoutes);

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('StockSense API Error:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error'
    });
  });

  return app;
}
