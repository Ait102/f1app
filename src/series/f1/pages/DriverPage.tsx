import { Link, useParams } from 'react-router-dom';

import { DataState, ErrorBox, Loading, MetaLine } from '../../../components/DataState';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { Stat, WithFlag } from '../../../components/ui';
import { useNow } from '../../../hooks/useNow';
import { formatDate, formatPoints } from '../../../lib/format';
import { FavButton, TeamCell } from '../components/bits';
import { SeasonHistory } from '../components/SeasonHistory';
import { polesIncomplete, QUALIFYING_DATA_FROM, seasonSpan, titleYears } from '../domain/career';
import { ageAt, driverName } from '../domain/mappers';
import type { RaceWithResults } from '../domain/types';
import {
  useDriver,
  useDriverCareer,
  useDriverHistory,
  useDriverSeasonResults,
  useDriverStandings,
} from '../hooks/data';
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
  const history = useDriverHistory(id, career.status === 'success' ? career.data.seasons : null);
  const now = useNow(60_000);

  if (profile.status === 'loading') return <Loading rows={5} />;
  if (profile.status === 'error') return <ErrorBox error={profile.error} onRetry={profile.reload} />;
  const d = profile.data;
  if (!d) return <NotFoundBlock title="Пилот не найден" season={season} />;

  const standing = ds.status === 'success' ? (ds.data.rows.find((r) => r.driver.id === id) ?? null) : null;
  const age = ageAt(d.dateOfBirth, now);
  const titles = history.status === 'success' ? titleYears(history.data.rows) : null;

  return (
    <section className="page">
      <nav className="crumbs" aria-label="Навигация">
        <Link to={`/${season}/drivers`}>← Личный зачёт {season}</Link>
      </nav>
      <PageHeader eyebrow={`Пилот${d.code ? ' · ' + d.code : ''}`} title={driverName(d)}>
        <p className="lead profile-facts">
          {d.number && (
            <span className="car-number car-number--big" title="Постоянный номер">
              {d.number}
            </span>
          )}
          {d.nationality && <WithFlag value={d.nationality} kind="nationality" />}
          {d.dateOfBirth && (
            <span>
              родился {formatDate(d.dateOfBirth)}
              {age !== null ? ` (${age})` : ''}
            </span>
          )}
        </p>
        <div className="profile-actions">
          <FavButton kind="drivers" id={d.id} name={driverName(d)} />
          <Link className="btn btn--ghost btn--small" to={`/${season}/compare?a=${d.id}`}>
            Сравнить с другим пилотом →
          </Link>
          {d.url && (
            <a href={d.url} target="_blank" rel="noreferrer">
              Статья о пилоте ↗
            </a>
          )}
        </div>
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
          <h2 className="card__title">
            Карьера
            {career.status === 'success' && seasonSpan(career.data.seasons)
              ? ` · ${seasonSpan(career.data.seasons)}`
              : ''}
          </h2>
          <DataState state={career}>
            {(c) => (
              <>
                <div className="stats stats--grid">
                  <Stat label="Гонки" value={c.starts} />
                  <Stat label="Победы" value={c.wins} />
                  <Stat label="Подиумы" value={c.podiums} />
                  <Stat label={polesIncomplete(c.seasons) ? 'Поулы*' : 'Поулы'} value={c.poles} />
                  <Stat label="Быстрые круги" value={c.fastestLaps} />
                  <Stat label="Титулы" value={titles ? titles.length : '…'} />
                  <Stat label="Сезоны" value={c.seasons.length} />
                </div>
                {titles && titles.length > 0 && (
                  <p className="small">
                    <span className="title-star">★</span> Чемпион мира: {titles.join(', ')}
                  </p>
                )}
                {c.teams.length > 0 && (
                  <p className="muted small team-list">
                    Команды:{' '}
                    {c.teams.map((t) => (
                      <TeamCell key={t.id} team={t} />
                    ))}
                  </p>
                )}
                {polesIncomplete(c.seasons) && (
                  <p className="muted small">
                    * Поулы считаются по результатам квалификаций, а они есть у источника только с{' '}
                    {QUALIFYING_DATA_FROM} года.
                  </p>
                )}
              </>
            )}
          </DataState>
        </article>
      </div>

      <h2 className="section-title">Итоги по сезонам</h2>
      {career.status === 'success' ? (
        <SeasonHistory state={history} kind="driver" link={(y) => `/${y}/driver/${id}`} />
      ) : career.status === 'error' ? null : (
        <Loading rows={3} />
      )}

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
