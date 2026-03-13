'use client';

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  type OnNodeDrag,
  type Edge,
  BackgroundVariant,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { NoteCard } from './nodes/NoteCard';
import { ConceptNode } from './nodes/ConceptNode';
import { PdfCard } from './nodes/PdfCard';
import { PortalNode } from './nodes/PortalNode';
import { ReferenceCard } from './nodes/ReferenceCard';
import { LabeledEdge } from './edges/LabeledEdge';
import { CardLinker } from '@/components/search/CardLinker';
import { DrawingLayer } from './DrawingLayer';
import { useCanvasStore } from '@/lib/store/canvas-store';
import { v4 as uuid } from 'uuid';
import { ChevronLeft, ChevronRight, ArrowRightLeft, Trash2, Pen, Eraser, MousePointer2, Search } from 'lucide-react';
import { DateFilter } from './DateFilter';
import { cn } from '@/lib/utils';
import type { Workspace } from '@/types';
import type { CardData, ThinkNode } from '@/types';

const nodeTypes: NodeTypes = {
  note: NoteCard,
  concept: ConceptNode,
  pdf: PdfCard,
  portal: PortalNode,
  reference: ReferenceCard,
};

const edgeTypes: EdgeTypes = {
  labeled: LabeledEdge,
};

export function ThinkCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<ThinkNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const {
    activeWorkspaceId,
    activeWorkspaceIcon,
    workspaceHistory,
    navigateBack,
    setContextMenu,
    contextMenu,
    cardLinkerOpen,
    cardLinkerPosition,
    openCardLinker,
    closeCardLinker,
    nodeContextMenu,
    setNodeContextMenu,
    moveToPickerNodeId,
    setMoveToPickerNodeId,
    drawingMode,
    eraserMode,
    drawingColor,
    drawingWidth,
    toggleDrawingMode,
    setEraserMode,
    setDrawingColor,
    setDrawingWidth,
  } = useCanvasStore();
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [dateFilterIds, setDateFilterIds] = useState<Set<string> | null>(null);
  const isVoiceWorkspace = activeWorkspaceIcon === 'mic';

  const handleDateFilter = useCallback((ids: Set<string> | null) => {
    setDateFilterIds(ids);
    // After React renders the hidden changes, fit view to visible nodes
    setTimeout(() => {
      if (ids && ids.size > 0) {
        fitView({ nodes: Array.from(ids).map((id) => ({ id })), padding: 0.3, duration: 300 });
      } else if (ids === null) {
        fitView({ padding: 0.2, duration: 300 });
      }
    }, 50);
  }, [fitView]);

  // Apply date filter to nodes and edges
  const filteredNodes = useMemo(() => {
    if (!dateFilterIds) return nodes;
    return nodes.map((n) => ({
      ...n,
      hidden: !dateFilterIds.has(n.id),
    }));
  }, [nodes, dateFilterIds]);

  const filteredEdges = useMemo(() => {
    if (!dateFilterIds) return edges;
    return edges.map((e) => ({
      ...e,
      hidden: !dateFilterIds.has(e.source) || !dateFilterIds.has(e.target),
    }));
  }, [edges, dateFilterIds]);

  // Clear filter when switching workspaces
  useEffect(() => {
    setDateFilterIds(null);
  }, [activeWorkspaceId]);

  // Load cards and edges when workspace changes
  useEffect(() => {
    if (!activeWorkspaceId) return;

    const load = async () => {
      const [cardsRes, edgesRes] = await Promise.all([
        fetch(`/api/cards?workspaceId=${activeWorkspaceId}`),
        fetch(`/api/edges?workspaceId=${activeWorkspaceId}`),
      ]);
      const cardsData = await cardsRes.json();
      const edgesData = await edgesRes.json();

      const flowNodes: ThinkNode[] = cardsData.map((c: any) => {
        const data: CardData = {
          cardId: c.id,
          title: c.title,
          content: c.content,
          type: c.type,
          fileUrl: c.sourcePath ? `/api/files/${c.sourcePath}` : undefined,
          sourcePath: c.sourcePath,
          createdAt: c.createdAt,
        };

        // Portal: parse metadata for target workspace info
        if (c.type === 'portal') {
          try {
            const meta = JSON.parse(c.metadata || '{}');
            data.targetWorkspaceId = meta.targetWorkspaceId;
            data.targetWorkspaceName = meta.targetWorkspaceName;
            data.cardCount = meta.cardCount ?? 0;
          } catch {}
        }

        // Reference: include source card info
        if (c.type === 'reference') {
          data.sourceCardId = c.sourceCardId;
          try {
            const meta = JSON.parse(c.metadata || '{}');
            data.sourceWorkspaceName = meta.sourceWorkspaceName;
            data.sourceCardType = meta.sourceCardType;
            if (meta.sourcePath) {
              data.fileUrl = `/api/files/${meta.sourcePath}`;
            }
          } catch {}
        }

        return {
          id: c.id,
          type: c.type,
          position: { x: c.positionX, y: c.positionY },
          data,
          // Let each node component control its own width via CSS
        };
      });

      const flowEdges = edgesData.map((e: any) => ({
        id: e.id,
        source: e.sourceCardId,
        target: e.targetCardId,
        type: 'labeled',
        data: { label: e.label },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    };

    load();
  }, [activeWorkspaceId, setNodes, setEdges]);

  // Refresh portal card counts periodically
  useEffect(() => {
    if (!activeWorkspaceId) return;

    const refreshPortals = async () => {
      const portalNodes = nodes.filter((n) => n.type === 'portal');
      for (const portal of portalNodes) {
        const targetId = portal.data.targetWorkspaceId;
        if (!targetId) continue;
        try {
          const res = await fetch(`/api/workspaces/${targetId}/stats`);
          if (res.ok) {
            const stats = await res.json();
            setNodes((nds) =>
              nds.map((n) =>
                n.id === portal.id
                  ? { ...n, data: { ...n.data, cardCount: stats.cardCount, targetWorkspaceName: stats.name } }
                  : n
              )
            );
          }
        } catch {}
      }
    };

    refreshPortals();
  }, [activeWorkspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Double-click to create note
  const onDoubleClick = useCallback(
    async (event: React.MouseEvent) => {
      if (!activeWorkspaceId) return;
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__node')) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = uuid();
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          workspaceId: activeWorkspaceId,
          type: 'note',
          title: '',
          content: '',
          positionX: position.x,
          positionY: position.y,
        }),
      });

      if (res.ok) {
        setNodes((nds) => [
          ...nds,
          {
            id,
            type: 'note',
            position,
            data: { cardId: id, title: '', content: '', type: 'note' },
            selected: true,
          } as ThinkNode,
        ]);
      }
    },
    [activeWorkspaceId, screenToFlowPosition, setNodes]
  );

  // Right-click context menu
  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const target = event.target as HTMLElement;
      const nodeEl = target.closest('.react-flow__node');
      if (nodeEl) {
        // Node right-click
        const nodeId = nodeEl.getAttribute('data-id');
        if (nodeId) {
          setNodeContextMenu({ x: event.clientX, y: event.clientY, nodeId });
        }
        return;
      }
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setContextMenu({ x: event.clientX, y: event.clientY, canvasX: position.x, canvasY: position.y });
    },
    [screenToFlowPosition, setContextMenu, setNodeContextMenu]
  );

  // Move card to another workspace
  const moveToWorkspace = useCallback(
    async (nodeId: string, targetWs: Workspace) => {
      setNodeContextMenu(null);
      setMoveToPickerNodeId(null);

      const cardRes = await fetch(`/api/cards/${nodeId}`);
      if (!cardRes.ok) return;
      const card = await cardRes.json();

      // Create copy in target workspace
      await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: targetWs.id,
          type: card.type === 'reference' ? 'note' : card.type,
          title: card.title,
          content: card.content,
          positionX: 100,
          positionY: 100,
          width: card.width,
          sourcePath: card.sourcePath,
          metadata: card.metadata ? JSON.parse(card.metadata) : {},
          searchText: card.searchText,
        }),
      });

      // Remove from current workspace
      await fetch(`/api/cards/${nodeId}`, { method: 'DELETE' });
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    },
    [setNodeContextMenu, setMoveToPickerNodeId, setNodes]
  );

  // Delete card
  const deleteCard = useCallback(
    async (nodeId: string) => {
      setNodeContextMenu(null);
      setMoveToPickerNodeId(null);
      await fetch(`/api/cards/${nodeId}`, { method: 'DELETE' });
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    },
    [setNodeContextMenu, setMoveToPickerNodeId, setNodes]
  );

  // Connect nodes
  const onConnect = useCallback(
    async (params: Connection) => {
      if (!activeWorkspaceId) return;
      const id = uuid();
      setEdges((eds) => addEdge({ ...params, id, type: 'labeled', data: { label: '' } }, eds));
      await fetch('/api/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, workspaceId: activeWorkspaceId, sourceCardId: params.source, targetCardId: params.target }),
      });
    },
    [activeWorkspaceId, setEdges]
  );

  // Save position on drag end
  const onNodeDragStop: OnNodeDrag = useCallback((_event, node) => {
    clearTimeout(dragTimeoutRef.current);
    dragTimeoutRef.current = setTimeout(() => {
      fetch(`/api/cards/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionX: node.position.x, positionY: node.position.y }),
      });
    }, 300);
  }, []);

  // File drop
  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      if (!activeWorkspaceId) return;
      const files = event.dataTransfer.files;
      if (files.length === 0) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('workspaceId', activeWorkspaceId);
        formData.append('positionX', String(position.x + i * 260));
        formData.append('positionY', String(position.y));

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const card = await res.json();
          setNodes((nds) => [
            ...nds,
            {
              id: card.id,
              type: card.type,
              position: { x: card.positionX, y: card.positionY },
              data: {
                cardId: card.id, title: card.title, content: card.content || '', type: card.type,
                fileUrl: card.sourcePath ? `/api/files/${card.sourcePath}` : undefined, sourcePath: card.sourcePath,
              },
            } as ThinkNode,
          ]);
        }
      }
    },
    [activeWorkspaceId, screenToFlowPosition, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // --- Context menu actions ---
  const createAtPosition = useCallback(
    async (type: string, x: number, y: number, extra?: Record<string, any>) => {
      if (!activeWorkspaceId) return;
      const id = uuid();
      const body: any = {
        id, workspaceId: activeWorkspaceId, type,
        title: type === 'concept' ? 'New Concept' : '',
        content: '', positionX: x, positionY: y,
        ...extra,
      };

      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const card = await res.json();
        const data: CardData = {
          cardId: id, title: card.title, content: card.content || '', type: card.type,
          ...(extra?.data || {}),
        };
        setNodes((nds) => [...nds, { id, type: card.type, position: { x, y }, data, selected: true } as ThinkNode]);
      }
      setContextMenu(null);
    },
    [activeWorkspaceId, setNodes, setContextMenu]
  );

  // Handle linking a card from another workspace
  const handleLinkCard = useCallback(
    async (card: any) => {
      if (!activeWorkspaceId || !cardLinkerPosition) return;
      const id = uuid();
      const metadata = {
        sourceWorkspaceName: card.workspaceName,
        sourceCardType: card.type,
        sourcePath: card.sourcePath,
      };

      await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          workspaceId: activeWorkspaceId,
          type: 'reference',
          title: card.title,
          content: card.content,
          positionX: cardLinkerPosition.x,
          positionY: cardLinkerPosition.y,
          sourceCardId: card.id,
          metadata,
          searchText: `${card.title} ${card.content?.replace(/<[^>]*>/g, '') || ''}`,
        }),
      });

      const data: CardData = {
        cardId: id,
        title: card.title,
        content: card.content || '',
        type: 'reference',
        sourceCardId: card.id,
        sourceWorkspaceName: card.workspaceName,
        sourceCardType: card.type,
        fileUrl: card.sourcePath ? `/api/files/${card.sourcePath}` : undefined,
      };

      setNodes((nds) => [
        ...nds,
        { id, type: 'reference', position: cardLinkerPosition, data, selected: true } as ThinkNode,
      ]);
    },
    [activeWorkspaceId, cardLinkerPosition, setNodes]
  );

  // Portal picker position (canvas coords where the portal will be placed)
  const [portalPickerPos, setPortalPickerPos] = useState<{ x: number; y: number } | null>(null);

  // Create portal at position with selected workspace
  const createPortalWithWorkspace = useCallback(
    async (ws: Workspace) => {
      if (!activeWorkspaceId || !portalPickerPos) return;
      const { x, y } = portalPickerPos;

      const statsRes = await fetch(`/api/workspaces/${ws.id}/stats`);
      const stats = statsRes.ok ? await statsRes.json() : { cardCount: 0 };

      const id = uuid();
      const metadata = { targetWorkspaceId: ws.id, targetWorkspaceName: ws.name, cardCount: stats.cardCount };

      await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id, workspaceId: activeWorkspaceId, type: 'portal',
          title: ws.name, content: '', positionX: x, positionY: y, metadata,
        }),
      });

      setNodes((nds) => [
        ...nds,
        {
          id, type: 'portal', position: { x, y },
          data: {
            cardId: id, title: ws.name, content: '', type: 'portal',
            targetWorkspaceId: ws.id, targetWorkspaceName: ws.name, cardCount: stats.cardCount,
          },
        } as ThinkNode,
      ]);
      setContextMenu(null);
      setPortalPickerPos(null);
    },
    [activeWorkspaceId, portalPickerPos, setNodes, setContextMenu]
  );

  // Update node data helper
  useEffect(() => {
    (window as any).__thinkUpdateNode = (nodeId: string, data: Partial<CardData>) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)));

      // Also update any reference cards that point to this node
      setNodes((nds) =>
        nds.map((n) => {
          if (n.type === 'reference' && n.data.sourceCardId === nodeId) {
            return { ...n, data: { ...n.data, title: data.title ?? n.data.title, content: data.content ?? n.data.content } };
          }
          return n;
        })
      );
    };
    return () => { delete (window as any).__thinkUpdateNode; };
  }, [setNodes]);

  const defaultEdgeOptions = useMemo(() => ({ type: 'labeled' }), []);
  const canGoBack = workspaceHistory.length > 0;

  return (
    <div className="h-full w-full relative" onDrop={onDrop} onDragOver={onDragOver}>
      {/* Breadcrumb bar */}
      {canGoBack && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-2 py-1.5 border border-gray-200">
          <button
            onClick={navigateBack}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <span className="text-sm font-medium text-gray-800 max-w-[200px] truncate">
            {nodes.length > 0 ? 'Current' : 'Empty workspace'}
          </span>
        </div>
      )}

      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDoubleClick={drawingMode ? undefined : onDoubleClick}
        onContextMenu={drawingMode ? undefined : onContextMenu}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        panOnDrag={!drawingMode}
        zoomOnScroll={!drawingMode}
        fitView
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        className="bg-gray-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" />
        <Controls className="bg-white shadow-lg rounded-lg" />
        <MiniMap
          className="bg-white shadow-lg rounded-lg"
          nodeColor={(n) => {
            switch (n.type) {
              case 'note': return '#3b82f6';
              case 'concept': return '#8b5cf6';
              case 'pdf': return '#ef4444';
              case 'portal': return '#6366f1';
              case 'reference': return '#f59e0b';
              default: return '#6b7280';
            }
          }}
        />
      </ReactFlow>

      {/* Date filter for Voice Notes workspace */}
      {isVoiceWorkspace && (
        <DateFilter nodes={nodes} onFilter={handleDateFilter} />
      )}

      {/* Drawing Layer */}
      <DrawingLayer />

      {/* Drawing Toolbar — z-[60] to sit above drawing surface at z-50 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-2 py-1.5">
        <button
          onClick={() => { if (drawingMode) toggleDrawingMode(); }}
          className={cn(
            'p-2 rounded-lg transition-colors',
            !drawingMode ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-50'
          )}
          title="Select mode (Esc)"
        >
          <MousePointer2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => { if (!drawingMode) toggleDrawingMode(); setEraserMode(false); }}
          className={cn(
            'p-2 rounded-lg transition-colors',
            drawingMode && !eraserMode ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-50'
          )}
          title="Draw (D)"
        >
          <Pen className="w-4 h-4" />
        </button>
        <button
          onClick={() => { if (!drawingMode) toggleDrawingMode(); setEraserMode(true); }}
          className={cn(
            'p-2 rounded-lg transition-colors',
            drawingMode && eraserMode ? 'bg-red-100 text-red-700' : 'text-gray-400 hover:bg-gray-50'
          )}
          title="Eraser (E)"
        >
          <Eraser className="w-4 h-4" />
        </button>

        {drawingMode && !eraserMode && (
          <>
            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Color swatches */}
            {['#000000', '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'].map((c) => (
              <button
                key={c}
                onClick={(e) => { e.stopPropagation(); setDrawingColor(c); }}
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition-all',
                  drawingColor === c ? 'border-gray-800 scale-110 shadow-sm' : 'border-gray-300 hover:scale-105'
                )}
                style={{ backgroundColor: c }}
              />
            ))}

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Width options */}
            {[1, 2, 4, 8].map((w) => (
              <button
                key={w}
                onClick={(e) => { e.stopPropagation(); setDrawingWidth(w); }}
                className={cn(
                  'w-8 h-8 rounded-lg transition-colors flex items-center justify-center',
                  drawingWidth === w ? 'bg-gray-100' : 'hover:bg-gray-50'
                )}
                title={`Width ${w}`}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: Math.max(w * 2, 4),
                    height: Math.max(w * 2, 4),
                    backgroundColor: drawingColor,
                  }}
                />
              </button>
            ))}
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setContextMenu(null); setPortalPickerPos(null); }} />
          <div
            className="fixed bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 min-w-[200px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {!portalPickerPos ? (
              <>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                  onClick={() => createAtPosition('note', contextMenu.canvasX, contextMenu.canvasY)}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  New Note
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                  onClick={() => createAtPosition('concept', contextMenu.canvasX, contextMenu.canvasY)}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  New Concept
                </button>

                <div className="h-px bg-gray-100 my-1" />

                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                  onClick={() => {
                    openCardLinker({ x: contextMenu.canvasX, y: contextMenu.canvasY });
                    setContextMenu(null);
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Link Card From...
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                  onClick={() => setPortalPickerPos({ x: contextMenu.canvasX, y: contextMenu.canvasY })}
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  Workspace Portal
                </button>
              </>
            ) : (
              <WorkspacePicker
                currentWorkspaceId={activeWorkspaceId}
                onSelect={createPortalWithWorkspace}
                onBack={() => setPortalPickerPos(null)}
              />
            )}
          </div>
        </>
      )}

      {/* Node Context Menu */}
      {nodeContextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setNodeContextMenu(null); setMoveToPickerNodeId(null); }} />
          <div
            className="fixed bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 min-w-[200px]"
            style={{ left: nodeContextMenu.x, top: nodeContextMenu.y }}
          >
            {!moveToPickerNodeId ? (
              <>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                  onClick={() => setMoveToPickerNodeId(nodeContextMenu.nodeId)}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-gray-400" />
                  Move to...
                </button>
                <div className="h-px bg-gray-100 my-1" />
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2.5 transition-colors"
                  onClick={() => deleteCard(nodeContextMenu.nodeId)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </>
            ) : (
              <WorkspacePicker
                currentWorkspaceId={activeWorkspaceId}
                onSelect={(ws) => moveToWorkspace(moveToPickerNodeId, ws)}
                onBack={() => setMoveToPickerNodeId(null)}
              />
            )}
          </div>
        </>
      )}

      {/* Card Linker overlay */}
      {cardLinkerOpen && <CardLinker onLink={handleLinkCard} />}
    </div>
  );
}

function WorkspacePicker({
  currentWorkspaceId,
  onSelect,
  onBack,
}: {
  currentWorkspaceId: string | null;
  onSelect: (ws: Workspace) => void;
  onBack: () => void;
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((data) => setWorkspaces(data.filter((w: Workspace) => w.id !== currentWorkspaceId)));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [currentWorkspaceId]);

  const filtered = query
    ? workspaces.filter((ws) => ws.name.toLowerCase().includes(query.toLowerCase()))
    : workspaces;

  return (
    <div className="w-[220px]">
      <div className="px-2 pt-2 pb-1">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
            placeholder="Find workspace..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onBack();
              if (e.key === 'Enter' && filtered.length === 1) onSelect(filtered[0]);
            }}
          />
        </div>
      </div>
      <div className="max-h-[200px] overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-400">No workspaces found</p>
        ) : (
          filtered.map((ws) => (
            <button
              key={ws.id}
              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors"
              onClick={() => onSelect(ws)}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
              <span className="truncate">{ws.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
