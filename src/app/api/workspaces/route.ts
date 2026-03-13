import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { workspaces } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';
import { now } from '@/lib/utils';

export async function GET() {
  const all = db.select().from(workspaces).all();
  return NextResponse.json(all);
}

export async function POST(request: Request) {
  const body = await request.json();
  const id = body.id || uuid();
  const timestamp = now();

  const ws = {
    id,
    name: body.name || 'Untitled',
    description: body.description || '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.insert(workspaces).values(ws).run();
  return NextResponse.json(ws, { status: 201 });
}
