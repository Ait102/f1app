import { useState } from 'react';
import { DataState } from '../components/DataState';
import { DriverCell, SearchBox, matchesDriver } from '../components/bits';
import { SortableTable, type Column } from '../components/SortableTable';
import { formatPoints } from '../domain/format';
import type { DriverStanding } from '../domain/types';
import { useDriverStandings } from '../hooks/data';
import { PageHeader, SeasonGuard } from './common';

const columns: Column<DriverStanding>[] = [
  { key: 'pos', header: 'Позиция', abbr: 'Поз.', align: 'center', render: (r) => <span className="pos">{r.positionText ?? r.position ?? '—'}</span>, sortValue: (r) => r.position },
  { key: 'driver', header: 'Пилот', render: (r) => <DriverCell driver={r.driver} team={r.constructors.at(-1)} />, sortValue: (r) => r.driver.familyName },
  { key: 'nat', header: 'Страна', optional: true, render: (r) => r.driver.nationality ?? '—', sortValue: (r) => r.driver.nationality },
  {
    key: 'team',
    header: 'Команда',
    optional: true,
    render: (r) => (r.constructors.length ? r.constructors.map((c) => c.name).join(' / ') : '—'),
    sortValue: (r) => r.constructors.at(-1)?.name ?? null,
  },
  { key: 'wins', header: 'Победы', abbr: 'Поб.', align: 'right', render: (r) => r.wins ?? '—', sortValue: (r) => r.wins },
  { key: 'pts', header: 'Очки', align: 'right', render: (r) => <strong>{formatPoints(r.points)}</strong>, sortValue: (r) => r.points },
];

export function DriversPage() {
  return <SeasonGuard>{(season) => <Drivers season={season} />}</SeasonGuard>;
}

function Drivers({ season }: { season: number }) {
  const ds = useDriverStandings(season);
  const [q, setQ] = useState('');
  return (
    <section className="page">
      <PageHeader eyebrow={`Сезон ${season}`} title="Личный зачёт">
        {ds.status === 'success' && ds.data.round !== null && (
          <p className="lead">После этапа {ds.data.round}. Очки и позиции — как у источника, без пересчёта.</p>
        )}
      </PageHeader>
      <DataState state={ds} isEmpty={(d) => d.rows.length === 0} emptyText="Личный зачёт этого сезона пока не опубликован." loadingRows={10}>
        {(d) => {
          const rows = d.rows.filter((r) => matchesDriver(r.driver, r.constructors, q));
          return (
            <>
              <SearchBox value={q} onChange={setQ} label="Поиск пилота или команды" />
              {rows.length === 0 ? (
                <p className="muted">Ничего не найдено.</p>
              ) : (
                <SortableTable columns={columns} rows={rows} rowKey={(r) => r.driver.id} caption={`Личный зачёт ${season}`} />
              )}
            </>
          );
        }}
      </DataState>
    </section>
  );
}
