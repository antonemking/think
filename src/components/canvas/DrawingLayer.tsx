'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import getStroke from 'perfect-freehand';
import { useCanvasStore } from '@/lib/store/canvas-store';
import { v4 as uuid } from 'uuid';

interface SavedDrawing {
  id: string;
  pathData: string;
  color: string;
  strokeWidth: number;
}

function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return '';

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );

  d.push('Z');
  return d.join(' ');
}

export function DrawingLayer() {
  const { drawingMode, eraserMode, drawingColor, drawingWidth, activeWorkspaceId } = useCanvasStore();
  const { screenToFlowPosition } = useReactFlow();
  const viewport = useViewport();
  const [currentStroke, setCurrentStroke] = useState<number[][] | null>(null);
  const [savedDrawings, setSavedDrawings] = useState<SavedDrawing[]>([]);
  const isDrawing = useRef(false);

  // Load drawings when workspace changes
  useEffect(() => {
    if (!activeWorkspaceId) {
      setSavedDrawings([]);
      return;
    }
    fetch(`/api/drawings?workspaceId=${activeWorkspaceId}`)
      .then((r) => r.json())
      .then(setSavedDrawings)
      .catch(() => {});
  }, [activeWorkspaceId]);

  const eraseDrawing = useCallback(
    (id: string) => {
      setSavedDrawings((prev) => prev.filter((d) => d.id !== id));
      fetch(`/api/drawings/${id}`, { method: 'DELETE' }).catch(() => {});
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!drawingMode || eraserMode) return;
      e.preventDefault();
      e.stopPropagation();
      isDrawing.current = true;

      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setCurrentStroke([[pos.x, pos.y, e.pressure || 0.5]]);

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [drawingMode, eraserMode, screenToFlowPosition]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing.current || !currentStroke) return;
      e.preventDefault();
      e.stopPropagation();

      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setCurrentStroke((prev) => [...(prev || []), [pos.x, pos.y, e.pressure || 0.5]]);
    },
    [currentStroke, screenToFlowPosition]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing.current || !currentStroke || !activeWorkspaceId) return;
      e.preventDefault();
      isDrawing.current = false;

      if (currentStroke.length < 2) {
        setCurrentStroke(null);
        return;
      }

      const outline = getStroke(currentStroke, {
        size: drawingWidth * 2,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
      });

      const pathData = getSvgPathFromStroke(outline);
      const id = uuid();

      setSavedDrawings((prev) => [...prev, { id, pathData, color: drawingColor, strokeWidth: drawingWidth }]);

      fetch('/api/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          workspaceId: activeWorkspaceId,
          pathData,
          color: drawingColor,
          strokeWidth: drawingWidth,
        }),
      }).catch((e) => {
        console.error('Failed to save drawing:', e);
        setSavedDrawings((prev) => prev.filter((d) => d.id !== id));
      });
      setCurrentStroke(null);
    },
    [currentStroke, activeWorkspaceId, drawingColor, drawingWidth]
  );

  const currentPath = currentStroke
    ? getSvgPathFromStroke(
        getStroke(currentStroke, {
          size: drawingWidth * 2,
          thinning: 0.5,
          smoothing: 0.5,
          streamline: 0.5,
        })
      )
    : null;

  return (
    <>
      {/* Saved drawings layer — always visible, behind nodes */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
          {savedDrawings.map((d) => (
            <path key={d.id} d={d.pathData} fill={d.color} opacity={0.85} />
          ))}
        </g>
      </svg>

      {/* Eraser layer — clickable strokes when in eraser mode */}
      {drawingMode && eraserMode && (
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 50, cursor: 'crosshair' }}
        >
          <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
            {savedDrawings.map((d) => (
              <path
                key={d.id}
                d={d.pathData}
                fill="transparent"
                stroke="transparent"
                strokeWidth={20 / viewport.zoom}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
                onClick={() => eraseDrawing(d.id)}
                onMouseEnter={(e) => {
                  (e.target as SVGPathElement).style.fill = 'rgba(239,68,68,0.3)';
                }}
                onMouseLeave={(e) => {
                  (e.target as SVGPathElement).style.fill = 'transparent';
                }}
              />
            ))}
          </g>
        </svg>
      )}

      {/* Drawing surface — pen mode only */}
      {drawingMode && !eraserMode && (
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 50, cursor: 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
            {currentPath && (
              <path d={currentPath} fill={drawingColor} opacity={0.85} />
            )}
          </g>
        </svg>
      )}
    </>
  );
}
