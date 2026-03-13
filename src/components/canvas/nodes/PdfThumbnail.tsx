'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { FileText } from 'lucide-react';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PdfThumbnailProps {
  fileUrl: string;
}

export default function PdfThumbnail({ fileUrl }: PdfThumbnailProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <FileText className="w-12 h-12 text-gray-300" />
      </div>
    );
  }

  return (
    <Document
      file={fileUrl}
      loading={
        <div className="flex items-center justify-center h-[300px]">
          <div className="animate-pulse w-8 h-8 bg-gray-200 rounded" />
        </div>
      }
      onLoadError={() => setError(true)}
    >
      <Page
        pageNumber={1}
        width={240}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        devicePixelRatio={4}
      />
    </Document>
  );
}
