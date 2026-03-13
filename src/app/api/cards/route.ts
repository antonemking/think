import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cards } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { now } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
  }

  const all = db.select().from(cards).where(eq(cards.workspaceId, workspaceId)).all();
  return NextResponse.json(all);
}

export async function POST(request: Request) {
  const body = await request.json();
  const id = body.id || uuid();
  const timestamp = now();

  const card = {
    id,
    workspaceId: body.workspaceId,
    type: body.type || 'note',
    title: body.title || '',
    content: body.content || '',
    positionX: body.positionX ?? 0,
    positionY: body.positionY ?? 0,
    width: body.width ?? (body.type === 'concept' ? null : 280),
    height: body.height ?? null,
    sourcePath: body.sourcePath || null,
    thumbnailPath: body.thumbnailPath || null,
    sourceCardId: body.sourceCardId || null,
    metadata: body.metadata ? JSON.stringify(body.metadata) : '{}',
    searchText: body.searchText || `${body.title || ''} ${(body.content || '').replace(/<[^>]*>/g, '')}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.insert(cards).values(card).run();
  return NextResponse.json(card, { status: 201 });
}
