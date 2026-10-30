import { useState } from 'react';
import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { Moment } from '../../../components/ui';
import { useNow } from '../../../hooks/useNow';
import { StatusBadge } from '../components/bits';
import { preloadCircuit } from '../data/circuits';
import { findNextRace, raceStatus, STATUS_LABELS, type RaceStatus } from '../domain/status';
import { useDriverStandings, useRaces } from '../hooks/data';
import { PageHeader, SeasonGuard } from './common';

type Filter = 'all' | RaceStatus;

export function CalendarPage() {
  return <SeasonGuard>{(season) => <Calendar season={season} />}</SeasonGuard>;
}

function Calendar({ season }: { season: number }) {
  const races = useRaces(season);
  const ds = useDriverStandings(season);
  const now = useNow();
  const [filter, setFilter] = useState<Filter>('all');

  // Completed rounds come from standings; if they failed, statuses fall back to dates.
  const lastRound = ds.status === 'success' ? ds.data.round : null;

  return (
    <section className="page">
      <PageHeader eyebrow={`Сезон ${season}`} title="Календарь" />
      <DataState
        state={races}
        isEmpty={(d) => d.length === 0}
        emptyText="Календарь этого сезона пока не опубликован источником."
        loadingRows={8}
      >
        {(list) => {
          const withStatus = list.map((race) => ({ race, status: raceStatus(race, now, lastRound) }));
          const nextRound = findNextRace(list, now, lastRound)?.round ?? null;
          const present = new Set(withStatus.map((x) => x.status));
          const filters: Filter[] = [
            'all',
            ...(['completed', 'live', 'awaiting', 'upcoming', 'unknown'] as RaceStatus[]).filter((s) =>
              present.has(s),
            ),
          ];
          const shown = filter === 'all' ? withStatus : withStatus.filter((x) => x.status === filter);
          return (
            <>
              <div className="chips" role="group" aria-label="Фильтр по статусу">
                {filters.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="chip"
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'Все' : STATUS_LABELS[f]}{' '}
                    <span className="chip__count">
                      {f === 'all' ? withStatus.length : withStatus.filter((x) => x.status === f).length}
                    </span>
                  </button>
                ))}
              </div>
              {ds.status === 'error' && (
                <p className="note">
                  Зачёт не загрузился, поэтому статусы этапов определены только по датам.
                </p>
              )}
              {shown.length === 0 ? (
                <p className="muted">Нет этапов с выбранным статусом.</p>
              ) : (
                <ol className="race-grid">
                  {shown.map(({ race, status }) => (
                    <li key={race.round}>
                      <Link
                        to={`/${season}/race/${race.round}`}
                        className={`race-card race-card--${status}${race.round === nextRound ? ' race-card--next' : ''}`}
                        data-round={race.round}
                        onMouseEnter={() => preloadCircuit(race.circuitId)}
                        onFocus={() => preloadCircuit(race.circuitId)}
                      >
                        {race.round === nextRound && <span className="race-card__next">Следующий</span>}
                        <span className="race-card__top">
                          <span className="race-card__round">Этап {race.round}</span>
                          <StatusBadge status={status} />
                        </span>
                        <span className="race-card__name">{race.name}</span>
                        <span className="race-card__place">
                          {[race.locality, race.country].filter(Boolean).join(', ') || 'Место не указано'}
                        </span>
                        <span className="race-card__circuit muted">{race.circuitName ?? ''}</span>
                        <span className="race-card__date">
                          <Moment date={race.date} time={race.time} />
                        </span>
                        {race.hasSprint && <span className="tag">Спринт</span>}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </>
          );
        }}
      </DataState>
    </section>
  );
}
