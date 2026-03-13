'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Link2, ExternalLink, Trash2, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/lib/store/canvas-store';
import type { ThinkNode } from '@/types';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export const ReferenceCard = memo(function ReferenceCard({ data, id, selected }: NodeProps<ThinkNode>) {
  const { openNoteEditor, openPdfViewer, navigateToWorkspace } = useCanvasStore();
  const [title, setTitle] = useState(data.title || '');
  const [content, setContent] = useState(data.content || '');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setTitle(data.title || '');
    setContent(data.content || '');
  }, [data.title, data.content]);

  const handleOpen = useCallback(() => {
    const srcType = data.sourceCardType || 'note';
    if (srcType === 'pdf' && data.fileUrl) {
      openPdfViewer({ id: data.sourceCardId as string, title, fileUrl: data.fileUrl as string });
    } else {
      // Open the note editor pointed at the SOURCE card so edits flow back
      openNoteEditor({
        id: (data.sourceCardId as string) || id,
        title,
        content,
      });
    }
  }, [id, data, title, content, openNoteEditor, openPdfViewer]);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/cards/${id}`, { method: 'DELETE' });
  }, [id]);

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((v) => !v);
  }, []);

  const hasContent = stripHtml(content).length > 0;
  const srcType = data.sourceCardType || 'note';

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-md border-2 border-dashed transition-all duration-150 overflow-hidden',
        'group cursor-pointer',
        expanded ? 'w-[400px]' : 'w-[220px]',
        selected ? 'border-amber-400 shadow-amber-100' : 'border-amber-200 hover:border-amber-300 hover:shadow-lg'
      )}
      onDoubleClick={handleOpen}
    >
      <Handle id="top" type="source" position={Position.Top} isConnectableEnd className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white" />
      <Handle id="right" type="source" position={Position.Right} isConnectableEnd className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white" />
      <Handle id="bottom" type="source" position={Position.Bottom} isConnectableEnd className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white" />
      <Handle id="left" type="source" position={Position.Left} isConnectableEnd className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white" />

      {/* Origin badge */}
      <div className="px-3 pt-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          <Link2 className="w-3 h-3" />
          <span className="truncate max-w-[120px]">{data.sourceWorkspaceName || 'Linked'}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={toggleExpand}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded transition-opacity"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <Minimize2 className="w-3 h-3 text-gray-400" /> : <Maximize2 className="w-3 h-3 text-gray-400" />}
          </button>
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded transition-opacity"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        </div>
      </div>

      <div className={cn('px-3.5 pt-2 pb-3', expanded && 'px-5 pt-3 pb-4')}>
        {/* Title */}
        <h3 className={cn(
          'font-semibold text-gray-800 leading-snug',
          expanded ? 'text-base' : 'text-sm line-clamp-2'
        )}>
          {title || <span className="text-gray-400 font-normal">Untitled</span>}
        </h3>

        {/* Content */}
        {srcType === 'pdf' ? (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
            <FileText className="w-3.5 h-3.5" />
            <span>PDF Document</span>
          </div>
        ) : hasContent ? (
          <div
            className={cn(
              'note-card-preview text-gray-500 leading-relaxed mt-1',
              expanded ? 'text-sm' : 'text-xs line-clamp-3'
            )}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="text-xs text-gray-300 italic mt-1">Empty note</p>
        )}
      </div>

      {/* Bottom accent */}
      <div className="h-0.5 bg-gradient-to-r from-amber-300 to-amber-100 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
});
