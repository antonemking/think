'use client';

import { memo, useState, useCallback, Suspense, lazy } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FileText, Maximize2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/lib/store/canvas-store';
import type { ThinkNode } from '@/types';

const PdfThumbnail = lazy(() => import('./PdfThumbnail'));

export const PdfCard = memo(function PdfCard({ data, id, selected }: NodeProps<ThinkNode>) {
  const { openPdfViewer } = useCanvasStore();

  const handleOpen = useCallback(() => {
    if (data.fileUrl) {
      openPdfViewer({ id, title: data.title, fileUrl: data.fileUrl });
    }
  }, [id, data.title, data.fileUrl, openPdfViewer]);

  const handleDelete = useCallback(async () => {
    await fetch(`/api/cards/${id}`, { method: 'DELETE' });
  }, [id]);

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-md border-2 overflow-hidden transition-all duration-150 group',
        'w-[240px]',
        selected ? 'border-red-400 shadow-red-100' : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <Handle id="top" type="source" position={Position.Top} isConnectableEnd className="!w-3 !h-3 !bg-red-400 !border-2 !border-white" />
      <Handle id="right" type="source" position={Position.Right} isConnectableEnd className="!w-3 !h-3 !bg-red-400 !border-2 !border-white" />
      <Handle id="bottom" type="source" position={Position.Bottom} isConnectableEnd className="!w-3 !h-3 !bg-red-400 !border-2 !border-white" />
      <Handle id="left" type="source" position={Position.Left} isConnectableEnd className="!w-3 !h-3 !bg-red-400 !border-2 !border-white" />

      {/* Thumbnail — full first page */}
      <div
        className="w-full bg-gray-50 cursor-pointer relative"
        onDoubleClick={handleOpen}
      >
        {data.fileUrl ? (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-[200px]">
                <FileText className="w-12 h-12 text-gray-300" />
              </div>
            }
          >
            <PdfThumbnail fileUrl={data.fileUrl} />
          </Suspense>
        ) : (
          <div className="flex items-center justify-center h-[200px]">
            <FileText className="w-12 h-12 text-gray-300" />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <button
            onClick={handleOpen}
            className="opacity-0 group-hover:opacity-100 bg-white/90 px-3 py-1.5 rounded-lg shadow text-xs font-medium text-gray-700 hover:bg-white transition-all"
          >
            Open PDF
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex items-center gap-2 bg-white">
        <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
        <span className="text-xs font-medium text-gray-700 truncate flex-1">{data.title || 'Untitled PDF'}</span>
        <button
          onClick={handleOpen}
          className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title="Open PDF"
        >
          <Maximize2 className="w-3 h-3 text-gray-500" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete"
        >
          <Trash2 className="w-3 h-3 text-red-400" />
        </button>
      </div>
    </div>
  );
});
