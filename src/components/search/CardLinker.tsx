'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link2, Search, FileText, Lightbulb, X, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/lib/store/canvas-store';

interface LinkableCard {
  id: string;
  title: string;
  content: string;
  type: string;
  workspaceId: string;
  workspaceName: string;
  sourcePath?: string;
}

interface CardLinkerProps {
  onLink: (card: LinkableCard) => void;
}

export function CardLinker({ onLink }: CardLinkerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LinkableCard[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { closeCardLinker, activeWorkspaceId } = useCanvasStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCardLinker();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeCardLinker]);

  // Search across ALL workspaces (excluding current)
  useEffect(() => {
    if (!query.trim()) {
      // Show recent cards from other workspaces when no query
      const loadRecent = async () => {
        setLoading(true);
        const res = await fetch(`/api/cards/linkable?exclude=${activeWorkspaceId || ''}`);
        const data = await res.json();
        setResults(data);
        setLoading(false);
      };
      loadRecent();
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(
        `/api/cards/linkable?q=${encodeURIComponent(query)}&exclude=${activeWorkspaceId || ''}`
      );
      const data = await res.json();
      setResults(data);
      setSelectedIndex(0);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, activeWorkspaceId]);

  const handleSelect = useCallback(
    (card: LinkableCard) => {
      onLink(card);
      closeCardLinker();
    },
    [onLink, closeCardLinker]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  const iconForType = (type: string) => {
    switch (type) {
      case 'note': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'concept': return <Lightbulb className="w-4 h-4 text-purple-400" />;
      case 'pdf': return <FileText className="w-4 h-4 text-red-400" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={closeCardLinker} />

      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[520px] max-h-[55vh] bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-200 animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Link2 className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 text-base text-gray-800 bg-transparent outline-none placeholder:text-gray-400"
            placeholder="Search cards from other workspaces..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[calc(55vh-56px)]">
          {loading && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">Searching...</div>
          )}

          {!loading && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              {query ? `No cards found for "${query}"` : 'No cards in other workspaces yet'}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-1">
              {results.map((card, index) => (
                <button
                  key={card.id}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors',
                    index === selectedIndex ? 'bg-amber-50' : 'hover:bg-gray-50'
                  )}
                  onClick={() => handleSelect(card)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="mt-0.5">{iconForType(card.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {card.title || 'Untitled'}
                    </div>
                    {card.content && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {card.content.replace(/<[^>]*>/g, '').substring(0, 100)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0">
                    <Layout className="w-3 h-3" />
                    <span className="truncate max-w-[80px]">{card.workspaceName}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
