import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  createTextToImageJob,
  createImageToImageJob,
  getJobs,
  getJobItems,
  updateJobStatus,
  updateJobBatchInfo,
  updateJobProgress,
  updateJobItem,
  type OutputSize,
  type Temperature,
  type AspectRatio,
} from '@/lib/db';
import {
  submitTextToImageBatch,
  submitImageToImageBatch,
} from '@/lib/gemini';

const RESULTS_DIR = path.join(process.cwd(), 'data', 'results');

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// GET - List jobs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // If requesting active jobs, return the most recent pending/processing job
    if (status === 'active') {
      const jobs = getJobs();
      const activeJob = jobs.find(
        (j) => j.status === 'pending' || j.status === 'processing'
      );

      if (activeJob) {
        const items = getJobItems(activeJob.id);
        return NextResponse.json({ job: activeJob, items });
      }
      return NextResponse.json({ job: null, items: [] });
    }

    const jobs = getJobs();
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    return NextResponse.json({ jobs: [] });
  }
}

// POST - Create and start a new job
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode } = body;

    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 400 });
    }

    if (mode === 'text-to-image') {
      return handleTextToImage(body);
    } else if (mode === 'image-to-image') {
      return handleImageToImage(body);
    } else {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to create job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 500 }
    );
  }
}

async function handleTextToImage(body: {
  prompts: string[];
  outputSize: OutputSize;
  temperature: Temperature;
  aspectRatio: AspectRatio;
}) {
  const { prompts, outputSize, temperature, aspectRatio } = body;

  if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
    return NextResponse.json({ error: 'Prompts are required' }, { status: 400 });
  }

  const validPrompts = prompts.filter((p) => typeof p === 'string' && p.trim());

  // Create job in database
  const { job, items } = createTextToImageJob({
    prompt: validPrompts[0], // Store first prompt as main prompt
    outputSize: outputSize || '1K',
    temperature: temperature ?? 1,
    aspectRatio: aspectRatio || '1:1',
    prompts: validPrompts,
  });

  // Submit batch job to Gemini
  submitTextToImageBatchJob(job.id, items, outputSize || '1K', aspectRatio || '1:1', temperature ?? 1);

  return NextResponse.json({ job, items });
}

async function handleImageToImage(body: {
  prompt: string;
  imagePaths: string[];
  outputSize: OutputSize;
  temperature: Temperature;
  aspectRatio: AspectRatio;
}) {
  const { prompt, imagePaths, outputSize, temperature, aspectRatio } = body;

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  if (!imagePaths || !Array.isArray(imagePaths) || imagePaths.length === 0) {
    return NextResponse.json({ error: 'Image paths are required' }, { status: 400 });
  }

  const validPaths = imagePaths.filter((p) => typeof p === 'string' && p.trim());

  // Create job in database
  const { job, items } = createImageToImageJob({
    prompt,
    outputSize: outputSize || '1K',
    temperature: temperature ?? 1,
    aspectRatio: aspectRatio || '1:1',
    imagePaths: validPaths,
  });

  // Submit batch job to Gemini
  submitImageToImageBatchJob(job.id, items, prompt, outputSize || '1K', aspectRatio || '1:1', temperature ?? 1);

  return NextResponse.json({ job, items });
}

// Submit text-to-image batch (runs in background)
async function submitTextToImageBatchJob(
  jobId: string,
  items: Array<{ id: string; input_prompt: string | null }>,
  outputSize: OutputSize,
  aspectRatio: AspectRatio,
  temperature: number
) {
  try {
    // Mark all items as processing
    for (const item of items) {
      updateJobItem(item.id, { status: 'processing' });
    }

    // Prepare batch items
    const batchItems = items.map((item) => ({
      id: item.id,
      prompt: item.input_prompt || '',
    }));

    // Submit to Gemini Batch API
    const { jobName, tempFilePath } = await submitTextToImageBatch(batchItems, outputSize, aspectRatio, temperature);

    // Store batch info in database
    updateJobBatchInfo(jobId, jobName, tempFilePath);

    console.log(`T2I batch submitted for job ${jobId}: ${jobName}`);
  } catch (error) {
    console.error('Failed to submit T2I batch:', error);
    updateJobStatus(jobId, 'failed');

    // Mark all items as failed
    for (const item of items) {
      updateJobItem(item.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Batch submission failed',
      });
    }
    updateJobProgress(jobId, 0, items.length);
  }
}

// Submit image-to-image batch (runs in background)
async function submitImageToImageBatchJob(
  jobId: string,
  items: Array<{ id: string; input_image_path: string | null }>,
  prompt: string,
  outputSize: OutputSize,
  aspectRatio: AspectRatio,
  temperature: number
) {
  try {
    // Mark all items as processing
    for (const item of items) {
      updateJobItem(item.id, { status: 'processing' });
    }

    // Prepare batch files
    const files = items.map((item) => ({
      id: item.id,
      path: item.input_image_path || '',
    }));

    // Submit to Gemini Batch API
    const { jobName, tempFilePath } = await submitImageToImageBatch(files, prompt, outputSize, aspectRatio, temperature);

    // Store batch info in database
    updateJobBatchInfo(jobId, jobName, tempFilePath);

    console.log(`I2I batch submitted for job ${jobId}: ${jobName}`);
  } catch (error) {
    console.error('Failed to submit I2I batch:', error);
    updateJobStatus(jobId, 'failed');

    // Mark all items as failed
    for (const item of items) {
      updateJobItem(item.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Batch submission failed',
      });
    }
    updateJobProgress(jobId, 0, items.length);
  }
}
