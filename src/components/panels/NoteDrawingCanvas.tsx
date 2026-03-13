'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import getStroke from 'perfect-freehand';
import { v4 as uuid } from 'uuid';

interface Stroke {
  id: string;
  pathData: string;
  color: string;
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

export function NoteDrawingCanvas({ noteId, mode }: { noteId: string; mode: 'pen' | 'eraser' }) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentPoints, setCurrentPoints] = useState<number[][] | null>(null);
  const [color] = useState('#2563eb');
  const isDrawing = useRef(false);

  // Load strokes for this note
  useEffect(() => {
    fetch(`/api/cards/${noteId}`)
      .then((r) => r.json())
      .then((card) => {
        try {
          const meta = JSON.parse(card.metadata || '{}');
          if (meta.strokes) setStrokes(meta.strokes);
        } catch {}
      });
  }, [noteId]);

  const saveStrokes = useCallback(
    async (newStrokes: Stroke[]) => {
      try {
        const r = await fetch(`/api/cards/${noteId}`);
        const card = await r.json();
        let meta: Record<string, any> = {};
        try { meta = JSON.parse(card.metadata || '{}'); } catch {}
        meta.strokes = newStrokes;
        await fetch(`/api/cards/${noteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata: JSON.stringify(meta) }),
        });
      } catch (e) {
        console.error('Failed to save strokes:', e);
      }
    },
    [noteId]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== 'pen') return;
      e.preventDefault();
      isDrawing.current = true;
      const rect = (e.target as SVGElement).getBoundingClientRect();
      setCurrentPoints([[e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5]]);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [mode]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing.current || !currentPoints) return;
      e.preventDefault();
      const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
      setCurrentPoints((prev) => [...(prev || []), [e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5]]);
    },
    [currentPoints]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing.current || !currentPoints) return;
      e.preventDefault();
      isDrawing.current = false;

      if (currentPoints.length < 2) { setCurrentPoints(null); return; }

      const outline = getStroke(currentPoints, {
        size: 4,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
      });
      const pathData = getSvgPathFromStroke(outline);
      const newStroke: Stroke = { id: uuid(), pathData, color };
      const updated = [...strokes, newStroke];
      setStrokes(updated);
      saveStrokes(updated);
      setCurrentPoints(null);
    },
    [currentPoints, strokes, color, saveStrokes]
  );

  const eraseStroke = useCallback(
    (id: string) => {
      const updated = strokes.filter((s) => s.id !== id);
      setStrokes(updated);
      saveStrokes(updated);
    },
    [strokes, saveStrokes]
  );

  const currentPath = currentPoints
    ? getSvgPathFromStroke(
        getStroke(currentPoints, { size: 4, thinning: 0.5, smoothing: 0.5, streamline: 0.5 })
      )
    : null;

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      style={{ cursor: mode === 'pen' ? 'crosshair' : 'pointer', zIndex: 10 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {strokes.map((s) => (
        <path
          key={s.id}
          d={s.pathData}
          fill={mode === 'eraser' ? undefined : s.color}
          stroke={mode === 'eraser' ? 'transparent' : undefined}
          strokeWidth={mode === 'eraser' ? 20 : undefined}
          style={mode === 'eraser' ? { cursor: 'pointer', pointerEvents: 'all', fill: s.color } : undefined}
          opacity={0.85}
          onClick={mode === 'eraser' ? () => eraseStroke(s.id) : undefined}
          onMouseEnter={mode === 'eraser' ? (e) => { (e.target as SVGPathElement).style.opacity = '0.3'; } : undefined}
          onMouseLeave={mode === 'eraser' ? (e) => { (e.target as SVGPathElement).style.opacity = '0.85'; } : undefined}
        />
      ))}
      {currentPath && <path d={currentPath} fill={color} opacity={0.85} />}
    </svg>
  );
}
