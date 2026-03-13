import { NextResponse } from 'next/server';
import { db, DATA_DIR } from '@/lib/db';
import { cards, workspaces } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { now } from '@/lib/utils';
import path from 'path';
import fs from 'fs';
import os from 'os';

function getWhisperDir(): string {
  const settingsPath = path.join(DATA_DIR, 'settings.json');
  try {
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (settings.whisperPath) return settings.whisperPath;
    }
  } catch {}
  return path.join(os.homedir(), 'Documents', 'superwhisper', 'recordings');
}
const WORKSPACE_NAME = 'Voice Notes';
const CARDS_PER_ROW = 6;
const CARD_WIDTH = 240;
const CARD_HEIGHT = 160;
const GAP_X = 20;
const GAP_Y = 20;

interface WhisperMeta {
  datetime: string;
  result: string;
  rawResult?: string;
  duration: number;
  modelKey?: string;
  modeName?: string;
  segments?: { start: number; end: number; text: string }[];
}

export async function POST() {
  const WHISPER_DIR = getWhisperDir();
  if (!fs.existsSync(WHISPER_DIR)) {
    return NextResponse.json({ error: 'SuperWhisper recordings directory not found' }, { status: 404 });
  }

  // Get or create Voice Notes workspace
  let workspace = db.select().from(workspaces).where(eq(workspaces.name, WORKSPACE_NAME)).get();
  if (!workspace) {
    const id = uuid();
    const timestamp = now();
    db.insert(workspaces).values({
      id, name: WORKSPACE_NAME, description: 'Auto-imported SuperWhisper voice recordings',
      icon: 'mic', pinned: 1,
      createdAt: timestamp, updatedAt: timestamp,
    }).run();
    workspace = db.select().from(workspaces).where(eq(workspaces.id, id)).get()!;
  } else if (!workspace.pinned) {
    // Ensure existing Voice Notes workspace is pinned with mic icon
    db.update(workspaces).set({ icon: 'mic', pinned: 1 }).where(eq(workspaces.id, workspace.id)).run();
  }

  // Get existing cards to avoid re-importing (use metadata.whisperDir as key)
  const existingCards = db.select().from(cards).where(eq(cards.workspaceId, workspace.id)).all();
  const importedDirs = new Set(
    existingCards.map((c) => {
      try { return JSON.parse(c.metadata).whisperDir; } catch { return null; }
    }).filter(Boolean)
  );

  // Scan recordings
  const dirs = fs.readdirSync(WHISPER_DIR).filter((d) => {
    const full = path.join(WHISPER_DIR, d);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'meta.json'));
  });

  let skipped = 0;
  const timestamp = now();

  // Sort newest first so new recordings appear at the top
  dirs.sort().reverse();

  // Collect new recordings to import
  const toImport: { dir: string; meta: WhisperMeta }[] = [];
  for (const dir of dirs) {
    if (importedDirs.has(dir)) { skipped++; continue; }
    const metaPath = path.join(WHISPER_DIR, dir, 'meta.json');
    let meta: WhisperMeta;
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch { continue; }
    const text = (meta.result || '').trim();
    if (!text || text.length < 3) { skipped++; continue; }
    toImport.push({ dir, meta });
  }

  // Shift existing cards down to make room for new ones at the top
  if (toImport.length > 0 && existingCards.length > 0) {
    const newRows = Math.ceil(toImport.length / CARDS_PER_ROW);
    const shiftY = newRows * (CARD_HEIGHT + GAP_Y);
    for (const card of existingCards) {
      db.update(cards)
        .set({ positionY: card.positionY + shiftY })
        .where(eq(cards.id, card.id))
        .run();
    }
  }

  let imported = 0;
  for (let i = 0; i < toImport.length; i++) {
    const { dir, meta } = toImport[i];
    const text = (meta.result || '').trim();

    // Generate title from first ~60 chars
    const titleRaw = text.substring(0, 60);
    const title = titleRaw.includes(' ') && titleRaw.length >= 60
      ? titleRaw.substring(0, titleRaw.lastIndexOf(' ')) + '...'
      : titleRaw;

    // Format date
    const date = meta.datetime ? new Date(meta.datetime) : null;
    const dateStr = date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const durationSec = Math.round((meta.duration || 0) / 1000);

    // Grid position — new cards at the top, newest first
    const row = Math.floor(i / CARDS_PER_ROW);
    const col = i % CARDS_PER_ROW;
    const posX = col * (CARD_WIDTH + GAP_X);
    const posY = row * (CARD_HEIGHT + GAP_Y);

    const id = uuid();
    db.insert(cards).values({
      id,
      workspaceId: workspace.id,
      type: 'note',
      title,
      content: text,
      positionX: posX,
      positionY: posY,
      width: CARD_WIDTH,
      height: null,
      sourcePath: null,
      thumbnailPath: null,
      sourceCardId: null,
      metadata: JSON.stringify({
        whisperDir: dir,
        datetime: meta.datetime,
        duration: meta.duration,
        durationSec,
        dateStr,
        modelKey: meta.modelKey,
      }),
      searchText: `${title} ${text} ${dateStr}`,
      createdAt: meta.datetime || timestamp,
      updatedAt: timestamp,
    }).run();

    imported++;
  }

  return NextResponse.json({
    workspaceId: workspace.id,
    workspaceName: WORKSPACE_NAME,
    imported,
    skipped,
    total: dirs.length,
  });
}
