import { useState, type CSSProperties } from 'react';

import { TEAM_ABBR, TEAM_LOGOS } from '../data/logos';
import type { Constructor } from '../domain/types';
import { teamColor } from './bits';

/** "Red Bull" → "RED"; known teams use their usual short name. */
export function teamAbbr(team: Pick<Constructor, 'id' | 'name'>): string {
  const known = TEAM_ABBR[team.id];
  if (known) return known;
  const letters = team.name.replace(/[^\p{L}\p{N}]/gu, '');
  return (letters.slice(0, 3) || '?').toUpperCase();
}

/** Dark text on light team colors, white on dark ones. */
export function badgeInk(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111318' : '#fff';
}

/**
 * Team emblem in a circle of the team color (see data/logos.ts),
 * or a badge with a short name. Decorative: the name is always next to it.
 */
export function TeamLogo({ team, size = 'sm' }: { team: Constructor; size?: 'sm' | 'lg' }) {
  const entry = TEAM_LOGOS[team.id];
  const [broken, setBroken] = useState(false);
  const cls = `team-logo team-logo--${size}`;
  const bg = teamColor(team);
  if (entry && !broken) {
    return (
      <span
        className={`${cls} team-logo--emblem`}
        style={{ '--team': bg } as CSSProperties}
        title={`© ${entry.holder}`}
        aria-hidden="true"
      >
        <img
          className={`team-logo__img team-logo__img--${entry.tone}`}
          src={`${import.meta.env.BASE_URL}logos/${entry.file}`}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
        />
      </span>
    );
  }
  return (
    <span className={cls} style={{ background: bg, color: badgeInk(bg) }} aria-hidden="true">
      {teamAbbr(team)}
    </span>
  );
}
