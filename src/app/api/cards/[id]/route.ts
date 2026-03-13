import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cards } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { now } from '@/lib/utils';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = db.select().from(cards).where(eq(cards.id, id)).get();
  if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(card);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, any> = { updatedAt: now() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;
  if (body.positionX !== undefined) updates.positionX = body.positionX;
  if (body.positionY !== undefined) updates.positionY = body.positionY;
  if (body.width !== undefined) updates.width = body.width;
  if (body.height !== undefined) updates.height = body.height;
  if (body.searchText !== undefined) updates.searchText = body.searchText;
  if (body.metadata !== undefined) updates.metadata = typeof body.metadata === 'string' ? body.metadata : JSON.stringify(body.metadata);

  db.update(cards).set(updates).where(eq(cards.id, id)).run();

  const updated = db.select().from(cards).where(eq(cards.id, id)).get();
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.delete(cards).where(eq(cards.id, id)).run();
  return NextResponse.json({ success: true });
}
