import { Link, useParams } from 'react-router-dom';
import { DataState, ErrorBox, Loading, MetaLine } from '../components/DataState';
import { DriverCell, Moment, Stat, TeamCell } from '../components/bits';
import { SortableTable, type Column } from '../components/SortableTable';
import type { RaceWithResults } from '../domain/types';
import { useCircuit, useCircuitWinners, useRaces } from '../hooks/data';
import { ID_RE, NotFoundBlock, PageHeader, SeasonGuard } from './common';

export function CircuitPage() {
  return <SeasonGuard>{(season) => <CircuitProfileView season={season} />}</SeasonGuard>;
}

function CircuitProfileView({ season }: { season: number }) {
  const { circuitId = '' } = useParams();
  if (!ID_RE.test(circuitId)) return <NotFoundBlock title="Трасса не найдена" season={season} />;
  return <CircuitBody season={season} id={circuitId} />;
}

const winnerColumns: Column<RaceWithResults>[] = [
  { key: 'season', header: 'Сезон', align: 'center', render: (r) => r.race.seasonYear, sortValue: (r) => r.race.seasonYear },
  {
    key: 'race',
    header: 'Гран-при',
    optional: true,
    render: (r) => <Link to={`/${r.race.seasonYear}/race/${r.race.round}`}>{r.race.name}</Link>,
  },
  {
    key: 'driver',
    header: 'Победитель',
    render: (r) => (r.results[0] ? <DriverCell driver={r.results[0].driver} team={r.results[0].constructor} season={r.race.seasonYear} /> : '—'),
    sortValue: (r) => r.results[0]?.driver.familyName ?? null,
  },
  {
    key: 'team',
    header: 'Команда',
    render: (r) => <TeamCell team={r.results[0]?.constructor ?? null} season={r.race.seasonYear} />,
    sortValue: (r) => r.results[0]?.constructor?.name ?? null,
  },
];

function CircuitBody({ season, id }: { season: number; id: string }) {
  const circuit = useCircuit(id);
  const races = useRaces(season);
  const winners = useCircuitWinners(id);

  if (circuit.status === 'loading') return <Loading rows={5} />;
  if (circuit.status === 'error') return <ErrorBox error={circuit.error} onRetry={circuit.reload} />;
  const c = circuit.data;
  if (!c) return <NotFoundBlock title="Трасса не найдена" season={season} />;

  const thisSeason = races.status === 'success' ? races.data.find((r) => r.circuitId === id) ?? null : null;
  const mapUrl =
    c.lat !== null && c.long !== null
      ? `https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.long}#map=14/${c.lat}/${c.long}`
      : null;

  return (
    <section className="page">
      <nav className="crumbs" aria-label="Навигация">
        <Link to={`/${season}/calendar`}>← Календарь {season}</Link>
      </nav>
      <PageHeader eyebrow="Трасса" title={c.name}>
        <p className="lead">{[c.locality, c.country].filter(Boolean).join(', ') || 'Место не указано'}</p>
        <p className="links-row">
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noreferrer">
              На карте ↗
            </a>
          )}
          {c.url && (
            <a href={c.url} target="_blank" rel="noreferrer">
              Статья о трассе ↗
            </a>
          )}
        </p>
      </PageHeader>

      <div className="grid-2">
        <article className="card">
          <h2 className="card__title">Сезон {season}</h2>
          {races.status === 'loading' ? (
            <Loading rows={2} />
          ) : races.status === 'error' ? (
            <ErrorBox error={races.error} onRetry={races.reload} />
          ) : thisSeason ? (
            <div className="next">
              <p className="next__round">Этап {thisSeason.round}</p>
              <Link to={`/${season}/race/${thisSeason.round}`} className="next__name">
                {thisSeason.name}
              </Link>
              <p className="muted">
                <Moment date={thisSeason.date} time={thisSeason.time} />
              </p>
            </div>
          ) : (
            <p className="muted">В календаре сезона {season} этой трассы нет.</p>
          )}
        </article>
        <article className="card">
          <h2 className="card__title">История</h2>
          <DataState state={winners} hideMeta>
            {(w) => (
              <div className="stats">
                <Stat label="Гран-при проведено" value={w.length} />
                <Stat label="Первая гонка" value={w[0]?.race.seasonYear} />
                <Stat label="Последняя гонка" value={w.at(-1)?.race.seasonYear} />
              </div>
            )}
          </DataState>
        </article>
      </div>

      <h2 className="section-title">Победители</h2>
      <DataState state={winners} isEmpty={(w) => w.length === 0} emptyText="Источник не содержит гонок на этой трассе.">
        {(w) => <SortableTable columns={winnerColumns} rows={w} rowKey={(r) => `${r.race.seasonYear}-${r.race.round}`} caption={`Победители на трассе ${c.name}`} />}
      </DataState>
      <MetaLine meta={circuit.meta} />
    </section>
  );
}
