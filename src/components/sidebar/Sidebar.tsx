'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  Search,
  Download,
  Trash2,
  Layout,
  Settings,
  Mic,
  Pin,
  Pencil,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/lib/store/canvas-store';
import type { Workspace } from '@/types';

export function Sidebar() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [wsContextMenu, setWsContextMenu] = useState<{ x: number; y: number; wsId: string } | null>(null);
  const { activeWorkspaceId, setActiveWorkspace, sidebarCollapsed, setSidebarCollapsed, toggleSearch, toggleSettings } =
    useCanvasStore();

  const loadWorkspaces = useCallback(async () => {
    const res = await fetch('/api/workspaces');
    const data = await res.json();
    setWorkspaces(data);

    // Auto-select first workspace if none active
    if (!activeWorkspaceId && data.length > 0) {
      setActiveWorkspace(data[0].id, data[0].icon);
    }

    // Create default workspace if none exist
    if (data.length === 0) {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My Canvas' }),
      });
      const ws = await res.json();
      setWorkspaces([ws]);
      setActiveWorkspace(ws.id);
    }
  }, [activeWorkspaceId, setActiveWorkspace]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const createWorkspace = async () => {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Canvas ${workspaces.length + 1}` }),
    });
    const ws = await res.json();
    setWorkspaces((prev) => [...prev, ws]);
    setActiveWorkspace(ws.id);
  };

  const deleteWorkspace = async (id: string) => {
    await fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    if (activeWorkspaceId === id) {
      const remaining = workspaces.filter((w) => w.id !== id);
      setActiveWorkspace(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const renameWorkspace = async (id: string, name: string) => {
    await fetch(`/api/workspaces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)));
    setEditingId(null);
  };

  const exportWorkspace = async (id: string) => {
    const res = await fetch(`/api/export/${id}`);
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ws = workspaces.find((w) => w.id === id);
    a.download = `${ws?.name || 'canvas'}-export.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (sidebarCollapsed) {
    return (
      <div className="w-12 h-full bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-3">
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <PanelLeft className="w-4 h-4 text-gray-500" />
        </button>
        <button
          onClick={toggleSearch}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Search className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[260px] h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Layout className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-800">Think Canvas</span>
        </div>
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <PanelLeftClose className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <button
          onClick={toggleSearch}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Workspaces */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Workspaces
          </span>
          <button
            onClick={createWorkspace}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="New workspace"
          >
            <Plus className="w-3 h-3 text-gray-400" />
          </button>
        </div>

        <div className="space-y-0.5">
          {/* Pinned workspaces first */}
          {workspaces.filter((ws) => !!ws.pinned).map((ws) => (
            <WorkspaceItem
              key={ws.id}
              ws={ws}
              active={activeWorkspaceId === ws.id}
              editingId={editingId}
              editName={editName}
              onSelect={() => setActiveWorkspace(ws.id, ws.icon)}
              onStartEdit={() => { setEditingId(ws.id); setEditName(ws.name); }}
              onEditChange={setEditName}
              onEditSubmit={(name) => renameWorkspace(ws.id, name)}
              onEditCancel={() => setEditingId(null)}
              onContextMenu={(e) => { e.preventDefault(); setWsContextMenu({ x: e.clientX, y: e.clientY, wsId: ws.id }); }}
            />
          ))}

          {/* Separator if both pinned and unpinned exist */}
          {workspaces.some((ws) => !!ws.pinned) && workspaces.some((ws) => !ws.pinned) && (
            <div className="h-px bg-gray-100 my-2" />
          )}

          {/* Regular workspaces */}
          {workspaces.filter((ws) => !ws.pinned).map((ws) => (
            <WorkspaceItem
              key={ws.id}
              ws={ws}
              active={activeWorkspaceId === ws.id}
              editingId={editingId}
              editName={editName}
              onSelect={() => setActiveWorkspace(ws.id, ws.icon)}
              onStartEdit={() => { setEditingId(ws.id); setEditName(ws.name); }}
              onEditChange={setEditName}
              onEditSubmit={(name) => renameWorkspace(ws.id, name)}
              onEditCancel={() => setEditingId(null)}
              onContextMenu={(e) => { e.preventDefault(); setWsContextMenu({ x: e.clientX, y: e.clientY, wsId: ws.id }); }}
            />
          ))}
        </div>
      </div>

      {/* Workspace context menu */}
      {wsContextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setWsContextMenu(null)} />
          <div
            className="fixed bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 min-w-[160px]"
            style={{ left: wsContextMenu.x, top: wsContextMenu.y }}
          >
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
              onClick={() => {
                const ws = workspaces.find((w) => w.id === wsContextMenu.wsId);
                if (ws) { setEditingId(ws.id); setEditName(ws.name); }
                setWsContextMenu(null);
              }}
            >
              <Pencil className="w-3.5 h-3.5 text-gray-400" />
              Rename
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
              onClick={() => { exportWorkspace(wsContextMenu.wsId); setWsContextMenu(null); }}
            >
              <Download className="w-3.5 h-3.5 text-gray-400" />
              Export
            </button>
            {workspaces.length > 1 && (
              <>
                <div className="h-px bg-gray-100 my-1" />
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2.5 transition-colors"
                  onClick={() => { deleteWorkspace(wsContextMenu.wsId); setWsContextMenu(null); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Double-click to add a note
        </p>
        <button
          onClick={toggleSettings}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

function WorkspaceIcon({ icon, pinned }: { icon: string | null; pinned: boolean }) {
  if (icon === 'mic') return <Mic className="w-4 h-4 flex-shrink-0 text-purple-500" />;
  if (pinned) return <Pin className="w-4 h-4 flex-shrink-0 text-amber-500" />;
  return <Layout className="w-4 h-4 flex-shrink-0 opacity-50" />;
}

function WorkspaceItem({
  ws, active, editingId, editName, onSelect, onStartEdit, onEditChange, onEditSubmit, onEditCancel, onContextMenu,
}: {
  ws: Workspace;
  active: boolean;
  editingId: string | null;
  editName: string;
  onSelect: () => void;
  onStartEdit: () => void;
  onEditChange: (v: string) => void;
  onEditSubmit: (name: string) => void;
  onEditCancel: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const isPinned = !!ws.pinned;

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
        active
          ? isPinned ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-50'
      )}
      onClick={onSelect}
      onDoubleClick={onStartEdit}
      onContextMenu={onContextMenu}
    >
      <WorkspaceIcon icon={ws.icon} pinned={isPinned} />

      {editingId === ws.id ? (
        <input
          className="flex-1 text-sm bg-white border border-blue-300 rounded px-1 py-0.5 outline-none"
          value={editName}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={() => onEditSubmit(editName)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEditSubmit(editName);
            if (e.key === 'Escape') onEditCancel();
          }}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-sm truncate">{ws.name}</span>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-opacity"
      >
        <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
      </button>
    </div>
  );
}
