import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { edges } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { now } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
  }

  const all = db.select().from(edges).where(eq(edges.workspaceId, workspaceId)).all();
  return NextResponse.json(all);
}

export async function POST(request: Request) {
  const body = await request.json();
  const id = body.id || uuid();

  const edge = {
    id,
    workspaceId: body.workspaceId,
    sourceCardId: body.sourceCardId,
    targetCardId: body.targetCardId,
    label: body.label || '',
    edgeType: body.edgeType || 'relation',
    createdAt: now(),
  };

  db.insert(edges).values(edge).run();
  return NextResponse.json(edge, { status: 201 });
}
