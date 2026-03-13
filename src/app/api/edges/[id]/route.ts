import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { edges } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.delete(edges).where(eq(edges.id, id)).run();
  return NextResponse.json({ success: true });
}
