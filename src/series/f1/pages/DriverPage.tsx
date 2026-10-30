import { Link, useParams } from 'react-router-dom';

import { DataState, ErrorBox, Loading, MetaLine } from '../../../components/DataState';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { Stat } from '../../../components/ui';
import { useNow } from '../../../hooks/useNow';
import { formatDate, formatPoints } from '../../../lib/format';
import { FavButton, TeamCell } from '../components/bits';
import { ageAt, driverName } from '../domain/mappers';
import type { RaceWithResults } from '../domain/types';
import { useDriver, useDriverCareer, useDriverSeasonResults, useDriverStandings } from '../hooks/data';
import { ID_RE, NotFoundBlock, PageHeader, SeasonGuard } from './common';

export function DriverPage() {
  return <SeasonGuard>{(season) => <DriverProfileView season={season} />}</SeasonGuard>;
}

function DriverProfileView({ season }: { season: number }) {
  const { driverId = '' } = useParams();
  if (!ID_RE.test(driverId)) return <NotFoundBlock title="Пилот не найден" season={season} />;
  return <DriverBody season={season} id={driverId} />;
}

function DriverBody({ season, id }: { season: number; id: string }) {
  const profile = useDriver(id);
  const ds = useDriverStandings(season);
  const career = useDriverCareer(id);
  const now = useNow(60_000);

  if (profile.status === 'loading') return <Loading rows={5} />;
  if (profile.status === 'error') return <ErrorBox error={profile.error} onRetry={profile.reload} />;
  const d = profile.data;
  if (!d) return <NotFoundBlock title="Пилот не найден" season={season} />;

  const standing = ds.status === 'success' ? (ds.data.rows.find((r) => r.driver.id === id) ?? null) : null;
  const age = ageAt(d.dateOfBirth, now);
  const facts = [
    d.number && `№ ${d.number}`,
    d.nationality,
    d.dateOfBirth && `родился ${formatDate(d.dateOfBirth)}${age !== null ? ` (${age})` : ''}`,
  ].filter(Boolean);

  return (
    <section className="page">
      <nav className="crumbs" aria-label="Навигация">
        <Link to={`/${season}/drivers`}>← Личный зачёт {season}</Link>
      </nav>
      <PageHeader eyebrow={`Пилот${d.code ? ' · ' + d.code : ''}`} title={driverName(d)}>
        {facts.length > 0 && <p className="lead">{facts.join(' · ')}</p>}
        <FavButton kind="drivers" id={d.id} name={driverName(d)} />
        {d.url && (
          <p>
            <a href={d.url} target="_blank" rel="noreferrer">
              Статья о пилоте ↗
            </a>
          </p>
        )}
      </PageHeader>

      <div className="grid-2">
        <article className="card">
          <h2 className="card__title">Сезон {season}</h2>
          {ds.status === 'loading' ? (
            <Loading rows={2} />
          ) : ds.status === 'error' ? (
            <ErrorBox error={ds.error} onRetry={ds.reload} />
          ) : standing ? (
            <>
              <div className="stats">
                <Stat label="Позиция" value={standing.positionText ?? standing.position} />
                <Stat label="Очки" value={formatPoints(standing.points)} />
                <Stat label="Победы" value={standing.wins} />
              </div>
              {standing.constructors.length > 0 && (
                <p className="muted small">
                  Команда:{' '}
                  {standing.constructors.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ' / '}
                      <TeamCell team={c} season={season} />
                    </span>
                  ))}
                </p>
              )}
            </>
          ) : (
            <p className="muted">Пилот не числится в личном зачёте сезона {season}.</p>
          )}
        </article>

        <article className="card">
          <h2 className="card__title">Карьера</h2>
          <DataState state={career}>
            {(c) => (
              <div className="stats">
                <Stat label="Победы" value={c.wins} />
                <Stat label="Гонки (с учётом сходов)" value={c.starts} />
              </div>
            )}
          </DataState>
        </article>
      </div>

      <h2 className="section-title">Этапы сезона {season}</h2>
      <SeasonResults season={season} id={id} />
      <MetaLine meta={profile.meta} />
    </section>
  );
}

function SeasonResults({ season, id }: { season: number; id: string }) {
  const res = useDriverSeasonResults(season, id);
  const columns: Column<RaceWithResults>[] = [
    {
      key: 'round',
      header: 'Этап',
      align: 'center',
      render: (r) => r.race.round,
      sortValue: (r) => r.race.round,
    },
    {
      key: 'race',
      header: 'Гран-при',
      render: (r) => <Link to={`/${season}/race/${r.race.round}`}>{r.race.name}</Link>,
    },
    {
      key: 'team',
      header: 'Команда',
      optional: true,
      render: (r) => <TeamCell team={r.results[0]?.constructor ?? null} season={season} />,
    },
    {
      key: 'grid',
      header: 'Старт',
      optional: true,
      align: 'right',
      render: (r) => (r.results[0]?.grid === 0 ? 'пит-лейн' : (r.results[0]?.grid ?? '—')),
      sortValue: (r) => r.results[0]?.grid ?? null,
    },
    {
      key: 'pos',
      header: 'Финиш',
      align: 'center',
      render: (r) => <span className="pos">{r.results[0]?.positionText ?? '—'}</span>,
      sortValue: (r) => r.results[0]?.position ?? null,
    },
    { key: 'status', header: 'Статус', optional: true, render: (r) => r.results[0]?.status ?? '—' },
    {
      key: 'pts',
      header: 'Очки',
      align: 'right',
      render: (r) => <strong>{formatPoints(r.results[0]?.points ?? null)}</strong>,
      sortValue: (r) => r.results[0]?.points ?? null,
    },
  ];
  return (
    <DataState
      state={res}
      isEmpty={(d) => d.length === 0}
      emptyText={`У источника нет результатов этого пилота в сезоне ${season}.`}
    >
      {(rows) => (
        <SortableTable
          columns={columns}
          rows={rows}
          rowKey={(r) => String(r.race.round)}
          caption={`Результаты по этапам ${season}`}
        />
      )}
    </DataState>
  );
}
