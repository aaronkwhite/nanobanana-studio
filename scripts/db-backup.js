#!/usr/bin/env node
/**
 * Backup the SQLite database
 * Usage: node scripts/db-backup.js [backup-name]
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'jobs.db');
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupName = process.argv[2] || `backup-${timestamp}`;
const backupPath = path.join(BACKUP_DIR, `${backupName}.db`);

if (!fs.existsSync(DB_PATH)) {
  console.log('No database file to backup');
  process.exit(0);
}

fs.copyFileSync(DB_PATH, backupPath);
console.log(`Database backed up to: ${backupPath}`);

// Also export to JSON for human-readable backup
const Database = require('better-sqlite3');
const db = new Database(DB_PATH, { readonly: true });

const jobs = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all();
const items = db.prepare('SELECT * FROM job_items ORDER BY created_at').all();

const jsonPath = path.join(BACKUP_DIR, `${backupName}.json`);
fs.writeFileSync(jsonPath, JSON.stringify({ jobs, items }, null, 2));
console.log(`JSON export saved to: ${jsonPath}`);

db.close();
console.log(`\nBackup complete: ${jobs.length} jobs, ${items.length} items`);
