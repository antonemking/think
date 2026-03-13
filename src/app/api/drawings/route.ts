import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { drawings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { now } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
  }

  const all = db.select().from(drawings).where(eq(drawings.workspaceId, workspaceId)).all();
  return NextResponse.json(all);
}

export async function POST(request: Request) {
  const body = await request.json();
  const id = body.id || uuid();

  const drawing = {
    id,
    workspaceId: body.workspaceId,
    pathData: body.pathData,
    color: body.color || '#000000',
    strokeWidth: body.strokeWidth ?? 2,
    createdAt: now(),
  };

  db.insert(drawings).values(drawing).run();
  return NextResponse.json(drawing, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
  }

  db.delete(drawings).where(eq(drawings.workspaceId, workspaceId)).run();
  return NextResponse.json({ ok: true });
}
