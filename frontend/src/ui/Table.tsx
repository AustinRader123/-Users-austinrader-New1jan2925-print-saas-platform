import React from 'react';
import Button from './Button';
import Input from './Input';

type FilterOption = { label: string; value: string };

export type TableColumn<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
};

export type TableFilter<T> = {
  key: string;
  label: string;
  options: FilterOption[];
  getValue: (row: T) => string;
};

export type TableRowAction<T> = {
  label: string;
  variant?: 'secondary' | 'danger';
  onClick: (row: T) => void;
};

export function Table<T>({
  columns,
  rows,
  title,
  searchPlaceholder = 'Search rows',
  searchBy,
  filters = [],
  getRowId,
  pageSize = 10,
  rowActions = [],
  onBulkAction,
  bulkActionLabel = 'Apply',
}: {
  columns: TableColumn<T>[];
  rows: T[];
  title?: string;
  searchPlaceholder?: string;
  searchBy?: (row: T, query: string) => boolean;
  filters?: TableFilter<T>[];
  getRowId?: (row: T) => string;
  pageSize?: number;
  rowActions?: TableRowAction<T>[];
  onBulkAction?: (rows: T[]) => void;
  bulkActionLabel?: string;
}) {
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [filterValues, setFilterValues] = React.useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    filters.forEach((filter) => {
      initial[filter.key] = 'ALL';
    });
    return initial;
  });
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [ascending, setAscending] = React.useState(true);

  const resolveRowId = React.useCallback(
    (row: T, index: number) => {
      if (getRowId) return getRowId(row);
      const candidate = (row as any)?.id;
      return typeof candidate === 'string' || typeof candidate === 'number' ? String(candidate) : `row-${index}`;
    },
    [getRowId]
  );

  const filteredRows = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const queryPass =
        !normalizedQuery ||
        (searchBy ? searchBy(row, normalizedQuery) : JSON.stringify(row).toLowerCase().includes(normalizedQuery));
      if (!queryPass) return false;

      return filters.every((filter) => {
        const selected = filterValues[filter.key] || 'ALL';
        if (selected === 'ALL') return true;
        return filter.getValue(row) === selected;
      });
    });
  }, [rows, query, searchBy, filters, filterValues]);

  const sortedRows = React.useMemo(() => {
    if (!sortKey) return filteredRows;
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) return filteredRows;
    const copy = [...filteredRows].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (av < bv) return ascending ? -1 : 1;
      if (av > bv) return ascending ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filteredRows, columns, sortKey, ascending, rows]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  React.useEffect(() => {
    setPage((value) => Math.min(Math.max(1, value), totalPages));
  }, [totalPages]);

  const pagedRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const selectedRows = React.useMemo(() => {
    if (selectedIds.size === 0) return [] as T[];
    return sortedRows.filter((row, index) => selectedIds.has(resolveRowId(row, index)));
  }, [sortedRows, selectedIds, resolveRowId]);

  const allVisibleSelected =
    pagedRows.length > 0 &&
    pagedRows.every((row, index) => selectedIds.has(resolveRowId(row, (page - 1) * pageSize + index)));

  return (
    <div className="ops-table-card">
      <div className="ops-table-toolbar">
        <div className="ops-table-toolbar-left">
          {title ? <h3 className="ops-table-title">{title}</h3> : null}
          <Input
            className="ops-table-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
          />
          {filters.map((filter) => (
            <select
              key={filter.key}
              className="ops-select"
              value={filterValues[filter.key] || 'ALL'}
              onChange={(event) => {
                setFilterValues((value) => ({ ...value, [filter.key]: event.target.value }));
                setPage(1);
              }}
            >
              <option value="ALL">All {filter.label}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
        </div>
        <div className="ops-table-toolbar-right">
          <span>{sortedRows.length} rows</span>
          {onBulkAction ? (
            <Button
              variant="secondary"
              disabled={selectedRows.length === 0}
              onClick={() => onBulkAction(selectedRows)}
            >
              {bulkActionLabel} ({selectedRows.length})
            </Button>
          ) : null}
        </div>
      </div>

      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th className="ops-table-checkbox-col">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => {
                    const next = new Set(selectedIds);
                    pagedRows.forEach((row, index) => {
                      const rowId = resolveRowId(row, (page - 1) * pageSize + index);
                      if (event.target.checked) next.add(rowId);
                      else next.delete(rowId);
                    });
                    setSelectedIds(next);
                  }}
                />
              </th>
              {columns.map((column) => (
                <th key={column.key}>
                  {column.sortable ? (
                    <button
                      type="button"
                      className="ops-table-sort"
                      onClick={() => {
                        if (sortKey === column.key) setAscending((value) => !value);
                        else {
                          setSortKey(column.key);
                          setAscending(true);
                        }
                      }}
                    >
                      {column.label}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
              {rowActions.length > 0 ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, index) => {
              const rowId = resolveRowId(row, (page - 1) * pageSize + index);
              const isSelected = selectedIds.has(rowId);
              return (
                <tr key={rowId} className={isSelected ? 'is-selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(event) => {
                        const next = new Set(selectedIds);
                        if (event.target.checked) next.add(rowId);
                        else next.delete(rowId);
                        setSelectedIds(next);
                      }}
                    />
                  </td>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render(row)}</td>
                  ))}
                  {rowActions.length > 0 ? (
                    <td>
                      <div className="ops-table-actions">
                        {rowActions.map((action) => (
                          <Button
                            key={action.label}
                            variant={action.variant === 'danger' ? 'danger' : 'secondary'}
                            onClick={() => action.onClick(row)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ops-table-footer">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="ops-table-pagination">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Table;
