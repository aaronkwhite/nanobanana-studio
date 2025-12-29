import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync, existsSync, unlinkSync, createReadStream } from 'fs';
import { createInterface } from 'readline';
import { extname, join } from 'path';
import type { OutputSize } from './db';

// Model configuration - Gemini 2.0 Flash image generation (Nano Banana)
const MODEL = 'gemini-3-pro-image-preview';

let client: GoogleGenAI | null = null;

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return apiKey;
}

export function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: getApiKey() });
  }
  return client;
}

export function resetClient(): void {
  client = null;
}

// Batch job states
export const COMPLETED_STATES = new Set([
  'JOB_STATE_SUCCEEDED',
  'JOB_STATE_FAILED',
  'JOB_STATE_CANCELLED',
]);

/**
 * Get MIME type from file extension
 */
export function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'image/jpeg';
}

/**
 * Read image file and convert to base64
 */
export function readImageAsBase64(filePath: string): string {
  const buffer = readFileSync(filePath);
  return buffer.toString('base64');
}

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

// Types for batch processing
interface BatchRequest {
  key: string;
  request: {
    contents: Array<{
      role: string;
      parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }>;
    }>;
    generationConfig: {
      temperature: number;
      responseModalities: string[];
      imageConfig?: {
        imageSize: string;
        aspectRatio: string;
      };
    };
  };
}

interface BatchJob {
  name: string;
  state: string;
  batchStats?: {
    totalCount?: number;
    succeededCount?: number;
    failedCount?: number;
  };
  dest?: {
    fileName: string;
  };
  error?: {
    message?: string;
  };
}

interface BatchResult {
  key: string;
  error?: { message: string };
  response?: {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: {
            data: string;
          };
        }>;
      };
    }>;
  };
}

// Types for file info
interface FileInfo {
  id: string;
  path: string;
  originalName?: string;
}

/**
 * Submit a batch job for text-to-image generation
 */
export async function submitTextToImageBatch(
  items: Array<{ id: string; prompt: string }>,
  outputSize: OutputSize,
  aspectRatio: AspectRatio,
  temperature: number
): Promise<{ jobName: string; tempFilePath: string }> {
  const ai = getClient();

  const requests: BatchRequest[] = items.map((item) => ({
    key: item.id,
    request: {
      contents: [
        {
          role: 'user',
          parts: [{ text: item.prompt }],
        },
      ],
      generationConfig: {
        temperature,
        responseModalities: ['IMAGE'],
        imageConfig: {
          imageSize: outputSize,
          aspectRatio,
        },
      },
    },
  }));

  // Write JSONL file
  const jsonl = requests.map((r) => JSON.stringify(r)).join('\n');
  const tempFilePath = join(process.cwd(), 'data', `batch-t2i-${Date.now()}.jsonl`);
  writeFileSync(tempFilePath, jsonl);

  // Upload JSONL file to Gemini Files API
  const uploadedFile = await ai.files.upload({
    file: tempFilePath,
    config: { mimeType: 'application/json' },
  });

  if (!uploadedFile.name) {
    throw new Error('Failed to upload batch file');
  }

  // Submit batch job
  const job = await ai.batches.create({
    model: MODEL,
    src: uploadedFile.name,
    config: { displayName: `nanobanana-t2i-${Date.now()}` },
  });

  if (!job.name) {
    throw new Error('Failed to create batch job');
  }

  console.log(`Text-to-Image batch job submitted: ${job.name}`);

  return {
    jobName: job.name,
    tempFilePath,
  };
}

/**
 * Submit a batch job for image-to-image transformation
 */
export async function submitImageToImageBatch(
  files: FileInfo[],
  prompt: string,
  outputSize: OutputSize,
  aspectRatio: AspectRatio = '1:1',
  temperature: number = 1
): Promise<{ jobName: string; tempFilePath: string }> {
  const ai = getClient();

  // Filter out missing files first
  const validFiles = files.filter((file) => {
    if (!existsSync(file.path)) {
      console.warn(`Skipping missing file: ${file.path}`);
      return false;
    }
    return true;
  });

  const requests: BatchRequest[] = validFiles.map((file) => ({
    key: file.id,
    request: {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: readImageAsBase64(file.path),
                mimeType: getMimeType(file.path),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature,
        responseModalities: ['IMAGE'],
        imageConfig: {
          imageSize: outputSize,
          aspectRatio,
        },
      },
    },
  }));

  if (requests.length === 0) {
    throw new Error('No valid files to process');
  }

  // Write JSONL file
  const jsonl = requests.map((r) => JSON.stringify(r)).join('\n');
  const tempFilePath = join(process.cwd(), 'data', `batch-i2i-${Date.now()}.jsonl`);
  writeFileSync(tempFilePath, jsonl);

  // Upload JSONL file to Gemini Files API
  const uploadedFile = await ai.files.upload({
    file: tempFilePath,
    config: { mimeType: 'application/json' },
  });

  if (!uploadedFile.name) {
    throw new Error('Failed to upload batch file');
  }

  // Submit batch job
  const job = await ai.batches.create({
    model: MODEL,
    src: uploadedFile.name,
    config: { displayName: `nanobanana-i2i-${Date.now()}` },
  });

  if (!job.name) {
    throw new Error('Failed to create batch job');
  }

  console.log(`Image-to-Image batch job submitted: ${job.name}`);

  return {
    jobName: job.name,
    tempFilePath,
  };
}

/**
 * Check batch job status
 */
export async function checkBatchJobStatus(jobName: string): Promise<BatchJob> {
  const ai = getClient();
  const job = await ai.batches.get({ name: jobName });
  return job as BatchJob;
}

/**
 * Download and parse batch job results
 * Returns map of item ID -> base64 image data or error
 */
export async function downloadBatchResults(
  jobName: string
): Promise<Map<string, { success: boolean; data?: string; error?: string }>> {
  const ai = getClient();

  // Get job to find results file
  const job = (await ai.batches.get({ name: jobName })) as BatchJob;

  if (job.state !== 'JOB_STATE_SUCCEEDED') {
    throw new Error(`Job not succeeded: ${job.state}`);
  }

  if (!job.dest?.fileName) {
    throw new Error('No results file found');
  }

  // Download results file to temp location
  const downloadPath = join(process.cwd(), 'data', `results-${Date.now()}.jsonl`);
  await ai.files.download({
    file: job.dest.fileName,
    downloadPath,
  });

  // Parse results into map using line-by-line streaming
  const resultMap = new Map<string, { success: boolean; data?: string; error?: string }>();

  const rl = createInterface({
    input: createReadStream(downloadPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    const result: BatchResult = JSON.parse(line);
    const itemId = result.key;

    if (result.error) {
      resultMap.set(itemId, {
        success: false,
        error: result.error.message || 'Unknown error',
      });
    } else if (result.response?.candidates?.[0]?.content?.parts) {
      const imagePart = result.response.candidates[0].content.parts.find(
        (part) => part.inlineData?.data
      );

      if (imagePart?.inlineData?.data) {
        resultMap.set(itemId, {
          success: true,
          data: imagePart.inlineData.data,
        });
      } else {
        resultMap.set(itemId, {
          success: false,
          error: 'No image data in response',
        });
      }
    } else {
      resultMap.set(itemId, {
        success: false,
        error: 'Invalid response format',
      });
    }
  }

  // Clean up temp results file
  try {
    unlinkSync(downloadPath);
  } catch {}

  return resultMap;
}

/**
 * Clean up temporary JSONL file
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch (error) {
    console.warn(`Failed to cleanup temp file: ${filePath}`);
  }
}

/**
 * Cancel a batch job
 */
export async function cancelBatchJob(batchJobName: string): Promise<void> {
  const ai = getClient();
  await ai.batches.cancel({ name: batchJobName });
}
