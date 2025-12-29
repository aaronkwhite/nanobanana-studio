import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getJob,
  getJobItems,
  updateJobStatus,
  updateJobProgress,
  updateJobItem,
  deleteJob,
} from '@/lib/db';
import {
  checkBatchJobStatus,
  downloadBatchResults,
  cleanupTempFile,
  cancelBatchJob,
  COMPLETED_STATES,
} from '@/lib/gemini';

const RESULTS_DIR = path.join(process.cwd(), 'data', 'results');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = getJob(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // If job is processing and has a batch job, check its status
    if (job.status === 'processing' && job.batch_job_name) {
      await checkAndUpdateBatchStatus(job.id, job.batch_job_name, job.batch_temp_file);
    }

    // Fetch updated job and items
    const updatedJob = getJob(id);
    const items = getJobItems(id);

    return NextResponse.json({ job: updatedJob, items });
  } catch (error) {
    console.error('Failed to fetch job:', error);
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
  }
}

async function checkAndUpdateBatchStatus(
  jobId: string,
  batchJobName: string,
  batchTempFile: string | null
) {
  try {
    const batchStatus = await checkBatchJobStatus(batchJobName);

    console.log(`Batch ${batchJobName} status: ${batchStatus.state}`);

    // Update progress from batch stats if available
    if (batchStatus.batchStats) {
      const completed = batchStatus.batchStats.succeededCount || 0;
      const failed = batchStatus.batchStats.failedCount || 0;
      updateJobProgress(jobId, completed, failed);
    }

    // Check if batch is complete
    if (COMPLETED_STATES.has(batchStatus.state)) {
      if (batchStatus.state === 'JOB_STATE_SUCCEEDED') {
        // Download and process results
        await processCompletedBatch(jobId, batchJobName);
      } else {
        // Batch failed or cancelled
        updateJobStatus(jobId, 'failed');

        // Mark all items as failed
        const items = getJobItems(jobId);
        for (const item of items) {
          if (item.status === 'processing') {
            updateJobItem(item.id, {
              status: 'failed',
              error: batchStatus.error?.message || `Batch ${batchStatus.state}`,
            });
          }
        }
      }

      // Cleanup temp file
      if (batchTempFile) {
        cleanupTempFile(batchTempFile);
      }
    }
  } catch (error) {
    console.error('Failed to check batch status:', error);
    // Don't fail the job on status check errors - will retry on next poll
  }
}

async function processCompletedBatch(jobId: string, batchJobName: string) {
  try {
    const results = await downloadBatchResults(batchJobName);
    const items = getJobItems(jobId);

    let completed = 0;
    let failed = 0;

    for (const item of items) {
      const result = results.get(item.id);

      if (result?.success && result.data) {
        // Save image to disk
        const filename = `${item.id}.png`;
        const filepath = path.join(RESULTS_DIR, filename);
        const buffer = Buffer.from(result.data, 'base64');
        fs.writeFileSync(filepath, buffer);

        updateJobItem(item.id, {
          status: 'completed',
          output_image_path: filepath,
        });
        completed++;
      } else {
        updateJobItem(item.id, {
          status: 'failed',
          error: result?.error || 'No result found',
        });
        failed++;
      }
    }

    updateJobProgress(jobId, completed, failed);
    updateJobStatus(jobId, failed === items.length ? 'failed' : 'completed');

    console.log(`Batch ${batchJobName} processed: ${completed} completed, ${failed} failed`);
  } catch (error) {
    console.error('Failed to process batch results:', error);
    updateJobStatus(jobId, 'failed');
  }
}

// DELETE - Cancel a job
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = getJob(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Cancel the Gemini batch job if still running
    if ((job.status === 'pending' || job.status === 'processing') && job.batch_job_name) {
      try {
        await cancelBatchJob(job.batch_job_name);
        console.log(`Cancelled batch job: ${job.batch_job_name}`);
      } catch (error) {
        console.error('Failed to cancel batch job:', error);
        // Continue to update local status even if Gemini cancel fails
      }
    }

    // Clean up temp file
    if (job.batch_temp_file) {
      cleanupTempFile(job.batch_temp_file);
    }

    // Delete job from database
    deleteJob(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to cancel job:', error);
    return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 });
  }
}
