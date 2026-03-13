import { NextResponse } from 'next/server';
import { DATA_DIR } from '@/lib/db';
import path from 'path';
import fs from 'fs';

function getSettings() {
  const settingsPath = path.join(DATA_DIR, 'settings.json');
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch {
    return {};
  }
}

function getSyncDir(settings: any): string | null {
  if (settings.syncProvider === 'none' || !settings.syncPath) return null;
  const syncPath = settings.syncPath.replace(/^~/, process.env.HOME || '');
  return syncPath;
}

function copyRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      // Skip WAL temp files during copy
      if (item.endsWith('-shm')) continue;
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    // Only copy if source is newer or dest doesn't exist
    if (!fs.existsSync(dest) || fs.statSync(dest).mtimeMs < stat.mtimeMs) {
      fs.copyFileSync(src, dest);
    }
  }
}

// GET: check sync status
export async function GET() {
  const settings = getSettings();
  const syncDir = getSyncDir(settings);

  if (!syncDir) {
    return NextResponse.json({ status: 'not_configured' });
  }

  const exists = fs.existsSync(syncDir);
  const hasBackup = exists && fs.existsSync(path.join(syncDir, 'think.db'));

  let lastSync: string | null = null;
  const metaPath = path.join(DATA_DIR, '.last-sync');
  if (fs.existsSync(metaPath)) {
    lastSync = fs.readFileSync(metaPath, 'utf-8').trim();
  }

  return NextResponse.json({
    status: 'configured',
    provider: settings.syncProvider,
    syncPath: syncDir,
    folderExists: exists,
    hasBackup,
    lastSync,
  });
}

// POST: trigger sync (backup to sync folder)
export async function POST(request: Request) {
  const settings = getSettings();
  const syncDir = getSyncDir(settings);

  if (!syncDir) {
    return NextResponse.json({ error: 'Sync not configured' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const direction = body.direction || 'push'; // 'push' = local → cloud, 'pull' = cloud → local

    if (direction === 'push') {
      // Copy local data → sync folder
      if (!fs.existsSync(syncDir)) fs.mkdirSync(syncDir, { recursive: true });

      // Copy DB file (checkpoint WAL first by re-opening)
      const dbSrc = path.join(DATA_DIR, 'think.db');
      const walSrc = path.join(DATA_DIR, 'think.db-wal');
      if (fs.existsSync(dbSrc)) {
        fs.copyFileSync(dbSrc, path.join(syncDir, 'think.db'));
      }
      if (fs.existsSync(walSrc)) {
        fs.copyFileSync(walSrc, path.join(syncDir, 'think.db-wal'));
      }

      // Copy uploads
      copyRecursive(path.join(DATA_DIR, 'uploads'), path.join(syncDir, 'uploads'));

      // Copy settings
      const settingsFile = path.join(DATA_DIR, 'settings.json');
      if (fs.existsSync(settingsFile)) {
        fs.copyFileSync(settingsFile, path.join(syncDir, 'settings.json'));
      }

      // Record sync time
      const now = new Date().toISOString();
      fs.writeFileSync(path.join(DATA_DIR, '.last-sync'), now);
      fs.writeFileSync(path.join(syncDir, '.last-sync'), now);

      return NextResponse.json({ success: true, direction: 'push', timestamp: now });

    } else if (direction === 'pull') {
      // Copy sync folder → local data
      if (!fs.existsSync(syncDir)) {
        return NextResponse.json({ error: 'Sync folder does not exist' }, { status: 404 });
      }

      const remoteDb = path.join(syncDir, 'think.db');
      if (!fs.existsSync(remoteDb)) {
        return NextResponse.json({ error: 'No backup found in sync folder' }, { status: 404 });
      }

      // Backup current local data first
      const backupDir = path.join(DATA_DIR, '.backup-' + Date.now());
      fs.mkdirSync(backupDir, { recursive: true });
      const localDb = path.join(DATA_DIR, 'think.db');
      if (fs.existsSync(localDb)) {
        fs.copyFileSync(localDb, path.join(backupDir, 'think.db'));
      }

      // Pull remote → local
      fs.copyFileSync(remoteDb, localDb);
      const remoteWal = path.join(syncDir, 'think.db-wal');
      if (fs.existsSync(remoteWal)) {
        fs.copyFileSync(remoteWal, path.join(DATA_DIR, 'think.db-wal'));
      }

      // Pull uploads
      copyRecursive(path.join(syncDir, 'uploads'), path.join(DATA_DIR, 'uploads'));

      const now = new Date().toISOString();
      fs.writeFileSync(path.join(DATA_DIR, '.last-sync'), now);

      return NextResponse.json({
        success: true,
        direction: 'pull',
        timestamp: now,
        backupDir: backupDir,
        note: 'Restart the app to load pulled data',
      });
    }

    return NextResponse.json({ error: 'Invalid direction' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
