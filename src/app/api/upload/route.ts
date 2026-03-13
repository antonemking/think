import { NextResponse } from 'next/server';
import { db, UPLOADS_DIR } from '@/lib/db';
import { cards } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';
import { now } from '@/lib/utils';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const workspaceId = formData.get('workspaceId') as string;
  const positionX = parseFloat(formData.get('positionX') as string) || 0;
  const positionY = parseFloat(formData.get('positionY') as string) || 0;

  if (!file || !workspaceId) {
    return NextResponse.json({ error: 'file and workspaceId required' }, { status: 400 });
  }

  const id = uuid();
  const ext = path.extname(file.name).toLowerCase();
  const filename = `${id}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  // Save file to disk
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  // Determine card type
  let cardType = 'document';
  if (ext === '.pdf') cardType = 'pdf';
  else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) cardType = 'image';

  // Extract text from PDF for search
  let searchText = file.name;
  if (ext === '.pdf') {
    try {
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = (pdfParseModule as any).default || pdfParseModule;
      const pdfData = await pdfParse(buffer);
      searchText = `${file.name} ${pdfData.text.substring(0, 10000)}`;
    } catch (e) {
      console.error('PDF text extraction failed:', e);
    }
  }

  const timestamp = now();
  const card = {
    id,
    workspaceId,
    type: cardType,
    title: file.name,
    content: '',
    positionX,
    positionY,
    width: cardType === 'pdf' ? 240 : 280,
    height: null,
    sourcePath: `uploads/${filename}`,
    thumbnailPath: null,
    metadata: JSON.stringify({
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    }),
    searchText,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.insert(cards).values(card).run();
  return NextResponse.json(card, { status: 201 });
}
