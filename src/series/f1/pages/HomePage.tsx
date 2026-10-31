import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { DataState, ErrorBox, Loading, MetaLine } from '../../../components/DataState';
import { Flag, leaderShare, Moment, posClass } from '../../../components/ui';
import { useNow } from '../../../hooks/useNow';
import { countdownParts, formatPoints, sessionStart } from '../../../lib/format';
import { DriverCell, SprintBadge, StatusBadge, TeamCell } from '../components/bits';
import { findNextRace, raceStatus } from '../domain/status';
import type { RaceEvent } from '../domain/types';
import { useConstructorStandings, useDriverStandings, useRaceResults, useRaces } from '../hooks/data';
import { useFavorites } from '../hooks/useFavorites';
import { PageHeader, SeasonGuard } from './common';

export function HomePage() {
  return <SeasonGuard>{(season) => <Home season={season} />}</SeasonGuard>;
}

function Home({ season }: { season: number }) {
  const races = useRaces(season);
  const ds = useDriverStandings(season);
  const cs = useConstructorStandings(season);
  const now = useNow();

  const lastRound = ds.status === 'success' ? ds.data.round : null;
  const total = races.status === 'success' ? races.data.length : null;

  return (
    <section className="page">
      <PageHeader eyebrow="Formula 1" title={`Сезон ${season}`}>
        {total !== null && (
          <p className="lead">
            {lastRound !== null
              ? `Завершено этапов: ${lastRound} из ${total}`
              : `Этапов в календаре: ${total}`}
          </p>
        )}
        {total !== null && lastRound !== null && total > 0 && (
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={lastRound}
            aria-label="Прогресс сезона"
          >
            <div
              className="progress__bar"
              style={{ width: `${Math.min(100, (lastRound / total) * 100)}%` }}
            />
          </div>
        )}
      </PageHeader>

      <article className="hero">
        {races.status === 'loading' || ds.status === 'loading' ? (
          <Loading rows={3} />
        ) : races.status === 'error' ? (
          <ErrorBox error={races.error} onRetry={races.reload} />
        ) : (
          <NextRace races={races.data} lastRound={lastRound} now={now} />
        )}
      </article>

      <div className="grid-3">
        <article className="card">
          <h2 className="card__title">Последний завершённый этап</h2>
          {ds.status === 'loading' ? (
            <Loading rows={3} />
          ) : ds.status === 'error' ? (
            <ErrorBox error={ds.error} onRetry={ds.reload} />
          ) : lastRound === null ? (
            <p className="muted">В этом сезоне пока нет завершённых этапов.</p>
          ) : (
            <LastRace season={season} round={lastRound} />
          )}
        </article>

        <article className="card">
          <div className="card__head">
            <h2 className="card__title">Личный зачёт</h2>
            <Link to={`/${season}/drivers`} className="card__more">
              Вся таблица →
            </Link>
          </div>
          <DataState
            state={ds}
            isEmpty={(d) => d.rows.length === 0}
            emptyText="Личный зачёт пока не опубликован."
          >
            {(d) => (
              <ol className="leaders">
                {d.rows.slice(0, 5).map((r) => (
                  <li key={r.driver.id} style={barStyle(r.points, d.rows[0]?.points)}>
                    <span className={posClass('leaders__pos', r.position)}>
                      {r.positionText ?? r.position ?? '—'}
                    </span>
                    <DriverCell driver={r.driver} team={r.constructors.at(-1)} />
                    <span className="leaders__pts">{formatPoints(r.points)}</span>
                  </li>
                ))}
              </ol>
            )}
          </DataState>
        </article>

        <article className="card">
          <div className="card__head">
            <h2 className="card__title">Кубок конструкторов</h2>
            <Link to={`/${season}/constructors`} className="card__more">
              Вся таблица →
            </Link>
          </div>
          <DataState
            state={cs}
            isEmpty={(d) => d.rows.length === 0}
            emptyText="Командный зачёт для этого сезона не опубликован (Кубок конструкторов разыгрывается с 1958 года)."
          >
            {(d) => (
              <ol className="leaders">
                {d.rows.slice(0, 5).map((r) => (
                  <li key={r.constructor.id} style={barStyle(r.points, d.rows[0]?.points)}>
                    <span className={posClass('leaders__pos', r.position)}>
                      {r.positionText ?? r.position ?? '—'}
                    </span>
                    <TeamCell team={r.constructor} />
                    <span className="leaders__pts">{formatPoints(r.points)}</span>
                  </li>
                ))}
              </ol>
            )}
          </DataState>
        </article>
      </div>

      <FavoritesBlock season={season} ds={ds} cs={cs} />
    </section>
  );
}

function NextRace({ races, lastRound, now }: { races: RaceEvent[]; lastRound: number | null; now: Date }) {
  const next = findNextRace(races, now, lastRound);
  if (!next) {
    const awaiting = races.find((r) => raceStatus(r, now, lastRound) === 'awaiting');
    if (awaiting) {
      return (
        <div className="hero__main">
          <p className="hero__eyebrow">Этап {awaiting.round}</p>
          <Link to={`/${awaiting.seasonYear}/race/${awaiting.round}`} className="hero__name">
            {awaiting.name}
          </Link>
          <p className="muted">Этап прошёл, результаты ещё не опубликованы источником.</p>
        </div>
      );
    }
    return (
      <div className="hero__main">
        <p className="hero__eyebrow">Сезон завершён</p>
        <p className="hero__name">Предстоящих этапов в этом сезоне нет</p>
      </div>
    );
  }
  const status = raceStatus(next, now, lastRound);
  const start = sessionStart(next);
  const left = start && next.time ? countdownParts(start, now) : null;
  return (
    <div className="hero__inner">
      <div className="hero__main">
        <p className="hero__eyebrow">
          Следующий этап · {next.round} <StatusBadge status={status} />
          {next.hasSprint && <SprintBadge />}
        </p>
        <Link to={`/${next.seasonYear}/race/${next.round}`} className="hero__name">
          {next.name}
        </Link>
        <p className="hero__place">
          <Flag value={next.country} kind="country" />
          {[next.circuitName, next.locality, next.country].filter(Boolean).join(' · ') || 'Трасса не указана'}
        </p>
        <p className="hero__date">
          Гонка: <Moment date={next.date} time={next.time} />
        </p>
      </div>
      {left && (
        <div
          className="countdown"
          role="timer"
          aria-label={`До старта гонки: ${left.days} д ${left.hours} ч ${left.minutes} мин`}
        >
          <CountdownBox value={left.days} label="дней" />
          <CountdownBox value={left.hours} label="часов" />
          <CountdownBox value={left.minutes} label="минут" />
        </div>
      )}
    </div>
  );
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="countdown__box" aria-hidden="true">
      <span className="countdown__value">{String(value).padStart(2, '0')}</span>
      <span className="countdown__label">{label}</span>
    </div>
  );
}

/** Width of the faint bar behind a leader row, relative to the leader's points. */
function barStyle(points: number | null, leader: number | null | undefined) {
  return { '--bar': `${leaderShare(points, leader, 4)}%` } as CSSProperties;
}

function LastRace({ season, round }: { season: number; round: number }) {
  const res = useRaceResults(season, round);
  if (res.status === 'loading') return <Loading rows={3} />;
  if (res.status === 'error') return <ErrorBox error={res.error} onRetry={res.reload} />;
  const { race, results } = res.data;
  const podium = results
    .filter((r) => r.position !== null && r.position <= 3)
    .sort((a, b) => a.position! - b.position!);
  return (
    <div>
      <Link to={`/${season}/race/${round}`} className="next__name">
        {race?.name ?? `Этап ${round}`}
      </Link>
      {race && (
        <p className="muted">
          <Moment date={race.date} time={race.time} />
        </p>
      )}
      {podium.length === 0 ? (
        <p className="muted">Результаты недоступны.</p>
      ) : (
        <ol className="podium">
          {podium.map((r) => (
            <li key={r.driver.id} className={`podium__item podium__item--${r.position}`}>
              <span className="podium__pos">{r.position}</span>
              <DriverCell driver={r.driver} team={r.constructor} />
              <span className="podium__team muted">{r.constructor?.name ?? '—'}</span>
            </li>
          ))}
        </ol>
      )}
      <MetaLine meta={res.meta} onRefresh={res.reload} />
    </div>
  );
}

type DS = ReturnType<typeof useDriverStandings>;
type CS = ReturnType<typeof useConstructorStandings>;

/** Favourites with their current-season position and points, from already-loaded standings. */
function FavoritesBlock({ season, ds, cs }: { season: number; ds: DS; cs: CS }) {
  const { favs } = useFavorites();
  if (favs.drivers.length === 0 && favs.constructors.length === 0) {
    return (
      <p className="muted small fav-hint">
        Совет: отметьте пилотов и команды звёздочкой ☆ в их профилях — они появятся здесь и будут выделены в
        таблицах и на графике.
      </p>
    );
  }
  const dRows = ds.status === 'success' ? ds.data.rows : [];
  const cRows = cs.status === 'success' ? cs.data.rows : [];
  return (
    <article className="card">
      <h2 className="card__title">★ Избранное · сезон {season}</h2>
      <ul className="leaders">
        {favs.drivers.map((id) => {
          const row = dRows.find((r) => r.driver.id === id);
          return (
            <li key={`d:${id}`}>
              <span className="leaders__pos">{row ? (row.positionText ?? row.position ?? '—') : '—'}</span>
              {row ? (
                <DriverCell driver={row.driver} team={row.constructors.at(-1)} />
              ) : (
                <Link to={`/${season}/driver/${id}`}>{id}</Link>
              )}
              <span className="leaders__pts">
                {row ? formatPoints(row.points) : <span className="muted small">не в зачёте сезона</span>}
              </span>
            </li>
          );
        })}
        {favs.constructors.map((id) => {
          const row = cRows.find((r) => r.constructor.id === id);
          return (
            <li key={`c:${id}`}>
              <span className="leaders__pos">{row ? (row.positionText ?? row.position ?? '—') : '—'}</span>
              {row ? (
                <TeamCell team={row.constructor} />
              ) : (
                <Link to={`/${season}/constructor/${id}`}>{id}</Link>
              )}
              <span className="leaders__pts">
                {row ? formatPoints(row.points) : <span className="muted small">не в зачёте сезона</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
