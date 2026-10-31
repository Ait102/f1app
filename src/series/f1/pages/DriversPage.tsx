import { useState } from 'react';
import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { PointsWithBar, posClass, SearchBox, WithFlag } from '../../../components/ui';
import { DriverCell } from '../components/bits';
import { matchesDriver } from '../domain/search';
import type { DriverStanding } from '../domain/types';
import { useDriverStandings } from '../hooks/data';
import { useFavorites } from '../hooks/useFavorites';
import { PageHeader, SeasonGuard } from './common';

function makeColumns(leader: number | null | undefined): Column<DriverStanding>[] {
  return [
    {
      key: 'pos',
      header: 'Позиция',
      abbr: 'Поз.',
      align: 'center',
      render: (r) => (
        <span className={posClass('pos', r.position)}>{r.positionText ?? r.position ?? '—'}</span>
      ),
      sortValue: (r) => r.position,
    },
    {
      key: 'num',
      header: 'Номер',
      abbr: '№',
      align: 'center',
      optional: true,
      render: (r) => (r.driver.number ? <span className="car-number">{r.driver.number}</span> : '—'),
      sortValue: (r) => (r.driver.number ? Number(r.driver.number) : null),
    },
    {
      key: 'driver',
      header: 'Пилот',
      render: (r) => <DriverCell driver={r.driver} team={r.constructors.at(-1)} />,
      sortValue: (r) => r.driver.familyName,
    },
    {
      key: 'nat',
      header: 'Страна',
      optional: true,
      render: (r) => <WithFlag value={r.driver.nationality} kind="nationality" />,
      sortValue: (r) => r.driver.nationality,
    },
    {
      key: 'team',
      header: 'Команда',
      optional: true,
      render: (r) => (r.constructors.length ? r.constructors.map((c) => c.name).join(' / ') : '—'),
      sortValue: (r) => r.constructors.at(-1)?.name ?? null,
    },
    {
      key: 'wins',
      header: 'Победы',
      abbr: 'Поб.',
      align: 'right',
      render: (r) => r.wins ?? '—',
      sortValue: (r) => r.wins,
    },
    {
      key: 'pts',
      header: 'Очки',
      align: 'right',
      render: (r) => <PointsWithBar points={r.points} leader={leader} />,
      sortValue: (r) => r.points,
    },
  ];
}

export function DriversPage() {
  return <SeasonGuard>{(season) => <Drivers season={season} />}</SeasonGuard>;
}

function Drivers({ season }: { season: number }) {
  const ds = useDriverStandings(season);
  const [q, setQ] = useState('');
  const { isFav } = useFavorites();
  return (
    <section className="page">
      <PageHeader eyebrow={`Сезон ${season}`} title="Личный зачёт">
        {ds.status === 'success' && ds.data.round !== null && (
          <p className="lead">
            После этапа {ds.data.round}. Очки и позиции — как у источника, без пересчёта.
          </p>
        )}
        <p>
          <Link className="btn btn--ghost btn--small" to={`/${season}/compare`}>
            Сравнить пилотов →
          </Link>
        </p>
      </PageHeader>
      <DataState
        state={ds}
        isEmpty={(d) => d.rows.length === 0}
        emptyText="Личный зачёт этого сезона пока не опубликован."
        loadingRows={10}
      >
        {(d) => {
          const rows = d.rows.filter((r) => matchesDriver(r.driver, r.constructors, q));
          return (
            <>
              <SearchBox value={q} onChange={setQ} label="Поиск пилота или команды" />
              {rows.length === 0 ? (
                <p className="muted">Ничего не найдено.</p>
              ) : (
                <SortableTable
                  columns={makeColumns(d.rows[0]?.points)}
                  rows={rows}
                  rowKey={(r) => r.driver.id}
                  caption={`Личный зачёт ${season}`}
                  rowClassName={(r) => (isFav('drivers', r.driver.id) ? 'row--fav' : undefined)}
                />
              )}
            </>
          );
        }}
      </DataState>
    </section>
  );
}
