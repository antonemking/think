'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateFilterProps {
  nodes: { id: string; data: Record<string, unknown> }[];
  onFilter: (visibleIds: Set<string> | null) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DateFilter({ nodes, onFilter }: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState<{ year: number; month: number } | null>(null);

  // Map each date to the set of node IDs created that day
  const dateNodeMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const node of nodes) {
      const raw = node.data.createdAt as string | undefined;
      if (!raw) continue;
      const d = new Date(raw);
      if (isNaN(d.getTime())) continue;
      const key = dateKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(node.id);
    }
    return map;
  }, [nodes]);

  // Auto-set viewMonth to the most recent month with data
  useEffect(() => {
    if (viewMonth) return;
    const dates = Array.from(dateNodeMap.keys()).sort();
    if (dates.length > 0) {
      const latest = dates[dates.length - 1];
      const [y, m] = latest.split('-').map(Number);
      setViewMonth({ year: y, month: m - 1 });
    } else {
      const now = new Date();
      setViewMonth({ year: now.getFullYear(), month: now.getMonth() });
    }
  }, [dateNodeMap, viewMonth]);

  // Build calendar grid for current month
  const calendarDays = useMemo(() => {
    if (!viewMonth) return [];
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);

    return grid;
  }, [viewMonth]);

  const handleSelectDate = useCallback((day: number) => {
    if (!viewMonth) return;
    const key = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (selectedDate === key) {
      setSelectedDate(null);
      onFilter(null);
    } else {
      setSelectedDate(key);
      const ids = dateNodeMap.get(key);
      onFilter(ids ? new Set(ids) : new Set());
    }
  }, [viewMonth, selectedDate, dateNodeMap, onFilter]);

  const handleClear = useCallback(() => {
    setSelectedDate(null);
    onFilter(null);
    setOpen(false);
  }, [onFilter]);

  const prevMonth = () => {
    setViewMonth((v) => {
      if (!v) return v;
      if (v.month === 0) return { year: v.year - 1, month: 11 };
      return { ...v, month: v.month - 1 };
    });
  };

  const nextMonth = () => {
    setViewMonth((v) => {
      if (!v) return v;
      if (v.month === 11) return { year: v.year + 1, month: 0 };
      return { ...v, month: v.month + 1 };
    });
  };

  const today = dateKey(new Date());

  // All unique months that have data, for quick jump
  const monthsWithData = useMemo(() => {
    const set = new Set<string>();
    for (const key of dateNodeMap.keys()) {
      set.add(key.substring(0, 7)); // "YYYY-MM"
    }
    return Array.from(set).sort();
  }, [dateNodeMap]);

  if (!viewMonth) return null;

  return (
    <div className="absolute top-3 right-3 z-20">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm border text-sm font-medium transition-colors',
          selectedDate
            ? 'bg-purple-50 border-purple-200 text-purple-700'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
        )}
      >
        <Calendar className="w-4 h-4" />
        {selectedDate ? (
          <>
            <span>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="ml-1 p-0.5 hover:bg-purple-100 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <span>Filter by date</span>
        )}
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-[280px] animate-scale-in">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-semibold text-gray-700">
              {MONTHS[viewMonth.month]} {viewMonth.year}
            </span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const key = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const count = dateNodeMap.get(key)?.length ?? 0;
              const isSelected = key === selectedDate;
              const isToday = key === today;

              return (
                <button
                  key={key}
                  onClick={() => handleSelectDate(day)}
                  className={cn(
                    'relative w-8 h-8 mx-auto rounded-lg text-xs font-medium transition-colors flex items-center justify-center',
                    isSelected
                      ? 'bg-purple-500 text-white'
                      : count > 0
                        ? 'text-gray-800 hover:bg-purple-50 font-semibold'
                        : 'text-gray-300 hover:bg-gray-50',
                    isToday && !isSelected && 'ring-1 ring-purple-300'
                  )}
                >
                  {day}
                  {count > 0 && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400" />
                  )}
                  {count > 0 && isSelected && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-700 text-[9px] text-white flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Month jump chips */}
          {monthsWithData.length > 1 && (
            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100">
              {monthsWithData.map((ym) => {
                const [y, m] = ym.split('-').map(Number);
                const isActive = viewMonth.year === y && viewMonth.month === m - 1;
                return (
                  <button
                    key={ym}
                    onClick={() => setViewMonth({ year: y, month: m - 1 })}
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors',
                      isActive
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    )}
                  >
                    {MONTHS[m - 1].substring(0, 3)} {y !== new Date().getFullYear() ? y : ''}
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => {
                setSelectedDate(today);
                const ids = dateNodeMap.get(today);
                onFilter(ids ? new Set(ids) : new Set());
                setViewMonth({ year: new Date().getFullYear(), month: new Date().getMonth() });
              }}
              className="flex-1 text-xs py-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium"
            >
              Today
            </button>
            <button
              onClick={handleClear}
              className="flex-1 text-xs py-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium"
            >
              Show all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
