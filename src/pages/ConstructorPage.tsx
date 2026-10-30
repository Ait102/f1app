import { Link, useParams } from 'react-router-dom';

import { DriverCell, FavButton, Stat, teamColor } from '../components/bits';
import { DataState, ErrorBox, Loading } from '../components/DataState';
import { SortableTable, type Column } from '../components/SortableTable';
import { formatPoints } from '../domain/format';
import type { Driver, RaceWithResults } from '../domain/types';
import {
  useConstructor,
  useConstructorSeason,
  useConstructorStandings,
  useConstructorWins,
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
  const wins = useConstructorWins(id);

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
      <PageHeader eyebrow="Команда" title={team.name}>
        <div className="team-stripe" style={{ background: teamColor(team) }} aria-hidden="true" />
        {team.nationality && <p className="lead">{team.nationality}</p>}
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
          <h2 className="card__title">Карьера</h2>
          <DataState state={wins}>
            {(w) => (
              <div className="stats">
                <Stat label="Победы в гонках" value={w} />
              </div>
            )}
          </DataState>
        </article>
      </div>

      <SeasonBlock season={season} id={id} />
    </section>
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
