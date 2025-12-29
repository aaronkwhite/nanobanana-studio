import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const RESULTS_DIR = path.join(process.cwd(), 'data', 'results');

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Sanitize filename to prevent directory traversal
    const sanitized = path.basename(filename);
    if (sanitized !== filename || filename.includes('..')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filepath = path.join(RESULTS_DIR, sanitized);

    // Check file exists
    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read file
    const buffer = fs.readFileSync(filepath);
    const ext = path.extname(filename).slice(1).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `inline; filename="${sanitized}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
