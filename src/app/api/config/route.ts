import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env.local');

function parseEnvFile(): Record<string, string> {
  try {
    if (!fs.existsSync(ENV_PATH)) {
      return {};
    }
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    return env;
  } catch {
    return {};
  }
}

function writeEnvFile(env: Record<string, string>): void {
  const content = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  fs.writeFileSync(ENV_PATH, content + '\n');
}

// GET - Check if API key exists (returns masked version)
export async function GET() {
  const env = parseEnvFile();
  const apiKey = env.GEMINI_API_KEY || '';

  if (apiKey) {
    // Return masked version
    const masked = apiKey.slice(0, 4) + '...' + apiKey.slice(-4);
    return NextResponse.json({ hasKey: true, masked });
  }

  return NextResponse.json({ hasKey: false, masked: null });
}

// POST - Save API key
export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
    }

    // Basic validation - Gemini keys start with 'AI'
    if (!apiKey.startsWith('AI')) {
      return NextResponse.json({ error: 'Invalid Gemini API key format' }, { status: 400 });
    }

    const env = parseEnvFile();
    env.GEMINI_API_KEY = apiKey;
    writeEnvFile(env);

    // Update process.env for current session
    process.env.GEMINI_API_KEY = apiKey;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 });
  }
}

// DELETE - Remove API key
export async function DELETE() {
  try {
    const env = parseEnvFile();
    delete env.GEMINI_API_KEY;
    writeEnvFile(env);
    delete process.env.GEMINI_API_KEY;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove API key' }, { status: 500 });
  }
}
