'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, Lightbulb, Hash, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/lib/store/canvas-store';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  type: string;
  workspaceId: string;
  workspaceName?: string;
}

export function CommandPalette() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toggleSearch, setActiveWorkspace } = useCanvasStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSearch]);

  // Search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setActiveWorkspace(result.workspaceId);
      toggleSearch();
      // TODO: Pan to the selected card on canvas
    },
    [setActiveWorkspace, toggleSearch]
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
      case 'note':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'concept':
        return <Lightbulb className="w-4 h-4 text-purple-400" />;
      case 'pdf':
      case 'document':
        return <FileText className="w-4 h-4 text-red-400" />;
      default:
        return <Hash className="w-4 h-4 text-gray-400" />;
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={toggleSearch} />

      {/* Palette */}
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[560px] max-h-[60vh] bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-200">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 text-base text-gray-800 bg-transparent outline-none placeholder:text-gray-400"
            placeholder="Search cards, notes, documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <kbd className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[calc(60vh-60px)]">
          {loading && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Searching...</div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No results for &quot;{query}&quot;
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-1">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors',
                    index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  )}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="mt-0.5">{iconForType(result.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {highlightMatch(result.title || 'Untitled', query)}
                    </div>
                    {result.content && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {highlightMatch(
                          result.content.replace(/<[^>]*>/g, '').substring(0, 120),
                          query
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-0.5">
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!query && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-400">Type to search across all your notes and documents</p>
              <p className="text-xs text-gray-300 mt-2">
                Searches titles, content, and extracted PDF text
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
