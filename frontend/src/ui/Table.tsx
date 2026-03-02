import React from 'react';

export type TableColumn<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
};

export function Table<T>({
  columns,
  rows,
}: {
  columns: TableColumn<T>[];
  rows: T[];
}) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [ascending, setAscending] = React.useState(true);

  const sortedRows = React.useMemo(() => {
    if (!sortKey) return rows;
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) return rows;
    const copy = [...rows].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (av < bv) return ascending ? -1 : 1;
      if (av > bv) return ascending ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, columns, sortKey, ascending]);

  return (
    <div className="ops-table-wrap">
      <table className="ops-table">
        <thead>
          <tr>
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
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
