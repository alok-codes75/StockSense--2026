import fs from 'fs';
import path from 'path';
import { getStore, saveStore } from '../../backend/models/store.js';

const BACKUP_DIR = path.resolve(process.cwd(), 'StockSense/database/backups');

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function performBackup() {
  ensureDir(BACKUP_DIR);
  const store = getStore();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `stocksense_backup_${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(store, null, 2), 'utf-8');
  console.log(`Backup generated successfully: ${backupFile}`);
}

export function performRestore(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file does not exist: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const restored = JSON.parse(raw);
  const store = getStore();
  Object.assign(store, restored);
  saveStore();
  console.log(`Database state restored successfully from ${filePath}`);
}

const action = process.argv[2];
const target = process.argv[3];

if (action === 'backup') {
  performBackup();
} else if (action === 'restore') {
  if (!target) {
    console.error('Specify the path to the backup file to restore.');
    process.exit(1);
  }
  performRestore(target);
} else {
  console.log('Usage: npx tsx StockSense/database/scripts/backup_restore.ts [backup | restore <path>]');
}
