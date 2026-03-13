import { NextResponse } from 'next/server';
import { DATA_DIR } from '@/lib/db';
import path from 'path';
import fs from 'fs';

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const filePath = path.join(DATA_DIR, ...pathSegments);

  // Security: ensure path doesn't escape DATA_DIR
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(DATA_DIR))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
  const buffer = fs.readFileSync(resolved);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
