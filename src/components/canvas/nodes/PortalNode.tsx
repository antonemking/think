'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Layout, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/lib/store/canvas-store';
import type { ThinkNode } from '@/types';

export const PortalNode = memo(function PortalNode({ data, id, selected }: NodeProps<ThinkNode>) {
  const { navigateToWorkspace } = useCanvasStore();

  const handleEnter = useCallback(() => {
    if (data.targetWorkspaceId) {
      navigateToWorkspace(data.targetWorkspaceId as string);
    }
  }, [data.targetWorkspaceId, navigateToWorkspace]);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/cards/${id}`, { method: 'DELETE' });
  }, [id]);

  const cardCount = (data.cardCount as number) ?? 0;

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-md border-2 transition-all duration-150',
        'w-[200px] group cursor-pointer hover:shadow-lg',
        selected ? 'border-indigo-500 shadow-indigo-100' : 'border-indigo-200 hover:border-indigo-300'
      )}
      onDoubleClick={handleEnter}
    >
      <Handle id="top" type="source" position={Position.Top} isConnectableEnd className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white" />
      <Handle id="right" type="source" position={Position.Right} isConnectableEnd className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white" />
      <Handle id="bottom" type="source" position={Position.Bottom} isConnectableEnd className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white" />
      <Handle id="left" type="source" position={Position.Left} isConnectableEnd className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white" />

      <div className="px-4 pt-3.5 pb-3">
        {/* Icon row */}
        <div className="flex items-center justify-between mb-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Layout className="w-4 h-4 text-indigo-600" />
          </div>
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded transition-opacity"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        </div>

        {/* Workspace name */}
        <h3 className="text-sm font-semibold text-indigo-900 leading-snug mb-1 line-clamp-2">
          {data.targetWorkspaceName || data.title || 'Workspace'}
        </h3>

        {/* Stats + enter */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-indigo-500">
            {cardCount} card{cardCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleEnter}
            className="flex items-center gap-0.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Enter
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
});
