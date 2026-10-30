import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { preloadCircuit } from '../data/circuits';
import { formatMoment, formatPoints } from '../domain/format';
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

/** Small "label / value" stat tile. Unknown values show as a dash. */
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="stat">
      <span className="stat__value">{value ?? '—'}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: RaceStatus }) {
  return <span className={`badge badge--${status}`}>{STATUS_LABELS[status]}</span>;
}

export function Moment({ date, time }: { date: string | null; time: string | null }) {
  const m = formatMoment(date, time);
  return (
    <time dateTime={date ? (time ? `${date}T${time}` : date) : undefined} title={m.utc ?? undefined}>
      {m.text}
    </time>
  );
}

export function SearchBox({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <label className="search">
      <span className="visually-hidden">{label}</span>
      <input
        type="search"
        value={value}
        placeholder={label}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </label>
  );
}

/** Bar width (%) relative to the leader's points; `min` keeps tiny values visible. Visual only. */
export function leaderShare(points: number | null, leader: number | null | undefined, min = 0): number {
  return points !== null && leader ? Math.max(min, Math.min(100, (points / leader) * 100)) : 0;
}

/** Gold/silver/bronze modifier for positions 1–3. */
export function posClass(base: string, position: number | null): string {
  return position !== null && position <= 3 ? `${base} pos--${position}` : base;
}

/** Points with a thin bar showing the share of the leader's points (visual only, no maths on the result). */
export function PointsWithBar({
  points,
  leader,
}: {
  points: number | null;
  leader: number | null | undefined;
}) {
  const pct = leaderShare(points, leader, 2);
  return (
    <span className="pts">
      <strong>{formatPoints(points)}</strong>
      <span className="pts__track" aria-hidden="true">
        <span className="pts__fill" style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}
