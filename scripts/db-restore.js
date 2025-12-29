#!/usr/bin/env node
/**
 * Restore the SQLite database from backup
 * Usage: node scripts/db-restore.js <backup-name>
 *
 * Lists available backups if no name provided
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'jobs.db');
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');

const backupName = process.argv[2];

// List available backups if no name provided
if (!backupName) {
  console.log('Available backups:\n');

  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('  (no backups found)');
    process.exit(0);
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('  (no backups found)');
  } else {
    files.forEach(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      const size = (stat.size / 1024).toFixed(1);
      console.log(`  ${f.replace('.db', '')}  (${size} KB)`);
    });
    console.log('\nUsage: node scripts/db-restore.js <backup-name>');
  }
  process.exit(0);
}

const backupPath = path.join(BACKUP_DIR, `${backupName}.db`);

if (!fs.existsSync(backupPath)) {
  console.error(`Backup not found: ${backupPath}`);
  process.exit(1);
}

// Backup current DB before restoring (safety)
if (fs.existsSync(DB_PATH)) {
  const safetyBackup = path.join(BACKUP_DIR, `pre-restore-${Date.now()}.db`);
  fs.copyFileSync(DB_PATH, safetyBackup);
  console.log(`Current DB backed up to: ${safetyBackup}`);
}

fs.copyFileSync(backupPath, DB_PATH);
console.log(`Database restored from: ${backupPath}`);
