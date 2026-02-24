import React from 'react';
import { Checkbox } from '../ui/Checkbox';
import { DropdownMenu } from '../ui/DropdownMenu';

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
  stickyHeader?: boolean;
  rowActions?: (row: T) => React.ReactNode;
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
    <div className="panel">
      {filters && <div className="border-b border-slate-200 p-2">{filters}</div>}
      {bulkToolbar && (
        <div className="p-2 text-xs flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
          {bulkToolbar}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className={`table ${stickyHeader ? 'sticky-header' : ''}`}>
          <thead>
            <tr>
              <th className="table-th w-8">
                <Checkbox checked={allSelected} onChange={toggleAll} aria-label="Select all" />
              </th>
              {columns.map((c) => (
                <th key={String(c.key)} className="table-th" style={{ width: c.width }}>
                  <button
                    className="flex items-center gap-1 hover:text-slate-900"
                    onClick={() => c.sortable && onSortChange?.(String(c.key), sort?.dir === 'asc' ? 'desc' : 'asc')}
                  >
                    <span>{c.header}</span>
                    {sort?.key === c.key && <span className="text-slate-500">{sort.dir === 'asc' ? '▴' : '▾'}</span>}
                  </button>
                </th>
              ))}
              {rowActions && <th className="table-th w-10">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length + 1 + (rowActions ? 1 : 0)} className="px-3 py-4 text-slate-500">
                  Loading...
                </td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td colSpan={columns.length + 1 + (rowActions ? 1 : 0)} className="px-3 py-4 text-red-600">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1 + (rowActions ? 1 : 0)} className="px-3 py-4 text-slate-500">
                  No results
                </td>
              </tr>
            )}
            {!loading && !error && rows.map((r) => {
              const id = getRowId ? getRowId(r) : String(r.id);
              return (
                <tr key={id} className="table-row">
                  <td className="table-td">
                    <Checkbox checked={!!selected[id]} onChange={() => toggleOne(id)} aria-label={`Select row ${id}`} />
                  </td>
                  {columns.map((c) => (
                    <td key={String(c.key)} className="table-td">
                      {c.render ? c.render(r) : (r[c.key as keyof T] as any)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="table-td">
                      {rowActions(r) || null}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between p-2 text-xs" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
        <div>
          Page {page}
          {totalPages ? ` of ${totalPages}` : ''}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>
            Prev
          </button>
          <button className="btn btn-ghost" disabled={totalPages ? page >= totalPages : true} onClick={() => onPageChange?.(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
 