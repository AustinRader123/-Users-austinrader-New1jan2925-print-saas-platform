import React from 'react';

export type Column<T> = {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: string | null;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onSortChange?: (key: string, dir: 'asc' | 'desc') => void;
  sort?: { key: string; dir: 'asc' | 'desc' } | null;
  bulkToolbar?: React.ReactNode;
  filters?: React.ReactNode;
  onSelectionChange?: (ids: string[]) => void;
  getRowId?: (row: T) => string;
};

export default function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  loading,
  error,
  page = 1,
  pageSize = 20,
  total,
  onPageChange,
  onSortChange,
  sort,
  bulkToolbar,
  filters,
  onSelectionChange,
  getRowId,
}: Props<T>) {
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const allSelected = React.useMemo(() => {
    const ids = rows.map((r) => (getRowId ? getRowId(r) : String(r.id)));
    return ids.length > 0 && ids.every((id) => selected[id]);
  }, [rows, selected, getRowId]);

  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    if (!allSelected) {
      rows.forEach((r) => {
        const id = getRowId ? getRowId(r) : String(r.id);
        next[id] = true;
      });
    }
    setSelected(next);
    onSelectionChange?.(Object.keys(next));
  };

  const toggleOne = (id: string) => {
    const next = { ...selected, [id]: !selected[id] };
    setSelected(next);
    onSelectionChange?.(Object.keys(next).filter((k) => next[k]));
  };

  const totalPages = total && pageSize ? Math.ceil(total / pageSize) : undefined;

  return (
    <div className="rounded border border-slate-200 bg-white">
      {filters && <div className="border-b border-slate-200 p-2">{filters}</div>}
      {bulkToolbar && (
        <div className="border-b border-slate-200 p-2 bg-slate-50 text-xs text-slate-700 flex items-center gap-2">
          {bulkToolbar}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2 w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              {columns.map((c) => (
                <th key={String(c.key)} className="px-3 py-2 text-slate-700 font-medium" style={{ width: c.width }}>
                  <button
                    className="flex items-center gap-1"
                    onClick={() => c.sortable && onSortChange?.(String(c.key), sort?.dir === 'asc' ? 'desc' : 'asc')}
                  >
                    <span>{c.header}</span>
                    {sort?.key === c.key && <span className="text-slate-500">{sort.dir === 'asc' ? '▴' : '▾'}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-4 text-slate-500">
                  Loading...
                </td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-4 text-red-600">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-4 text-slate-500">
                  No results
                </td>
              </tr>
            )}
            {!loading && !error && rows.map((r) => {
              const id = getRowId ? getRowId(r) : String(r.id);
              return (
                <tr key={id} className="border-t border-slate-200">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={!!selected[id]} onChange={() => toggleOne(id)} />
                  </td>
                  {columns.map((c) => (
                    <td key={String(c.key)} className="px-3 py-2">
                      {c.render ? c.render(r) : (r[c.key as keyof T] as any)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 p-2 text-xs text-slate-700">
        <div>
          Page {page}
          {totalPages ? ` of ${totalPages}` : ''}
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-sm border px-2 py-1" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>
            Prev
          </button>
          <button className="rounded-sm border px-2 py-1" disabled={totalPages ? page >= totalPages : true} onClick={() => onPageChange?.(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
 