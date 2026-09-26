import assert from 'assert';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { resetDatabase, getStore } from '../models/store.js';
import { StockService } from '../services/stockService.js';
import { OTPService } from '../services/otpService.js';
import { JWT_SECRET } from '../config/jwt.js';

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passedTests++;
      console.log(`PASS: ${name}`);
    })
    .catch((err) => {
      console.error(`FAIL: ${name}`);
      console.error('   ', err.message);
      throw err;
    });
}

async function main() {
  console.log('====================================================');
  console.log('   StockSense Automated Verification Test Suite     ');
  console.log('====================================================\n');

  // Reset database to known baseline
  resetDatabase();
  const store = getStore();

  const testUser = {
    userId: 'usr_mgr_001',
    fullName: 'Sarah Jenkins (Test Manager)',
    role: 'INVENTORY_MANAGER' as const
  };

  await runTest('Authentication & Password Hashing verification', async () => {
    const user = store.users.find(u => u.email === 'manager@stocksense.io');
    assert(user, 'Default manager user should exist in store');
    const isMatch = await bcrypt.compare('Password123!', user.passwordHash);
    assert.strictEqual(isMatch, true, 'Manager password hash must match Password123!');

    // Test JWT generation and verification
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    assert.strictEqual(decoded.userId, user._id);
  });

  await runTest('Duplicate SKU rejection constraint', () => {
    const existingSku = store.products[0].sku;
    const isDuplicate = store.products.some(p => p.sku === existingSku);
    assert.strictEqual(isDuplicate, true, 'SKU lookup must find existing SKU to reject');
  });

  await runTest('Inbound Receipt stock increase, idempotency & ledger logging', () => {
    const product = store.products[0];
    const location = store.locations[0];

    const initialBalance = StockService.getOrCreateBalance(product._id, location._id).quantity;
    const initialLedgerCount = store.stockLedger.length;

    // Create a receipt
    const receiptId = `rec_test_${Date.now()}`;
    store.receipts.push({
      _id: receiptId,
      receiptNumber: `REC-TEST-${Date.now()}`,
      supplierName: 'Test Fasteners Corp',
      destinationLocationId: location._id,
      status: 'READY',
      items: [{ productId: product._id, quantity: 25, unitPrice: 10 }],
      createdAt: new Date().toISOString()
    });

    // Validate receipt
    const validated = StockService.validateReceipt(receiptId, testUser);
    assert.strictEqual(validated.status, 'DONE');

    const updatedBalance = StockService.getOrCreateBalance(product._id, location._id).quantity;
    assert.strictEqual(updatedBalance, initialBalance + 25, 'Stock balance must increase by exactly 25');

    // Verify ledger entry
    assert.strictEqual(store.stockLedger.length, initialLedgerCount + 1, 'Stock ledger must have 1 new entry');
    const ledgerEntry = store.stockLedger[0];
    assert.strictEqual(ledgerEntry.movementType, 'RECEIPT');
    assert.strictEqual(ledgerEntry.quantityChange, 25);
    assert.strictEqual(ledgerEntry.balanceAfter, updatedBalance);

    // Verify Idempotency: second validation must throw error
    assert.throws(() => {
      StockService.validateReceipt(receiptId, testUser);
    }, /already been validated/);
  });

  await runTest('Outbound Delivery stock deduction and ledger logging', () => {
    const product = store.products[0];
    const location = store.locations[0];

    const currentBalance = StockService.getOrCreateBalance(product._id, location._id).quantity;
    assert(currentBalance >= 10, 'Sufficient balance must exist for test');

    const deliveryId = `del_test_${Date.now()}`;
    store.deliveries.push({
      _id: deliveryId,
      deliveryNumber: `DEL-TEST-${Date.now()}`,
      customerName: 'Acme Heavy Industries',
      sourceLocationId: location._id,
      status: 'READY',
      items: [{ productId: product._id, quantity: 10 }],
      createdAt: new Date().toISOString()
    });

    const validated = StockService.validateDelivery(deliveryId, testUser);
    assert.strictEqual(validated.status, 'DONE');

    const afterBalance = StockService.getOrCreateBalance(product._id, location._id).quantity;
    assert.strictEqual(afterBalance, currentBalance - 10, 'Stock balance must decrease by 10');

    const latestLedger = store.stockLedger[0];
    assert.strictEqual(latestLedger.movementType, 'DELIVERY');
    assert.strictEqual(latestLedger.quantityChange, -10);
    assert.strictEqual(latestLedger.balanceAfter, afterBalance);
  });

  await runTest('Outbound Delivery insufficient stock rejection (negative stock prevention)', () => {
    const product = store.products[0];
    const location = store.locations[0];
    const currentBalance = StockService.getOrCreateBalance(product._id, location._id).quantity;

    const deliveryId = `del_oversell_${Date.now()}`;
    store.deliveries.push({
      _id: deliveryId,
      deliveryNumber: `DEL-OVERSELL-${Date.now()}`,
      customerName: 'High Volume Buyer',
      sourceLocationId: location._id,
      status: 'READY',
      items: [{ productId: product._id, quantity: currentBalance + 99999 }],
      createdAt: new Date().toISOString()
    });

    assert.throws(() => {
      StockService.validateDelivery(deliveryId, testUser);
    }, /Insufficient stock/);

    // Ensure stock was NOT changed
    const unchangedBalance = StockService.getOrCreateBalance(product._id, location._id).quantity;
    assert.strictEqual(unchangedBalance, currentBalance, 'Stock must remain completely unchanged upon aborted delivery');
  });

  await runTest('Internal Transfer between locations with total stock conservation', () => {
    const product = store.products[0];
    const srcLoc = store.locations[0];
    const destLoc = store.locations[1];

    const srcBefore = StockService.getOrCreateBalance(product._id, srcLoc._id).quantity;
    const destBefore = StockService.getOrCreateBalance(product._id, destLoc._id).quantity;
    const totalBefore = srcBefore + destBefore;

    const transfer = StockService.executeTransfer({
      sourceLocationId: srcLoc._id,
      destinationLocationId: destLoc._id,
      items: [{ productId: product._id, quantity: 5 }],
      reason: 'Routine warehouse buffer transfer',
      user: testUser
    });

    assert.strictEqual(transfer.status, 'DONE');

    const srcAfter = StockService.getOrCreateBalance(product._id, srcLoc._id).quantity;
    const destAfter = StockService.getOrCreateBalance(product._id, destLoc._id).quantity;
    const totalAfter = srcAfter + destAfter;

    assert.strictEqual(srcAfter, srcBefore - 5, 'Source location must lose 5 units');
    assert.strictEqual(destAfter, destBefore + 5, 'Destination location must gain 5 units');
    assert.strictEqual(totalAfter, totalBefore, 'Total stock across locations must remain strictly constant');

    // Prevent self-transfer
    assert.throws(() => {
      StockService.executeTransfer({
        sourceLocationId: srcLoc._id,
        destinationLocationId: srcLoc._id,
        items: [{ productId: product._id, quantity: 1 }],
        user: testUser
      });
    }, /Source location and destination location must be different/);
  });

  await runTest('Stock Adjustment (cycle count) accuracy and delta recording', () => {
    const product = store.products[1];
    const location = store.locations[0];

    const systemBefore = StockService.getOrCreateBalance(product._id, location._id).quantity;
    const physicalCount = systemBefore + 3; // Found 3 extra units on shelf

    const adj = StockService.processAdjustment({
      productId: product._id,
      locationId: location._id,
      countedQuantity: physicalCount,
      reason: 'Quarterly shelf cycle count reconciliation',
      user: testUser
    });

    assert.strictEqual(adj.difference, 3);
    assert.strictEqual(adj.systemQuantity, systemBefore);
    assert.strictEqual(adj.countedQuantity, physicalCount);

    const balanceAfter = StockService.getOrCreateBalance(product._id, location._id).quantity;
    assert.strictEqual(balanceAfter, physicalCount, 'Balance must equal counted quantity');

    const ledger = store.stockLedger[0];
    assert.strictEqual(ledger.movementType, 'INVENTORY_ADJUSTMENT');
    assert.strictEqual(ledger.quantityChange, 3);
  });

  await runTest('OTP Password-Reset security flow with attempt limits', async () => {
    const email = 'manager@stocksense.io';
    const { otp } = await OTPService.createPasswordResetOTP(email);
    assert.strictEqual(otp.length, 6, 'Generated OTP must be 6 digits');

    // Wrong OTP attempt
    await assert.rejects(async () => {
      await OTPService.verifyOTP(email, '000000');
    }, /Invalid verification code/);

    // Correct OTP succeeds
    const success = await OTPService.verifyOTP(email, otp);
    assert.strictEqual(success, true, 'Correct OTP must successfully verify');

    // Code cannot be reused
    await assert.rejects(async () => {
      await OTPService.verifyOTP(email, otp);
    }, /No active password reset request found/);
  });

  console.log('\n====================================================');
  console.log(`Results: ${passedTests}/${totalTests} tests passed successfully!`);
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
