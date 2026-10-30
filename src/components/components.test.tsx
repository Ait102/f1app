import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';

import { ApiError } from '../api/client';
import type { DataMeta } from '../domain/types';
import { useResource } from '../hooks/useResource';
import { leaderShare } from './bits';
import { DataState } from './DataState';
import { SortableTable, sortRows, type Column } from './SortableTable';

type Row = { id: string; pos: number | null; pts: number | null };
const rows: Row[] = [
  { id: 'a', pos: 1, pts: 25 },
  { id: 'b', pos: 2, pts: null },
  { id: 'c', pos: 3, pts: 30 },
];
const cols: Column<Row>[] = [
  { key: 'id', header: 'ID', render: (r) => r.id },
  { key: 'pts', header: 'Очки', render: (r) => r.pts ?? '—', sortValue: (r) => r.pts },
];

const meta: DataMeta = {
  provider: 'Jolpica-F1',
  sourceUrl: 'https://x',
  fetchedAt: '2026-10-29T10:00:00.000Z',
  stale: false,
};

const ids = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => r.firstChild?.textContent);

describe('sortRows', () => {
  it('puts nulls last in both directions and is stable', () => {
    expect(sortRows(rows, (r) => r.pts, 'asc').map((r) => r.id)).toEqual(['a', 'c', 'b']);
    expect(sortRows(rows, (r) => r.pts, 'desc').map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('SortableTable', () => {
  it('keeps source order by default and cycles asc → desc → original', () => {
    render(<SortableTable columns={cols} rows={rows} rowKey={(r) => r.id} caption="t" />);
    expect(ids()).toEqual(['a', 'b', 'c']);
    const btn = screen.getByRole('button', { name: /Очки/ });
    fireEvent.click(btn);
    expect(ids()).toEqual(['a', 'c', 'b']);
    expect(screen.getByRole('columnheader', { name: /Очки/ })).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(btn);
    expect(ids()).toEqual(['c', 'a', 'b']);
    fireEvent.click(btn);
    expect(ids()).toEqual(['a', 'b', 'c']);
  });
});

describe('DataState', () => {
  const base = { reload: vi.fn() };

  it('shows loading', () => {
    render(<DataState state={{ ...base, status: 'loading' }}>{() => 'x'}</DataState>);
    expect(screen.getByRole('status')).toHaveTextContent(/Загрузка/);
  });

  it('shows a rate-limit error with retry', () => {
    const reload = vi.fn();
    render(
      <DataState state={{ reload, status: 'error', error: new ApiError('rate-limit', 'x', 429, 5) }}>
        {() => 'x'}
      </DataState>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/429/);
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(reload).toHaveBeenCalled();
  });

  it('shows empty text and source meta', () => {
    render(
      <DataState
        state={{ ...base, status: 'success', data: [] as number[], meta }}
        isEmpty={(d) => d.length === 0}
        emptyText="Пусто"
      >
        {() => 'x'}
      </DataState>,
    );
    expect(screen.getByText('Пусто')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Jolpica-F1' })).toHaveAttribute('href', 'https://x');
  });

  it('warns when data is stale', () => {
    render(
      <DataState
        state={{
          ...base,
          status: 'success',
          data: 1,
          meta: { ...meta, stale: true, staleReason: 'Нет связи.' },
        }}
      >
        {() => 'ok'}
      </DataState>,
    );
    expect(screen.getByText(/последние сохранённые данные/)).toBeInTheDocument();
  });
});

describe('useResource', () => {
  it('never shows the previous season while switching', async () => {
    let resolve2026!: (v: { data: string; meta: DataMeta }) => void;
    const load = (season: number) =>
      season === 2025
        ? Promise.resolve({ data: 'data-2025', meta })
        : new Promise<{ data: string; meta: DataMeta }>((r) => (resolve2026 = r));

    const { result, rerender } = renderHook(({ s }) => useResource(`races:${s}`, () => load(s)), {
      initialProps: { s: 2025 },
    });
    await waitFor(() => expect(result.current.status).toBe('success'));

    rerender({ s: 2026 });
    expect(result.current.status).toBe('loading');

    await act(async () => resolve2026({ data: 'data-2026', meta }));
    expect(result.current).toMatchObject({ status: 'success', data: 'data-2026' });
  });
});

describe('leaderShare', () => {
  it('is the share of the leader, clamped and with a visible minimum', () => {
    expect(leaderShare(50, 200)).toBe(25);
    expect(leaderShare(0, 200, 4)).toBe(4);
    expect(leaderShare(300, 200)).toBe(100);
    expect(leaderShare(null, 200)).toBe(0);
    expect(leaderShare(10, 0)).toBe(0);
  });
});
