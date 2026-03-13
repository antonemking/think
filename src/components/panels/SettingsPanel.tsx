'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Mic, FolderOpen, RefreshCw, Check, Cloud, CloudOff, Upload, Download, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Settings {
  whisperPath: string;
  syncProvider: 'none' | 'dropbox' | 'gdrive' | 'custom';
  syncPath: string;
  autoSync: boolean;
}

interface SyncStatus {
  status: string;
  provider?: string;
  syncPath?: string;
  folderExists?: boolean;
  hasBackup?: boolean;
  lastSync?: string | null;
}

interface SettingsPanelProps {
  onClose: () => void;
  onSyncWhisper: () => void;
}

const SYNC_PROVIDERS = [
  { value: 'none', label: 'None', icon: CloudOff },
  { value: 'dropbox', label: 'Dropbox', icon: Cloud },
  { value: 'gdrive', label: 'Google Drive', icon: Cloud },
  { value: 'custom', label: 'Custom Path', icon: HardDrive },
] as const;

const SYNC_PATHS: Record<string, string> = {
  dropbox: '~/Dropbox/ThinkCanvas',
  gdrive: '~/Google Drive/My Drive/ThinkCanvas',
  custom: '',
};

export function SettingsPanel({ onClose, onSyncWhisper }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings>({ whisperPath: '', syncProvider: 'none', syncPath: '', autoSync: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then(setSettings);
    fetch('/api/sync').then((r) => r.json()).then(setSyncStatus);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const saveSetting = useCallback(async (updates: Partial<Settings>) => {
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const updated = await res.json();
    setSettings(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Refresh sync status
    fetch('/api/sync').then((r) => r.json()).then(setSyncStatus);
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/whisper/import', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(`Imported ${data.imported} new, ${data.skipped} skipped`);
        onSyncWhisper();
      } else {
        setSyncResult(data.error || 'Import failed');
      }
    } catch {
      setSyncResult('Import failed');
    }
    setSyncing(false);
  }, [onSyncWhisper]);

  const handleCloudSync = useCallback(async (direction: 'push' | 'pull') => {
    if (direction === 'push') setPushing(true);
    else setPulling(true);
    setSyncMsg(null);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMsg(direction === 'push'
          ? `Backed up at ${new Date(data.timestamp).toLocaleTimeString()}`
          : 'Pulled! Reload the page to see changes.');
        fetch('/api/sync').then((r) => r.json()).then(setSyncStatus);
      } else {
        setSyncMsg(data.error || 'Sync failed');
      }
    } catch {
      setSyncMsg('Sync failed');
    }
    setPushing(false);
    setPulling(false);
  }, []);

  const handleProviderChange = (provider: string) => {
    const syncPath = SYNC_PATHS[provider] || settings.syncPath;
    setSettings((s) => ({ ...s, syncProvider: provider as Settings['syncProvider'], syncPath }));
    saveSetting({ syncProvider: provider as Settings['syncProvider'], syncPath });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[480px] max-h-[80vh] bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-200 animate-scale-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">Settings</h2>
          <div className="flex items-center gap-2">
            {saved && (
              <div className="flex items-center text-xs text-green-600 gap-1">
                <Check className="w-3 h-3" />
                Saved
              </div>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-6 overflow-y-auto">
          {/* Voice Notes Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Mic className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-medium text-gray-700">Voice Notes (SuperWhisper)</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Recordings directory</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    className="flex-1 text-sm text-gray-700 bg-transparent outline-none"
                    value={settings.whisperPath}
                    onChange={(e) => setSettings({ ...settings, whisperPath: e.target.value })}
                    onBlur={() => saveSetting({ whisperPath: settings.whisperPath })}
                    placeholder="~/Documents/superwhisper/recordings"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Voice Notes'}
                </button>
                {syncResult && (
                  <span className="text-xs text-gray-600">{syncResult}</span>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100" />

          {/* Cloud Sync Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-medium text-gray-700">Cloud Sync</h3>
            </div>

            <div className="space-y-3">
              {/* Provider selection */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Sync provider</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {SYNC_PROVIDERS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => handleProviderChange(p.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors border',
                        settings.syncProvider === p.value
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                      )}
                    >
                      <p.icon className="w-4 h-4" />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sync path */}
              {settings.syncProvider !== 'none' && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Sync folder path</label>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      className="flex-1 text-sm text-gray-700 bg-transparent outline-none"
                      value={settings.syncPath}
                      onChange={(e) => setSettings({ ...settings, syncPath: e.target.value })}
                      onBlur={() => saveSetting({ syncPath: settings.syncPath })}
                      placeholder={SYNC_PATHS[settings.syncProvider] || '/path/to/sync/folder'}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {settings.syncProvider === 'dropbox' && 'Point to a folder inside your Dropbox directory'}
                    {settings.syncProvider === 'gdrive' && 'Point to a folder inside your Google Drive directory'}
                    {settings.syncProvider === 'custom' && 'Any folder — use a network drive, NAS, or any synced path'}
                  </p>
                </div>
              )}

              {/* Sync actions */}
              {settings.syncProvider !== 'none' && settings.syncPath && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCloudSync('push')}
                      disabled={pushing || pulling}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Upload className={`w-3.5 h-3.5 ${pushing ? 'animate-pulse' : ''}`} />
                      {pushing ? 'Pushing...' : 'Push to cloud'}
                    </button>
                    <button
                      onClick={() => handleCloudSync('pull')}
                      disabled={pushing || pulling}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      <Download className={`w-3.5 h-3.5 ${pulling ? 'animate-pulse' : ''}`} />
                      {pulling ? 'Pulling...' : 'Pull from cloud'}
                    </button>
                  </div>

                  {syncMsg && (
                    <p className="text-xs text-gray-600">{syncMsg}</p>
                  )}

                  {syncStatus?.lastSync && (
                    <p className="text-[10px] text-gray-400">
                      Last synced: {new Date(syncStatus.lastSync).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
