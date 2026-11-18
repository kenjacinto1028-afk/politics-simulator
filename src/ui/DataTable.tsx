import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => number | string;
  filter?: (row: T) => string;
  className?: string;
}

export interface ExtraFilter<T> {
  label: string;
  options: { value: string; label: string }[];
  test: (row: T, value: string) => boolean;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  rowClass?: (row: T) => string;
  filterPlaceholder?: string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  /** Hide the text box (for short tables). */
  noFilter?: boolean;
  extraFilter?: ExtraFilter<T>;
  extraFilters?: ExtraFilter<T>[];
  className?: string;
}

function compare(a: number | string, b: number | string): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function DataTable<T>({ rows, columns, rowKey, rowClass, filterPlaceholder = 'Filter...', initialSort, noFilter, extraFilter, extraFilters, className }: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null);
  const [text, setText] = useState('');
  const filters = useMemo(() => [...(extraFilters ?? []), ...(extraFilter ? [extraFilter] : [])], [extraFilters, extraFilter]);
  const [picked, setPicked] = useState<Record<number, string>>({});

  const shown = useMemo(() => {
    const q = text.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (q && !columns.some((c) => {
        const f = c.filter ? c.filter(r) : c.sort ? String(c.sort(r)) : '';
        return f.toLowerCase().includes(q);
      })) return false;
      return filters.every((f, i) => !picked[i] || f.test(r, picked[i]));
    });
    const col = sort && columns.find((c) => c.key === sort.key);
    if (col?.sort) {
      const get = col.sort;
      const dir = sort!.dir === 'asc' ? 1 : -1;
      out = out.map((r, i) => ({ r, i, v: get(r) })).sort((a, b) => dir * compare(a.v, b.v) || a.i - b.i).map((x) => x.r);
    }
    return out;
  }, [rows, columns, text, filters, picked, sort]);

  const toggle = (c: Column<T>) => {
    if (!c.sort) return;
    setSort((s) => (s && s.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: typeof c.sort!(rows[0] as T) === 'number' && rows.length ? 'desc' : 'asc' }));
  };

  const showTools = !noFilter || filters.length > 0;
  return (
    <>
      {showTools && (
        <div className="table-tools">
          {!noFilter && <input type="search" value={text} placeholder={filterPlaceholder} aria-label={filterPlaceholder} onChange={(e) => setText(e.target.value)} />}
          {filters.map((f, i) => (
            <select key={i} aria-label={f.label} value={picked[i] ?? ''} onChange={(e) => setPicked({ ...picked, [i]: e.target.value })}>
              <option value="">{f.label}: all</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
          <span className="count">{shown.length} of {rows.length}</span>
        </div>
      )}
      <div className="scroll">
        <table className={`sortable${className ? ' ' + className : ''}`}>
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key && !!c.sort;
                return (
                  <th
                    key={c.key}
                    className={`${c.className ?? ''}${c.sort ? '' : ' nosort'}`.trim() || undefined}
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    onClick={() => toggle(c)}
                    onKeyDown={(e) => { if (c.sort && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(c); } }}
                    tabIndex={c.sort ? 0 : undefined}
                  >{c.label}</th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={rowKey(r)} className={rowClass ? rowClass(r) : undefined}>
                {columns.map((c) => <td key={c.key} className={c.className}>{c.render(r)}</td>)}
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={columns.length} className="muted">Nothing matches.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
