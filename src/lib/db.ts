import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'jobs.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

function initSchema() {
  const database = db!;

  // Jobs table - tracks image generation jobs
  database.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      mode TEXT NOT NULL DEFAULT 'text-to-image',
      prompt TEXT NOT NULL,
      output_size TEXT NOT NULL DEFAULT '1K',
      temperature REAL NOT NULL DEFAULT 1,
      aspect_ratio TEXT NOT NULL DEFAULT '1:1',
      batch_job_name TEXT,
      batch_temp_file TEXT,
      total_items INTEGER NOT NULL DEFAULT 0,
      completed_items INTEGER NOT NULL DEFAULT 0,
      failed_items INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Job items table - individual items in a batch
  database.exec(`
    CREATE TABLE IF NOT EXISTS job_items (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      input_prompt TEXT,
      input_image_path TEXT,
      output_image_path TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_job_items_job_id ON job_items(job_id);
    CREATE INDEX IF NOT EXISTS idx_job_items_status ON job_items(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  `);
}

// Types
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ItemStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type JobMode = 'text-to-image' | 'image-to-image';
export type OutputSize = '1K' | '2K' | '4K';

export type Temperature = 0 | 0.5 | 1 | 1.5 | 2;
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface Job {
  id: string;
  status: JobStatus;
  mode: JobMode;
  prompt: string;
  output_size: OutputSize;
  temperature: Temperature;
  aspect_ratio: AspectRatio;
  batch_job_name: string | null;
  batch_temp_file: string | null;
  total_items: number;
  completed_items: number;
  failed_items: number;
  created_at: string;
  updated_at: string;
}

export interface JobItem {
  id: string;
  job_id: string;
  input_prompt: string | null;
  input_image_path: string | null;
  output_image_path: string | null;
  status: ItemStatus;
  error: string | null;
  created_at: string;
  updated_at: string;
}

// Helper functions
export function generateId(): string {
  return crypto.randomUUID();
}

// Text-to-Image job creation
export interface CreateT2IJobData {
  prompt: string;
  outputSize: OutputSize;
  temperature: Temperature;
  aspectRatio: AspectRatio;
  prompts: string[]; // Multiple prompts for batch
}

export function createTextToImageJob(data: CreateT2IJobData): { job: Job; items: JobItem[] } {
  const database = getDb();
  const jobId = generateId();

  const insertJob = database.prepare(`
    INSERT INTO jobs (id, mode, prompt, output_size, temperature, aspect_ratio, total_items)
    VALUES (?, 'text-to-image', ?, ?, ?, ?, ?)
  `);

  const insertItem = database.prepare(`
    INSERT INTO job_items (id, job_id, input_prompt)
    VALUES (?, ?, ?)
  `);

  const transaction = database.transaction(() => {
    insertJob.run(jobId, data.prompt, data.outputSize, data.temperature, data.aspectRatio, data.prompts.length);

    for (const prompt of data.prompts) {
      insertItem.run(generateId(), jobId, prompt);
    }
  });

  transaction();

  return { job: getJob(jobId)!, items: getJobItems(jobId) };
}

// Image-to-Image job creation
export interface CreateI2IJobData {
  prompt: string;
  outputSize: OutputSize;
  temperature: Temperature;
  aspectRatio: AspectRatio;
  imagePaths: string[]; // Paths to uploaded source images
}

export function createImageToImageJob(data: CreateI2IJobData): { job: Job; items: JobItem[] } {
  const database = getDb();
  const jobId = generateId();
  const itemIds: string[] = [];

  const insertJob = database.prepare(`
    INSERT INTO jobs (id, mode, prompt, output_size, temperature, aspect_ratio, total_items)
    VALUES (?, 'image-to-image', ?, ?, ?, ?, ?)
  `);

  const insertItem = database.prepare(`
    INSERT INTO job_items (id, job_id, input_image_path)
    VALUES (?, ?, ?)
  `);

  const transaction = database.transaction(() => {
    insertJob.run(jobId, data.prompt, data.outputSize, data.temperature, data.aspectRatio, data.imagePaths.length);

    for (const imagePath of data.imagePaths) {
      const itemId = generateId();
      itemIds.push(itemId);
      insertItem.run(itemId, jobId, imagePath);
    }
  });

  transaction();

  return { job: getJob(jobId)!, items: getJobItems(jobId) };
}

// Job queries
export function getJob(id: string): Job | null {
  const database = getDb();
  return database.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Job | null;
}

export function getJobs(limit = 50): Job[] {
  const database = getDb();
  return database.prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?').all(limit) as Job[];
}

export function updateJobStatus(id: string, status: JobStatus): void {
  const database = getDb();
  database.prepare(`
    UPDATE jobs SET status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(status, id);
}

export function updateJobBatchInfo(id: string, batchJobName: string, batchTempFile: string): void {
  const database = getDb();
  database.prepare(`
    UPDATE jobs SET batch_job_name = ?, batch_temp_file = ?, status = 'processing', updated_at = datetime('now')
    WHERE id = ?
  `).run(batchJobName, batchTempFile, id);
}

export function updateJobProgress(id: string, completed: number, failed: number): void {
  const database = getDb();
  database.prepare(`
    UPDATE jobs SET completed_items = ?, failed_items = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(completed, failed, id);
}

export function deleteJob(id: string): void {
  const database = getDb();
  // Delete items first (foreign key), then job
  database.prepare('DELETE FROM job_items WHERE job_id = ?').run(id);
  database.prepare('DELETE FROM jobs WHERE id = ?').run(id);
}

// Job item operations
export function getJobItems(jobId: string): JobItem[] {
  const database = getDb();
  return database.prepare('SELECT * FROM job_items WHERE job_id = ? ORDER BY created_at').all(jobId) as JobItem[];
}

export function updateJobItem(
  id: string,
  data: { status: ItemStatus; output_image_path?: string; error?: string }
): void {
  const database = getDb();
  database.prepare(`
    UPDATE job_items
    SET status = ?, output_image_path = COALESCE(?, output_image_path), error = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(data.status, data.output_image_path || null, data.error || null, id);
}

// Delete old database file to reset schema (for development)
export function resetDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
