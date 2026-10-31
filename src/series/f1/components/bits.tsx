import { Link } from 'react-router-dom';

import { preloadCircuit } from '../data/circuits';
import { STATUS_LABELS, type RaceStatus } from '../domain/status';
import type { Constructor, Driver } from '../domain/types';
import { useSeasonParam } from '../hooks/data';
import { useFavorites, type FavKind } from '../hooks/useFavorites';

// Decorative team accents only (not data). Unknown teams get a neutral color.
const TEAM_COLORS: Record<string, string> = {
  mercedes: '#27f4d2',
  ferrari: '#e8002d',
  red_bull: '#3671c6',
  mclaren: '#ff8000',
  aston_martin: '#229971',
  alpine: '#0093cc',
  williams: '#64c4ff',
  rb: '#6692ff',
  sauber: '#52e252',
  audi: '#bb0a30',
  haas: '#b6babd',
  cadillac: '#c9a227',
};

export function teamColor(c: Constructor | null | undefined): string {
  return (c && TEAM_COLORS[c.id]) || '#5b6070';
}

export function DriverCell({
  driver,
  team,
  season,
}: {
  driver: Driver;
  team?: Constructor | null;
  /** Profile season; defaults to the season in the URL. */
  season?: number;
}) {
  const routeSeason = useSeasonParam();
  const linkSeason = season ?? routeSeason;
  const name = (
    <span className="driver__name">
      <span className="driver__given">{driver.givenName} </span>
      <strong>{driver.familyName}</strong>
    </span>
  );
  return (
    <span className="driver">
      <span className="team-bar" style={{ background: teamColor(team) }} aria-hidden="true" />
      {linkSeason ? (
        <Link className="profile-link" to={`/${linkSeason}/driver/${driver.id}`}>
          {name}
        </Link>
      ) : (
        name
      )}
      {driver.code && <span className="driver__code">{driver.code}</span>}
    </span>
  );
}

export function TeamCell({ team, season }: { team: Constructor | null; season?: number }) {
  const routeSeason = useSeasonParam();
  const linkSeason = season ?? routeSeason;
  if (!team) return <span className="muted">—</span>;
  return (
    <span className="team">
      <span className="team-dot" style={{ background: teamColor(team) }} aria-hidden="true" />
      {linkSeason ? (
        <Link className="profile-link" to={`/${linkSeason}/constructor/${team.id}`}>
          {team.name}
        </Link>
      ) : (
        team.name
      )}
    </span>
  );
}

export function CircuitLink({
  season,
  id,
  name,
}: {
  season: number;
  id: string | null;
  name: string | null;
}) {
  if (!name) return null;
  return id ? (
    <Link
      to={`/${season}/circuit/${id}`}
      onMouseEnter={() => preloadCircuit(id)}
      onFocus={() => preloadCircuit(id)}
    >
      {name}
    </Link>
  ) : (
    <>{name}</>
  );
}

export function FavButton({ kind, id, name }: { kind: FavKind; id: string; name: string }) {
  const { isFav, toggle } = useFavorites();
  const on = isFav(kind, id);
  return (
    <button
      type="button"
      className={`fav-btn${on ? ' fav-btn--on' : ''}`}
      aria-pressed={on}
      aria-label={on ? `Убрать ${name} из избранного` : `Добавить ${name} в избранное`}
      onClick={() => toggle(kind, id)}
    >
      <span aria-hidden="true">{on ? '★' : '☆'}</span> {on ? 'В избранном' : 'В избранное'}
    </button>
  );
}

/** Marks a sprint weekend: an extra short race for points on Saturday. */
export function SprintBadge() {
  return (
    <span className="sprint-badge" title="Спринт-уикенд: в субботу короткая гонка за очки">
      <svg viewBox="0 0 12 16" width="9" height="12" aria-hidden="true" focusable="false">
        <path d="M7.5 0 0 9h4.5L3.5 16 12 6.5H7.2z" fill="currentColor" />
      </svg>
      Спринт
    </span>
  );
}

export function StatusBadge({ status }: { status: RaceStatus }) {
  return <span className={`badge badge--${status}`}>{STATUS_LABELS[status]}</span>;
}
