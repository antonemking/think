import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cards, workspaces } from '@/lib/db/schema';
import { ne, like, or, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const excludeWorkspace = searchParams.get('exclude');

  const wsMap = new Map(
    db.select().from(workspaces).all().map((w) => [w.id, w.name])
  );

  let results;

  if (query) {
    const pattern = `%${query}%`;
    results = db
      .select()
      .from(cards)
      .where(
        or(
          like(cards.title, pattern),
          like(cards.searchText, pattern),
          like(cards.content, pattern)
        )
      )
      .all();
  } else {
    // Recent cards from other workspaces
    results = db.select().from(cards).all();
  }

  // Filter out current workspace and reference/portal types
  const filtered = results
    .filter((c) => {
      if (excludeWorkspace && c.workspaceId === excludeWorkspace) return false;
      if (c.type === 'portal' || c.type === 'reference') return false;
      return true;
    })
    .slice(0, 30)
    .map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      type: c.type,
      workspaceId: c.workspaceId,
      workspaceName: wsMap.get(c.workspaceId) || 'Unknown',
      sourcePath: c.sourcePath,
    }));

  return NextResponse.json(filtered);
}
