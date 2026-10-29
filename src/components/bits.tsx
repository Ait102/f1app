import type { Constructor, Driver } from '../domain/types';
import { driverName } from '../domain/mappers';
import { STATUS_LABELS, type RaceStatus } from '../domain/status';
import { formatMoment } from '../domain/format';

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

export function DriverCell({ driver, team }: { driver: Driver; team?: Constructor | null }) {
  return (
    <span className="driver">
      <span className="team-bar" style={{ background: teamColor(team) }} aria-hidden="true" />
      <span className="driver__name">
        <span className="driver__given">{driver.givenName} </span>
        <strong>{driver.familyName}</strong>
      </span>
      {driver.code && <span className="driver__code">{driver.code}</span>}
    </span>
  );
}

export function TeamCell({ team }: { team: Constructor | null }) {
  if (!team) return <span className="muted">—</span>;
  return (
    <span className="team">
      <span className="team-dot" style={{ background: teamColor(team) }} aria-hidden="true" />
      {team.name}
    </span>
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

export function matchesDriver(d: Driver, teams: Constructor[], q: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  const hay = [driverName(d), d.code ?? '', d.number ?? '', ...teams.map((t) => t.name)].join(' ').toLowerCase();
  return hay.includes(query);
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
