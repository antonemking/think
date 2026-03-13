import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cards, workspaces } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ws = db.select().from(workspaces).where(eq(workspaces.id, id)).get();
  if (!ws) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const allCards = db.select().from(cards).where(eq(cards.workspaceId, id)).all();
  const cardCount = allCards.filter((c) => c.type !== 'portal' && c.type !== 'reference').length;

  return NextResponse.json({
    id: ws.id,
    name: ws.name,
    cardCount,
  });
}
