import { NextResponse } from 'next/server';
import { DATA_DIR } from '@/lib/db';
import path from 'path';
import fs from 'fs';
import os from 'os';

const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');

interface Settings {
  whisperPath: string;
  syncProvider: 'none' | 'dropbox' | 'gdrive' | 'syncthing' | 'custom';
  syncPath: string;
  autoSync: boolean;
}

function getDefaults(): Settings {
  return {
    whisperPath: path.join(os.homedir(), 'Documents', 'superwhisper', 'recordings'),
    syncProvider: 'none',
    syncPath: '',
    autoSync: false,
  };
}

function load(): Settings {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return { ...getDefaults(), ...JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8')) };
    }
  } catch {}
  return getDefaults();
}

function save(settings: Settings) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export async function GET() {
  return NextResponse.json(load());
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const current = load();
  const updated = { ...current, ...body };
  save(updated);
  return NextResponse.json(updated);
}
