import React, { useMemo, useState } from 'react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  initialSortKey,
  className,
}: {
  columns: Column<T>[];
  data: T[];
  initialSortKey?: string;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState(initialSortKey || '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter((row) => Object.values(row).some((v) => String(v || '').toLowerCase().includes(q)));
  }, [data, query]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey as keyof T];
      const bv = b[sortKey as keyof T];
      const cmp = String(av || '').localeCompare(String(bv || ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <input className="input-base w-64" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-200 dark:border-slate-800">
              {columns.map((c) => (
                <th key={String(c.key)} className="px-3 py-2">
                  <button
                    type="button"
                    className="font-medium"
                    onClick={() => {
                      if (!c.sortable) return;
                      if (sortKey === String(c.key)) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                      else setSortKey(String(c.key));
                    }}
                  >
                    {c.header}
                    {sortKey === String(c.key) ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                {columns.map((c) => (
                  <td key={String(c.key)} className="px-3 py-2">
                    {c.render ? c.render(row) : String(row[c.key as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-slate-500" colSpan={columns.length}>No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;