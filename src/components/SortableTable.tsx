import { useMemo, useState, type ReactNode } from 'react';

export type SortValue = number | string | null;

export interface Column<T> {
  key: string;
  header: string;
  /** Short header for narrow screens (e.g. "Поз."). */
  abbr?: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => SortValue;
  align?: 'left' | 'right' | 'center';
  /** Hidden on small screens to keep the table readable. */
  optional?: boolean;
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null;

/** Nulls always go last; original order is kept for equal values. */
export function sortRows<T>(rows: T[], get: (row: T) => SortValue, dir: 'asc' | 'desc'): T[] {
  const indexed = rows.map((row, i) => ({ row, i, v: get(row) }));
  indexed.sort((a, b) => {
    if (a.v === null && b.v === null) return a.i - b.i;
    if (a.v === null) return 1;
    if (b.v === null) return -1;
    let c: number;
    if (typeof a.v === 'number' && typeof b.v === 'number') c = a.v - b.v;
    else c = String(a.v).localeCompare(String(b.v), 'ru');
    if (c === 0) return a.i - b.i;
    return dir === 'asc' ? c : -c;
  });
  return indexed.map((x) => x.row);
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  rowClassName?: (row: T) => string | undefined;
}

export function SortableTable<T>({ columns, rows, rowKey, caption, rowClassName }: Props<T>) {
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    return sortRows(rows, col.sortValue, sort.dir);
  }, [rows, columns, sort]);

  // Cycle: ascending → descending → original championship order.
  function toggle(key: string) {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: 'asc' };
      if (s.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="visually-hidden">
          {caption}
          {sort ? '' : ', порядок источника'}
        </caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const ariaSort = active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none';
              return (
                <th
                  key={c.key}
                  scope="col"
                  className={`${c.optional ? 'col-optional ' : ''}align-${c.align ?? 'left'}`}
                  aria-sort={c.sortValue ? ariaSort : undefined}
                >
                  {c.sortValue ? (
                    <button type="button" className="th-sort" onClick={() => toggle(c.key)}>
                      <span className={c.abbr ? 'th-full' : undefined}>{c.header}</span>
                      {c.abbr && (
                        <span className="th-abbr" aria-hidden="true">
                          {c.abbr}
                        </span>
                      )}
                      <span className="th-sort__icon" aria-hidden="true">
                        <svg viewBox="0 0 8 12" width="8" height="12" focusable="false">
                          <path d="M4 0.7 7.5 4.6H0.5z" fill="currentColor" />
                          <path d="M4 11.3 0.5 7.4h7z" fill="currentColor" />
                        </svg>
                      </span>
                    </button>
                  ) : (
                    <>
                      <span className={c.abbr ? 'th-full' : undefined}>{c.header}</span>
                      {c.abbr && (
                        <span className="th-abbr" aria-hidden="true">
                          {c.abbr}
                        </span>
                      )}
                    </>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={rowKey(row)} className={rowClassName?.(row)}>
              {columns.map((c) => (
                <td key={c.key} className={`${c.optional ? 'col-optional ' : ''}align-${c.align ?? 'left'}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
