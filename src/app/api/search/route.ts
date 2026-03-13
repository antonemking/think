import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cards, workspaces } from '@/lib/db/schema';
import { like, or, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const workspaceId = searchParams.get('workspaceId');

  if (!query) {
    return NextResponse.json([]);
  }

  const pattern = `%${query}%`;

  let results;
  if (workspaceId) {
    results = db
      .select({
        id: cards.id,
        title: cards.title,
        content: cards.content,
        type: cards.type,
        workspaceId: cards.workspaceId,
        searchText: cards.searchText,
      })
      .from(cards)
      .where(
        or(
          like(cards.title, pattern),
          like(cards.searchText, pattern),
          like(cards.content, pattern)
        )
      )
      .all()
      .filter((c) => c.workspaceId === workspaceId);
  } else {
    results = db
      .select({
        id: cards.id,
        title: cards.title,
        content: cards.content,
        type: cards.type,
        workspaceId: cards.workspaceId,
        searchText: cards.searchText,
      })
      .from(cards)
      .where(
        or(
          like(cards.title, pattern),
          like(cards.searchText, pattern),
          like(cards.content, pattern)
        )
      )
      .all();
  }

  // Enrich with workspace names
  const wsMap = new Map(
    db.select().from(workspaces).all().map((w) => [w.id, w.name])
  );

  const enriched = results.map((r) => ({
    ...r,
    workspaceName: wsMap.get(r.workspaceId) || 'Unknown',
    // Don't send full searchText to client
    searchText: undefined,
  }));

  return NextResponse.json(enriched.slice(0, 50));
}
