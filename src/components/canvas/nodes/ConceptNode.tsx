'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { ThinkNode } from '@/types';

export const ConceptNode = memo(function ConceptNode({ data, id, selected }: NodeProps<ThinkNode>) {
  const [title, setTitle] = useState(data.title || 'Concept');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setTitle(data.title || 'Concept');
  }, [data.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const save = useCallback(
    (newTitle: string) => {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        await fetch(`/api/cards/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle, searchText: newTitle }),
        });
        if ((window as any).__thinkUpdateNode) {
          (window as any).__thinkUpdateNode(id, { ...data, title: newTitle });
        }
      }, 500);
    },
    [id, data]
  );

  return (
    <div
      className={cn(
        'px-4 py-2 rounded-full shadow-md border-2 transition-all duration-150',
        'bg-purple-50 cursor-pointer',
        selected ? 'border-purple-500 shadow-purple-100' : 'border-purple-200 hover:border-purple-300'
      )}
      onDoubleClick={() => setIsEditing(true)}
    >
      <Handle id="top" type="source" position={Position.Top} isConnectableEnd className="!w-2 !h-2 !bg-purple-400 !border-2 !border-white" />
      <Handle id="right" type="source" position={Position.Right} isConnectableEnd className="!w-2 !h-2 !bg-purple-400 !border-2 !border-white" />
      <Handle id="bottom" type="source" position={Position.Bottom} isConnectableEnd className="!w-2 !h-2 !bg-purple-400 !border-2 !border-white" />
      <Handle id="left" type="source" position={Position.Left} isConnectableEnd className="!w-2 !h-2 !bg-purple-400 !border-2 !border-white" />

      {isEditing ? (
        <input
          ref={inputRef}
          className="text-sm font-medium text-purple-800 bg-transparent border-none outline-none text-center min-w-[60px]"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            save(e.target.value);
          }}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsEditing(false);
          }}
        />
      ) : (
        <span className="text-sm font-medium text-purple-800 select-none">{title}</span>
      )}
    </div>
  );
});
