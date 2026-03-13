'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ChevronUp,
  ChevronDown,
  Minus,
} from 'lucide-react';
import { useCanvasStore } from '@/lib/store/canvas-store';

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PdfViewerProps {
  fileUrl: string;
  title: string;
}

const ZOOM_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];

export function PdfViewer({ fileUrl, title }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const { closePdfViewer } = useCanvasStore();

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePdfViewer();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closePdfViewer]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  }, []);

  // Track current page on scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || numPages === 0) return;

    const handleScroll = () => {
      const rect = container.getBoundingClientRect();
      const mid = rect.top + rect.height / 3;

      let closest = 1;
      let closestDist = Infinity;

      pageRefs.current.forEach((el, num) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top - mid);
        if (d < closestDist) {
          closestDist = d;
          closest = num;
        }
      });

      setCurrentPage(closest);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [numPages]);

  const scrollToPage = useCallback((page: number) => {
    const el = pageRefs.current.get(page);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const zoomIn = () => {
    setScale((s) => {
      const next = ZOOM_PRESETS.find((p) => p > s + 0.01);
      return next ?? 3.0;
    });
  };

  const zoomOut = () => {
    setScale((s) => {
      const next = [...ZOOM_PRESETS].reverse().find((p) => p < s - 0.01);
      return next ?? 0.5;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fade-in">
      {/* Backdrop — click to close */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closePdfViewer} />

      {/* Viewer container */}
      <div className="relative z-10 flex flex-col mx-auto my-4 w-[calc(100vw-80px)] max-w-[1100px] h-[calc(100vh-32px)] bg-white rounded-xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-200 bg-gray-50/90 backdrop-blur-sm flex-shrink-0">
          {/* Title */}
          <span className="text-sm font-medium text-gray-700 truncate max-w-[300px]">{title}</span>

          {/* Center controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={zoomOut}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setScale(1.0)}
              className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-md transition-colors min-w-[52px] text-center tabular-nums"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>

            <div className="w-px h-5 bg-gray-200 mx-1.5" />

            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
              title="Rotate"
            >
              <RotateCw className="w-4 h-4 text-gray-600" />
            </button>

            <div className="w-px h-5 bg-gray-200 mx-1.5" />

            {/* Page nav */}
            <button
              onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 hover:bg-gray-200 rounded-md disabled:opacity-30 transition-colors"
            >
              <ChevronUp className="w-4 h-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-1 text-xs text-gray-600 tabular-nums">
              <input
                type="number"
                value={currentPage}
                onChange={(e) => {
                  const p = parseInt(e.target.value);
                  if (p >= 1 && p <= numPages) {
                    setCurrentPage(p);
                    scrollToPage(p);
                  }
                }}
                className="w-10 text-center bg-white border border-gray-300 rounded px-1 py-0.5 text-xs outline-none focus:border-blue-400"
                min={1}
                max={numPages}
              />
              <span className="text-gray-400">/</span>
              <span>{numPages || '–'}</span>
            </div>
            <button
              onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              className="p-1.5 hover:bg-gray-200 rounded-md disabled:opacity-30 transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            <a
              href={fileUrl}
              download={title}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4 text-gray-600" />
            </a>
            <button
              onClick={closePdfViewer}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors ml-1"
              title="Close (Esc)"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* PDF pages — continuous scroll */}
        <div ref={scrollRef} className="flex-1 overflow-auto bg-neutral-100">
          <div className="flex flex-col items-center py-6 gap-3">
            {loading && (
              <div className="flex items-center justify-center py-32">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            )}
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={null}
              onLoadError={(error) => console.error('PDF load error:', error)}
            >
              {Array.from({ length: numPages }, (_, i) => (
                <div
                  key={i + 1}
                  ref={(el) => {
                    if (el) pageRefs.current.set(i + 1, el);
                  }}
                  className="shadow-lg rounded-sm overflow-hidden bg-white"
                >
                  <Page
                    pageNumber={i + 1}
                    scale={scale}
                    rotate={rotation}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading={
                      <div
                        className="flex items-center justify-center bg-white"
                        style={{ width: 680 * scale, height: 880 * scale }}
                      >
                        <span className="text-gray-300 text-sm">Page {i + 1}</span>
                      </div>
                    }
                  />
                </div>
              ))}
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
}
