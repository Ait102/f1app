// Championship progress: each point comes from the source's standings after
// that round. Nothing is summed or recalculated here.
import type { Constructor, Driver, DriverStanding } from './types';

export interface RoundStandings {
  round: number;
  rows: DriverStanding[];
}

export interface ProgressSeries {
  driver: Driver;
  team: Constructor | null;
  /** Final position in the last loaded round (source value). */
  finalPosition: number | null;
  /** Points after each round, aligned with `rounds`; null = not in that round's table. */
  points: Array<number | null>;
}

interface Progress {
  rounds: number[];
  series: ProgressSeries[];
  maxPoints: number;
}

export function buildProgress(input: RoundStandings[]): Progress {
  const sorted = [...input].sort((a, b) => a.round - b.round);
  const rounds = sorted.map((r) => r.round);
  const byDriver = new Map<string, ProgressSeries>();

  sorted.forEach((r, i) => {
    for (const row of r.rows) {
      let s = byDriver.get(row.driver.id);
      if (!s) {
        s = { driver: row.driver, team: null, finalPosition: null, points: rounds.map(() => null) };
        byDriver.set(row.driver.id, s);
      }
      s.points[i] = row.points;
      s.team = row.constructors.at(-1) ?? s.team;
      s.finalPosition = row.position;
    }
  });

  // Drivers missing from the last round keep their earlier position; push them after the ones present.
  const last = sorted.at(-1);
  const inLast = new Set(last?.rows.map((r) => r.driver.id));
  const series = [...byDriver.values()].sort((a, b) => {
    const la = inLast.has(a.driver.id) ? 0 : 1;
    const lb = inLast.has(b.driver.id) ? 0 : 1;
    if (la !== lb) return la - lb;
    return (a.finalPosition ?? 999) - (b.finalPosition ?? 999);
  });

  let maxPoints = 0;
  for (const s of series) for (const p of s.points) if (p !== null && p > maxPoints) maxPoints = p;
  return { rounds, series, maxPoints };
}

/** "Nice" axis maximum and step for a points axis. */
export function niceAxis(max: number, ticks = 5): { max: number; step: number } {
  if (max <= 0) return { max: 10, step: 2 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return { max: Math.ceil(max / step) * step, step };
}
