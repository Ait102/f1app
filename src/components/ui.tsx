// Small UI pieces shared by every series: stat tiles, search, dates, points bars.
import type { ReactNode } from 'react';

import { formatMoment, formatPoints } from '../lib/format';

/** Small "label / value" stat tile. Unknown values show as a dash. */
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="stat">
      <span className="stat__value">{value ?? '—'}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
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
