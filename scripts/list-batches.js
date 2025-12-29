const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('No GEMINI_API_KEY in environment');
  process.exit(1);
}

async function listBatches() {
  const ai = new GoogleGenAI({ apiKey });
  console.log('Fetching batches...\n');

  const batches = await ai.batches.list();
  let count = 0;

  for await (const batch of batches) {
    count++;
    console.log(`--- Batch ${count} ---`);
    console.log(`Name: ${batch.name}`);
    console.log(`State: ${batch.state}`);
    console.log(`Display Name: ${batch.displayName || 'N/A'}`);
    if (batch.batchStats) {
      console.log(`Stats: ${JSON.stringify(batch.batchStats)}`);
    }
    if (batch.dest?.fileName) {
      console.log(`Results File: ${batch.dest.fileName}`);
    }
    console.log('');
  }

  if (count === 0) {
    console.log('No batches found');
  } else {
    console.log(`Total: ${count} batches`);
  }
}

listBatches().catch(console.error);
