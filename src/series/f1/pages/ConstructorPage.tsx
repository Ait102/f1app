import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getArticlePhoto, getCommonsPhoto, wikiTitle } from '../../../api/wikimedia';
import { DataState, ErrorBox, Loading } from '../../../components/DataState';
import { PhotoFigure, usePhoto } from '../../../components/PhotoFigure';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { Flag, Stat, WithFlag } from '../../../components/ui';
import { formatPoints } from '../../../lib/format';
import { DriverCell, FavButton, teamColor } from '../components/bits';
import { SeasonHistory } from '../components/SeasonHistory';
import { TeamLogo } from '../components/TeamLogo';
import { CAR_PHOTOS, CAR_PHOTOS_SEASON } from '../data/carPhotos';
import {
  bestFinish,
  CONSTRUCTORS_CUP_FROM,
  polesIncomplete,
  QUALIFYING_DATA_FROM,
  seasonSpan,
  titleYears,
} from '../domain/career';
import type { Constructor, Driver, RaceWin, RaceWithResults, TeamCareer } from '../domain/types';
import {
  useConstructor,
  useConstructorCareer,
  useConstructorDrivers,
  useConstructorHistory,
  useConstructorSeason,
  useConstructorStandings,
} from '../hooks/data';
import { ID_RE, NotFoundBlock, PageHeader, SeasonGuard } from './common';

export function ConstructorPage() {
  return <SeasonGuard>{(season) => <ConstructorProfileView season={season} />}</SeasonGuard>;
}

function ConstructorProfileView({ season }: { season: number }) {
  const { constructorId = '' } = useParams();
  if (!ID_RE.test(constructorId)) return <NotFoundBlock title="Команда не найдена" season={season} />;
  return <ConstructorBody season={season} id={constructorId} />;
}

function ConstructorBody({ season, id }: { season: number; id: string }) {
  const profile = useConstructor(id);
  const cs = useConstructorStandings(season);
  const career = useConstructorCareer(id);

  if (profile.status === 'loading') return <Loading rows={5} />;
  if (profile.status === 'error') return <ErrorBox error={profile.error} onRetry={profile.reload} />;
  const team = profile.data;
  if (!team) return <NotFoundBlock title="Команда не найдена" season={season} />;

  const standing =
    cs.status === 'success' ? (cs.data.rows.find((r) => r.constructor.id === id) ?? null) : null;

  return (
    <section className="page">
      <nav className="crumbs" aria-label="Навигация">
        <Link to={`/${season}/constructors`}>← Кубок конструкторов {season}</Link>
      </nav>
      <PageHeader eyebrow="Команда" title={team.name} aside={<CarPhotoFigure team={team} />}>
        <div className="team-stripe" style={{ background: teamColor(team) }} aria-hidden="true" />
        <TeamLogo team={team} size="lg" />
        {team.nationality && (
          <p className="lead">
            <WithFlag value={team.nationality} kind="nationality" />
          </p>
        )}
        <FavButton kind="constructors" id={team.id} name={team.name} />
        {team.url && (
          <p>
            <a href={team.url} target="_blank" rel="noreferrer">
              Статья о команде ↗
            </a>
          </p>
        )}
      </PageHeader>

      <div className="grid-2">
        <article className="card">
          <h2 className="card__title">Сезон {season}</h2>
          {cs.status === 'loading' ? (
            <Loading rows={2} />
          ) : cs.status === 'error' ? (
            <ErrorBox error={cs.error} onRetry={cs.reload} />
          ) : standing ? (
            <div className="stats">
              <Stat label="Позиция" value={standing.positionText ?? standing.position} />
              <Stat label="Очки" value={formatPoints(standing.points)} />
              <Stat label="Победы" value={standing.wins} />
            </div>
          ) : (
            <p className="muted">Команда не числится в Кубке конструкторов сезона {season}.</p>
          )}
        </article>
        <article className="card">
          <h2 className="card__title">
            История
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
                  <Stat label="Подиумы (машины)" value={c.podiums} />
                  <Stat label="Дубли 1–2" value={c.oneTwos} />
                  <Stat label={polesIncomplete(c.seasons) ? 'Поулы*' : 'Поулы'} value={c.poles} />
                  <Stat label="Быстрые круги" value={c.fastestLaps} />
                  <Stat label="Сезоны" value={c.seasons.length} />
                  <Stat label="Пилотов" value={c.drivers} />
                </div>
                {(c.firstWin || c.lastWin) && (
                  <dl className="win-span">
                    {c.firstWin && <WinRow label="Первая победа" win={c.firstWin} />}
                    {c.lastWin && c.lastWin !== c.firstWin && (
                      <WinRow label="Последняя победа" win={c.lastWin} />
                    )}
                  </dl>
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

      {career.status === 'success' && <TeamHistory id={id} career={career.data} />}
      {career.status === 'success' && <TeamDrivers id={id} season={season} total={career.data.drivers} />}

      <SeasonBlock season={season} id={id} />
    </section>
  );
}

/** The 2026 car for current teams; otherwise the team article's photo, if any. */
function CarPhotoFigure({ team }: { team: Constructor }) {
  const known = CAR_PHOTOS[team.id];
  const title = wikiTitle(team.url);
  const key = known ? `car:${known.file}` : title ? `team:${title}` : null;
  const state = usePhoto(key, () =>
    known ? getCommonsPhoto(known.file, 900) : getArticlePhoto(title!, { width: 900, photosOnly: true }),
  );
  return (
    <PhotoFigure
      state={state}
      alt={known ? `${known.car}, болид ${team.name}` : team.name}
      caption={known ? `${known.car} · сезон ${CAR_PHOTOS_SEASON}` : undefined}
      shape="wide"
    />
  );
}

function WinRow({ label, win }: { label: string; win: RaceWin }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <Link to={`/${win.season}/race/${win.round}`}>
          {win.name} {win.season}
        </Link>
        {win.driver && (
          <>
            {' · '}
            <Link to={`/${win.season}/driver/${win.driver.id}`}>
              {win.driver.givenName} {win.driver.familyName}
            </Link>
          </>
        )}
      </dd>
    </div>
  );
}

/** Everyone who drove for the team. Loaded on request (one or two requests). */
function TeamDrivers({ id, season, total }: { id: string; season: number; total: number | null }) {
  const [open, setOpen] = useState(false);
  const drivers = useConstructorDrivers(id, open);
  if (total === 0) return null;
  return (
    <>
      <h2 className="section-title">Пилоты за всю историю</h2>
      {!open ? (
        <p>
          <button type="button" className="btn btn--ghost" onClick={() => setOpen(true)}>
            Показать всех пилотов{total !== null ? ` (${total})` : ''}
          </button>
        </p>
      ) : (
        <DataState state={drivers} isEmpty={(d) => d.length === 0} emptyText="Источник не указывает пилотов.">
          {(list) => (
            <ul className="name-list">
              {list.map((p) => (
                <li key={p.id}>
                  <Link to={`/${season}/driver/${p.id}`}>
                    {p.givenName} <strong>{p.familyName}</strong>
                  </Link>
                  {p.nationality && <Flag value={p.nationality} kind="nationality" />}
                </li>
              ))}
            </ul>
          )}
        </DataState>
      )}
    </>
  );
}

function SeasonBlock({ season, id }: { season: number; id: string }) {
  const res = useConstructorSeason(season, id);
  return (
    <DataState
      state={res}
      isEmpty={(d) => d.drivers.length === 0 && d.races.length === 0}
      emptyText={`Команда не участвовала в сезоне ${season} по данным источника.`}
    >
      {(d) => {
        // One column per driver who actually has race results this season.
        const racers: Driver[] = [];
        for (const r of d.races)
          for (const x of r.results) if (!racers.some((p) => p.id === x.driver.id)) racers.push(x.driver);
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
          ...racers.map<Column<RaceWithResults>>((p) => ({
            key: p.id,
            header: p.code ?? p.familyName,
            align: 'center',
            render: (r) => {
              const x = r.results.find((y) => y.driver.id === p.id);
              if (!x) return <span className="muted">—</span>;
              return (
                <span title={x.status ?? undefined}>
                  <strong>{x.positionText ?? '—'}</strong>
                  {x.points ? <span className="muted"> · {formatPoints(x.points)}</span> : null}
                </span>
              );
            },
          })),
        ];
        return (
          <>
            <h2 className="section-title">Пилоты сезона {season}</h2>
            {d.drivers.length === 0 ? (
              <p className="muted">Источник не указывает пилотов.</p>
            ) : (
              <ul className="chip-list">
                {d.drivers.map((p) => (
                  <li key={p.id} className="chip-card">
                    <DriverCell driver={p} season={season} />
                    {!racers.some((x) => x.id === p.id) && <span className="muted small"> · без гонок</span>}
                  </li>
                ))}
              </ul>
            )}
            <h2 className="section-title">Этапы сезона {season}</h2>
            <p className="muted small">В ячейке — финиш пилота и набранные очки, как у источника.</p>
            {d.races.length === 0 ? (
              <p className="muted">Результатов пока нет.</p>
            ) : (
              <SortableTable
                columns={columns}
                rows={d.races}
                rowKey={(r) => String(r.race.round)}
                caption={`Результаты команды по этапам ${season}`}
              />
            )}
          </>
        );
      }}
    </DataState>
  );
}

/**
 * Constructors' championship by season. Loaded on request: an old team can have
 * 70+ seasons, i.e. 70+ requests to the source.
 */
function TeamHistory({ id, career }: { id: string; career: TeamCareer }) {
  const seasons = career.seasons.filter((y) => y >= CONSTRUCTORS_CUP_FROM);
  const [open, setOpen] = useState(false);
  const history = useConstructorHistory(id, open ? seasons : null);
  const titles = history.status === 'success' ? titleYears(history.data.rows) : null;
  const best = history.status === 'success' ? bestFinish(history.data.rows) : null;

  if (seasons.length === 0) return null;
  return (
    <>
      <h2 className="section-title">Кубок конструкторов по сезонам</h2>
      {!open ? (
        <p>
          <button type="button" className="btn btn--ghost" onClick={() => setOpen(true)}>
            Показать историю ({seasons.length} {seasons.length === 1 ? 'сезон' : 'сезонов'})
          </button>
        </p>
      ) : (
        <>
          {titles && titles.length > 0 && (
            <p className="small">
              <span className="title-star">★</span> Кубок конструкторов: {titles.join(', ')}
            </p>
          )}
          {titles && titles.length === 0 && best && (
            <p className="small">
              Лучшее место в Кубке: {best.position} ({best.seasons.join(', ')})
            </p>
          )}
          <SeasonHistory state={history} kind="team" link={(y) => `/${y}/constructor/${id}`} />
        </>
      )}
    </>
  );
}
