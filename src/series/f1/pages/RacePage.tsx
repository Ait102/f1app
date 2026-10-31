import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { DataState, ErrorBox, Loading, MetaLine } from '../../../components/DataState';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { Flag, Moment, posClass, SearchBox } from '../../../components/ui';
import { useNow } from '../../../hooks/useNow';
import { durationSeconds, formatPoints } from '../../../lib/format';
import { CircuitLink, DriverCell, SprintBadge, StatusBadge, TeamCell } from '../components/bits';
import { CircuitPanel } from '../components/CircuitMap';
import { matchesDriver } from '../domain/search';
import { raceStatus, type RaceStatus } from '../domain/status';
import type { PitStop, QualifyingResult, RaceEvent, RaceResult } from '../domain/types';
import {
  useDriverStandings,
  usePitStops,
  useQualifying,
  useRaceResults,
  useRaces,
  useSprint,
} from '../hooks/data';
import { useFavorites } from '../hooks/useFavorites';
import { PageHeader, SeasonGuard } from './common';

export function RacePage() {
  return <SeasonGuard>{(season) => <Race season={season} />}</SeasonGuard>;
}

function Race({ season }: { season: number }) {
  const { round: roundParam } = useParams();
  const round = roundParam && /^\d{1,2}$/.test(roundParam) ? Number(roundParam) : null;
  const races = useRaces(season);
  const ds = useDriverStandings(season);
  const now = useNow();

  if (races.status === 'loading') return <Loading rows={6} />;
  if (races.status === 'error') return <ErrorBox error={races.error} onRetry={races.reload} />;

  const idx = races.data.findIndex((r) => r.round === round);
  if (round === null || idx === -1) {
    return (
      <section className="page">
        <h1>Этап не найден</h1>
        <p>
          В календаре сезона {season} нет этапа {roundParam}.{' '}
          <Link to={`/${season}/calendar`}>К календарю</Link>
        </p>
      </section>
    );
  }
  const race = races.data[idx];
  const prev = races.data[idx - 1];
  const next = races.data[idx + 1];
  const lastRound = ds.status === 'success' ? ds.data.round : null;
  const status = raceStatus(race, now, lastRound);

  return (
    <section className="page">
      <nav className="crumbs" aria-label="Навигация по этапам">
        <Link to={`/${season}/calendar`}>← Календарь {season}</Link>
        <span className="crumbs__pager">
          {prev && <Link to={`/${season}/race/${prev.round}`}>‹ Этап {prev.round}</Link>}
          {next && <Link to={`/${season}/race/${next.round}`}>Этап {next.round} ›</Link>}
        </span>
      </nav>

      <PageHeader eyebrow={`Сезон ${season} · Этап ${race.round}`} title={race.name}>
        <p className="lead">
          <StatusBadge status={status} /> {race.hasSprint && <SprintBadge />}{' '}
          {race.circuitName ? (
            <CircuitLink season={season} id={race.circuitId} name={race.circuitName} />
          ) : (
            !race.locality && !race.country && 'Трасса не указана'
          )}
          <Flag value={race.country} kind="country" />
          {[race.locality, race.country].filter(Boolean).join(' · ')}
        </p>
        {race.url && (
          <p>
            <a href={race.url} target="_blank" rel="noreferrer">
              Статья об этапе ↗
            </a>
          </p>
        )}
      </PageHeader>

      <CircuitPanel circuitId={race.circuitId} name={race.circuitName} season={season} />

      <div className="race-layout">
        <aside className="card schedule">
          <h2 className="card__title">Расписание</h2>
          <ol className="schedule__list">
            {race.sessions.map((s) => (
              <li
                key={s.kind}
                className={
                  s.kind === 'Race'
                    ? 'schedule__race'
                    : s.kind === 'Sprint' || s.kind === 'SprintQualifying'
                      ? 'schedule__sprint'
                      : undefined
                }
              >
                <span>{s.label}</span>
                <Moment date={s.date} time={s.time} />
              </li>
            ))}
          </ol>
          {race.sessions.length === 1 ? (
            <p className="muted small">Источник не публикует время других сессий этого этапа.</p>
          ) : (
            <p className="muted small">
              Результаты свободных практик{race.hasSprint ? ' и спринт-квалификации' : ''} источник не
              публикует — только время сессий.
            </p>
          )}
          <MetaLine meta={races.meta} />
        </aside>

        <div className="card results">
          <Results race={race} status={status} />
        </div>
      </div>
    </section>
  );
}

type Tab = 'race' | 'qualifying' | 'sprint' | 'pits';

/** The source has pit-stop data from 2011 on. */
const PIT_STOPS_FROM = 2011;

function Results({ race, status }: { race: RaceEvent; status: RaceStatus }) {
  const [tab, setTab] = useState<Tab>('race');

  if (status === 'upcoming' || status === 'unknown') {
    return (
      <>
        <h2 className="card__title">Результаты</h2>
        <p className="muted">Этап ещё не состоялся — результаты появятся после гонки.</p>
      </>
    );
  }

  const tabs: Array<[Tab, string]> = [
    ['race', 'Гонка'],
    ['qualifying', 'Квалификация'],
    ...(race.hasSprint ? ([['sprint', 'Спринт']] as Array<[Tab, string]>) : []),
    ...(race.seasonYear >= PIT_STOPS_FROM ? ([['pits', 'Пит-стопы']] as Array<[Tab, string]>) : []),
  ];

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Результаты сессий">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            className="tab"
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'race' && <RaceResultsTab race={race} />}
        {tab === 'qualifying' && <QualifyingTab race={race} />}
        {tab === 'sprint' && <SprintTab race={race} />}
        {tab === 'pits' && <PitStopsTab race={race} />}
      </div>
    </>
  );
}

function resultColumns(): Column<RaceResult>[] {
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
      render: (r) => (r.number ? <span className="car-number">{r.number}</span> : '—'),
      sortValue: (r) => (r.number ? Number(r.number) : null),
    },
    {
      key: 'driver',
      header: 'Пилот',
      render: (r) => <DriverCell driver={r.driver} team={r.constructor} />,
      sortValue: (r) => r.driver.familyName,
    },
    {
      key: 'team',
      header: 'Команда',
      optional: true,
      render: (r) => <TeamCell team={r.constructor} />,
      sortValue: (r) => r.constructor?.name ?? null,
    },
    {
      key: 'grid',
      header: 'Старт',
      optional: true,
      align: 'right',
      render: (r) => (r.grid === 0 ? 'пит-лейн' : (r.grid ?? '—')),
      sortValue: (r) => r.grid,
    },
    {
      key: 'laps',
      header: 'Круги',
      optional: true,
      align: 'right',
      render: (r) => r.laps ?? '—',
      sortValue: (r) => r.laps,
    },
    { key: 'time', header: 'Время / статус', abbr: 'Время', render: (r) => r.time ?? r.status ?? '—' },
    {
      key: 'pts',
      header: 'Очки',
      align: 'right',
      render: (r) => <strong>{formatPoints(r.points)}</strong>,
      sortValue: (r) => r.points,
    },
  ];
}

const RESULT_COLUMNS = resultColumns();

function ResultsTable({ rows, caption }: { rows: RaceResult[]; caption: string }) {
  const [q, setQ] = useState('');
  const { isFav } = useFavorites();
  const filtered = rows.filter((r) => matchesDriver(r.driver, r.constructor ? [r.constructor] : [], q));
  return (
    <>
      <SearchBox value={q} onChange={setQ} label="Поиск пилота или команды" />
      {filtered.length === 0 ? (
        <p className="muted">Ничего не найдено.</p>
      ) : (
        <SortableTable
          columns={RESULT_COLUMNS}
          rows={filtered}
          rowKey={(r) => r.driver.id}
          caption={caption}
          rowClassName={(r) =>
            isFav('drivers', r.driver.id) || (r.constructor && isFav('constructors', r.constructor.id))
              ? 'row--fav'
              : undefined
          }
        />
      )}
    </>
  );
}

function RaceResultsTab({ race }: { race: RaceEvent }) {
  const res = useRaceResults(race.seasonYear, race.round);
  return (
    <DataState
      state={res}
      isEmpty={(d) => d.results.length === 0}
      emptyText="Результаты гонки пока недоступны у источника."
    >
      {(d) => <ResultsTable rows={d.results} caption={`Результаты гонки: ${race.name}`} />}
    </DataState>
  );
}

function SprintTab({ race }: { race: RaceEvent }) {
  const res = useSprint(race.seasonYear, race.round);
  return (
    <DataState
      state={res}
      isEmpty={(d) => d.length === 0}
      emptyText="Результаты спринта недоступны у источника."
    >
      {(rows) => <ResultsTable rows={rows} caption={`Результаты спринта: ${race.name}`} />}
    </DataState>
  );
}

const qualiColumns: Column<QualifyingResult>[] = [
  {
    key: 'pos',
    header: 'Позиция',
    abbr: 'Поз.',
    align: 'center',
    render: (r) => <span className={posClass('pos', r.position)}>{r.position ?? '—'}</span>,
    sortValue: (r) => r.position,
  },
  {
    key: 'driver',
    header: 'Пилот',
    render: (r) => <DriverCell driver={r.driver} team={r.constructor} />,
    sortValue: (r) => r.driver.familyName,
  },
  {
    key: 'team',
    header: 'Команда',
    optional: true,
    render: (r) => <TeamCell team={r.constructor} />,
    sortValue: (r) => r.constructor?.name ?? null,
  },
  { key: 'q1', header: 'Q1', align: 'right', render: (r) => r.q1 ?? '—' },
  { key: 'q2', header: 'Q2', align: 'right', render: (r) => r.q2 ?? '—' },
  { key: 'q3', header: 'Q3', align: 'right', render: (r) => r.q3 ?? '—' },
];

function QualifyingTab({ race }: { race: RaceEvent }) {
  const res = useQualifying(race.seasonYear, race.round);
  return (
    <DataState
      state={res}
      isEmpty={(d) => d.length === 0}
      emptyText="Результаты квалификации недоступны у источника."
    >
      {(rows) => (
        <SortableTable
          columns={qualiColumns}
          rows={rows}
          rowKey={(r) => r.driver.id}
          caption={`Квалификация: ${race.name}`}
        />
      )}
    </DataState>
  );
}

function PitStopsTab({ race }: { race: RaceEvent }) {
  const pits = usePitStops(race.seasonYear, race.round);
  // Names and teams come from the race result of the same weekend.
  const results = useRaceResults(race.seasonYear, race.round);
  const people = results.status === 'success' ? results.data.results : [];
  const who = (id: string) => people.find((r) => r.driver.id === id) ?? null;

  const columns: Column<PitStop>[] = [
    {
      key: 'driver',
      header: 'Пилот',
      render: (p) => {
        const r = who(p.driverId);
        return r ? <DriverCell driver={r.driver} team={r.constructor} /> : p.driverId;
      },
      sortValue: (p) => who(p.driverId)?.driver.familyName ?? p.driverId,
    },
    {
      key: 'stop',
      header: 'Остановка',
      align: 'center',
      render: (p) => p.stop ?? '—',
      sortValue: (p) => p.stop,
    },
    { key: 'lap', header: 'Круг', align: 'center', render: (p) => p.lap ?? '—', sortValue: (p) => p.lap },
    {
      key: 'dur',
      header: 'В пит-лейне, с',
      abbr: 'Время',
      align: 'right',
      render: (p) => <strong>{p.duration ?? '—'}</strong>,
      sortValue: (p) => durationSeconds(p.duration),
    },
  ];

  return (
    <DataState
      state={pits}
      isEmpty={(d) => d.length === 0}
      emptyText="Данных о пит-стопах этого этапа у источника нет."
    >
      {(rows) => {
        const fastest = rows.reduce<PitStop | null>((best, p) => {
          const s = durationSeconds(p.duration);
          const b = best ? durationSeconds(best.duration) : null;
          return s !== null && (b === null || s < b) ? p : best;
        }, null);
        const f = fastest ? who(fastest.driverId) : null;
        return (
          <>
            {fastest && (
              <p className="small">
                Самое короткое время в пит-лейне: <strong>{fastest.duration} с</strong>
                {f ? ` — ${f.driver.familyName}` : ''}
                {fastest.lap !== null ? `, круг ${fastest.lap}` : ''}.
              </p>
            )}
            <p className="muted small">
              Время — от въезда до выезда из пит-лейна, как у источника, а не длительность самой остановки.
            </p>
            <SortableTable
              columns={columns}
              rows={rows}
              rowKey={(p) => `${p.driverId}-${p.stop}`}
              caption={`Пит-стопы: ${race.name}`}
            />
          </>
        );
      }}
    </DataState>
  );
}
