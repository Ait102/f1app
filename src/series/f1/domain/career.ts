// Helpers for career statistics. Everything here works on counts and table
// rows the source already published: no points are summed or recalculated.
import type { RaceWin, RaceWithResults, SeasonStanding } from './types';

/** Qualifying results in the source start in 1994: earlier poles are not counted. */
export const QUALIFYING_DATA_FROM = 1994;

/** The constructors' championship has existed since 1958. */
export const CONSTRUCTORS_CUP_FROM = 1958;

/** Sum of row counts (e.g. P1 + P2 + P3 finishes = podiums); null if any part is unknown. */
export function addCounts(...parts: Array<number | null>): number | null {
  return parts.some((p) => p === null) ? null : parts.reduce<number>((a, p) => a + (p ?? 0), 0);
}

/** True when part of the career is older than the qualifying data, so poles are incomplete. */
export function polesIncomplete(seasons: number[]): boolean {
  return seasons.length > 0 && Math.min(...seasons) < QUALIFYING_DATA_FROM;
}

/** Races where the team has both the winner and the runner-up. */
export function countOneTwos(wins: RaceWithResults[], seconds: RaceWithResults[]): number {
  const won = new Set(wins.map((r) => `${r.race.seasonYear}:${r.race.round}`));
  return seconds.filter((r) => won.has(`${r.race.seasonYear}:${r.race.round}`)).length;
}

/** First and last win from a list of won races (sorted or not). */
export function winSpan(wins: RaceWithResults[]): { first: RaceWin | null; last: RaceWin | null } {
  const sorted = [...wins].sort(
    (a, b) => a.race.seasonYear - b.race.seasonYear || a.race.round - b.race.round,
  );
  const toWin = (r: RaceWithResults | undefined): RaceWin | null =>
    r
      ? {
          season: r.race.seasonYear,
          round: r.race.round,
          name: r.race.name,
          driver: r.results.find((x) => x.position === 1)?.driver ?? r.results[0]?.driver ?? null,
        }
      : null;
  return { first: toWin(sorted[0]), last: toWin(sorted[sorted.length - 1]) };
}

/** "2007–2026", "1950" or null. */
export function seasonSpan(seasons: number[]): string | null {
  if (seasons.length === 0) return null;
  const from = Math.min(...seasons);
  const to = Math.max(...seasons);
  return from === to ? String(from) : `${from}–${to}`;
}

/** Finished seasons won in the championship (a running season does not count). */
export function titleYears(history: SeasonStanding[]): number[] {
  return history
    .filter((r) => r.final && r.position === 1)
    .map((r) => r.season)
    .sort((a, b) => a - b);
}

/** Best final championship position and its seasons; null without finished, classified seasons. */
export function bestFinish(history: SeasonStanding[]): { position: number; seasons: number[] } | null {
  const ranked = history.filter(
    (r): r is SeasonStanding & { position: number } => r.final && r.position !== null,
  );
  if (ranked.length === 0) return null;
  const position = Math.min(...ranked.map((r) => r.position));
  return {
    position,
    seasons: ranked
      .filter((r) => r.position === position)
      .map((r) => r.season)
      .sort((a, b) => a - b),
  };
}

export interface SeasonPair {
  season: number;
  a: SeasonStanding | null;
  b: SeasonStanding | null;
}

/** Seasons of two drivers side by side, newest first; a season missing for one driver is null. */
export function pairSeasons(a: SeasonStanding[], b: SeasonStanding[]): SeasonPair[] {
  const years = new Set([...a.map((r) => r.season), ...b.map((r) => r.season)]);
  return [...years]
    .sort((x, y) => y - x)
    .map((season) => ({
      season,
      a: a.find((r) => r.season === season) ?? null,
      b: b.find((r) => r.season === season) ?? null,
    }));
}

/** Which side leads on a metric: 'a', 'b', 'tie' or null when a value is unknown. */
export function leader(
  a: number | null,
  b: number | null,
  better: 'higher' | 'lower' = 'higher',
): 'a' | 'b' | 'tie' | null {
  if (a === null || b === null) return null;
  if (a === b) return 'tie';
  return (better === 'higher' ? a > b : a < b) ? 'a' : 'b';
}
