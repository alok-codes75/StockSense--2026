import { resetDatabase } from '../../backend/models/store.js';

console.log('Seeding StockSense database with master catalog and warehouses...');
try {
  const state = resetDatabase();
  console.log(`Database seeded successfully!`);
  console.log(`- Warehouses: ${state.warehouses.length}`);
  console.log(`- Locations: ${state.locations.length}`);
  console.log(`- Products: ${state.products.length}`);
  console.log(`- Stock Balances: ${state.stockBalances.length}`);
  console.log(`- Stock Ledger records: ${state.stockLedger.length}`);
  console.log(`- Users: ${state.users.length}`);
  console.log('Ready to run StockSense.');
} catch (err) {
  console.error('Failed to seed database:', err);
  process.exit(1);
}
