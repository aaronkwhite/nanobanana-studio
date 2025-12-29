const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const apiKey = process.env.GEMINI_API_KEY;
const batchName = process.argv[2] || 'batches/2bep3uiu8d5e8j9dunm268fu2zpr6pofqd6q';

if (!apiKey) {
  console.error('No GEMINI_API_KEY in environment');
  process.exit(1);
}

const RESULTS_DIR = path.join(__dirname, '..', 'data', 'results');

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

async function downloadBatch() {
  const ai = new GoogleGenAI({ apiKey });

  console.log(`Fetching batch: ${batchName}\n`);

  const job = await ai.batches.get({ name: batchName });
  console.log(`State: ${job.state}`);
  console.log(`Display Name: ${job.displayName}`);

  if (job.state !== 'JOB_STATE_SUCCEEDED') {
    console.error(`Job not succeeded: ${job.state}`);
    process.exit(1);
  }

  if (!job.dest?.fileName) {
    console.error('No results file found');
    process.exit(1);
  }

  console.log(`Results File: ${job.dest.fileName}`);

  // Download results file
  const downloadPath = path.join(__dirname, '..', 'data', `results-${Date.now()}.jsonl`);
  console.log(`\nDownloading to: ${downloadPath}`);

  await ai.files.download({
    file: job.dest.fileName,
    downloadPath,
  });

  console.log('Download complete!\n');

  // Parse and save images
  const rl = readline.createInterface({
    input: fs.createReadStream(downloadPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let count = 0;
  let saved = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    count++;

    const result = JSON.parse(line);
    const itemId = result.key;

    if (result.error) {
      console.log(`[${count}] ${itemId}: ERROR - ${result.error.message}`);
    } else if (result.response?.candidates?.[0]?.content?.parts) {
      const imagePart = result.response.candidates[0].content.parts.find(
        (part) => part.inlineData?.data
      );

      if (imagePart?.inlineData?.data) {
        const filename = `${itemId}.png`;
        const filepath = path.join(RESULTS_DIR, filename);
        const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
        fs.writeFileSync(filepath, imageBuffer);
        saved++;
        console.log(`[${count}] ${itemId}: SAVED -> ${filename}`);
      } else {
        console.log(`[${count}] ${itemId}: No image data`);
      }
    } else {
      console.log(`[${count}] ${itemId}: Invalid response`);
    }
  }

  // Clean up temp file
  fs.unlinkSync(downloadPath);

  console.log(`\nTotal: ${count} results, ${saved} images saved to ${RESULTS_DIR}`);
}

downloadBatch().catch(console.error);
