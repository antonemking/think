'use client';

import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { ThinkCanvas } from './canvas/ThinkCanvas';
import { Sidebar } from './sidebar/Sidebar';
import { PdfViewer } from './panels/PdfViewer';
import { NoteEditor } from './panels/NoteEditor';
import { CommandPalette } from './search/CommandPalette';
import { SettingsPanel } from './panels/SettingsPanel';
import { useCanvasStore } from '@/lib/store/canvas-store';

export default function ThinkApp() {
  const { pdfViewerCard, editingNote, searchOpen, settingsOpen, drawingMode, eraserMode, toggleSearch, toggleSettings, toggleDrawingMode, setEraserMode } = useCanvasStore();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleSearch();
      }
      const tag = (e.target as HTMLElement).tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;
      if (isTyping) return;

      // D = pen mode
      if (e.key === 'd' && !e.metaKey && !e.ctrlKey) {
        if (!drawingMode) toggleDrawingMode();
        setEraserMode(false);
      }
      // E = eraser mode
      if (e.key === 'e' && !e.metaKey && !e.ctrlKey) {
        if (!drawingMode) toggleDrawingMode();
        setEraserMode(true);
      }
      // V or Escape = back to select
      if ((e.key === 'v' || e.key === 'Escape') && drawingMode) {
        toggleDrawingMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSearch, toggleDrawingMode, setEraserMode, drawingMode]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <ThinkCanvas />
        </ReactFlowProvider>

        {/* Floating hint when no workspace */}
        <EmptyStateHint />
      </div>

      {/* PDF Viewer Overlay */}
      {pdfViewerCard && (
        <PdfViewer fileUrl={pdfViewerCard.fileUrl} title={pdfViewerCard.title} />
      )}

      {/* Note Editor Overlay */}
      {editingNote && (
        <NoteEditor
          key={editingNote.id}
          id={editingNote.id}
          initialTitle={editingNote.title}
          initialContent={editingNote.content}
        />
      )}

      {/* Command Palette */}
      {searchOpen && <CommandPalette />}

      {/* Settings Panel */}
      {settingsOpen && (
        <SettingsPanel
          onClose={toggleSettings}
          onSyncWhisper={() => {
            // Refresh workspaces after whisper import
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function EmptyStateHint() {
  const { activeWorkspaceId } = useCanvasStore();

  if (activeWorkspaceId) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center">
        <p className="text-lg font-medium text-gray-400">Select or create a workspace to begin</p>
      </div>
    </div>
  );
}
