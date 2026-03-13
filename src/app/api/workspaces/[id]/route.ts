import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { workspaces } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { now } from '@/lib/utils';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ws = db.select().from(workspaces).where(eq(workspaces.id, id)).get();
  if (!ws) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(ws);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  db.update(workspaces)
    .set({ ...body, updatedAt: now() })
    .where(eq(workspaces.id, id))
    .run();

  const updated = db.select().from(workspaces).where(eq(workspaces.id, id)).get();
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.delete(workspaces).where(eq(workspaces.id, id)).run();
  return NextResponse.json({ success: true });
}
