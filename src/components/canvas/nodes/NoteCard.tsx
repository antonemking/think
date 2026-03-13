'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Trash2, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/lib/store/canvas-store';
import type { ThinkNode } from '@/types';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export const NoteCard = memo(function NoteCard({ data, id, selected }: NodeProps<ThinkNode>) {
  const { openNoteEditor } = useCanvasStore();
  const [title, setTitle] = useState(data.title || '');
  const [content, setContent] = useState(data.content || '');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setTitle(data.title || '');
    setContent(data.content || '');
  }, [data.title, data.content]);

  const handleOpen = useCallback(() => {
    openNoteEditor({ id, title, content });
  }, [id, title, content, openNoteEditor]);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/cards/${id}`, { method: 'DELETE' });
  }, [id]);

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((v) => !v);
  }, []);

  const hasContent = stripHtml(content).length > 0;

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-md border-2 transition-all duration-150',
        'group cursor-pointer',
        expanded ? 'w-[400px]' : 'w-[220px]',
        selected ? 'border-blue-500 shadow-blue-100' : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
      )}
      onDoubleClick={handleOpen}
    >
      <Handle id="top" type="source" position={Position.Top} isConnectableEnd className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white" />
      <Handle id="right" type="source" position={Position.Right} isConnectableEnd className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white" />
      <Handle id="bottom" type="source" position={Position.Bottom} isConnectableEnd className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white" />
      <Handle id="left" type="source" position={Position.Left} isConnectableEnd className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white" />

      <div className={cn('px-3.5 pt-3 pb-3', expanded && 'px-5 pt-4 pb-4')}>
        {/* Title */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={cn(
            'font-semibold text-gray-800 leading-snug',
            expanded ? 'text-base' : 'text-sm line-clamp-2'
          )}>
            {title || <span className="text-gray-400 font-normal">Untitled</span>}
          </h3>
          <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
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

        {/* Content */}
        {hasContent ? (
          <div
            className={cn(
              'note-card-preview text-gray-500 leading-relaxed mt-1 overflow-visible',
              expanded ? 'text-sm' : 'text-xs line-clamp-4'
            )}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="text-xs text-gray-300 italic mt-1">Double-click to write...</p>
        )}
      </div>

      {/* Bottom accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-blue-400 to-blue-200 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
});
