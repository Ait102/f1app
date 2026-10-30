import { sessionStart } from '../../../lib/format';
import type { RaceEvent } from './types';

export type RaceStatus = 'completed' | 'live' | 'upcoming' | 'awaiting' | 'unknown';

export const STATUS_LABELS: Record<RaceStatus, string> = {
  completed: 'Завершён',
  live: 'Идёт',
  upcoming: 'Предстоящий',
  awaiting: 'Ждём результаты',
  unknown: 'Статус не определён',
};

/** A race weekend is considered over this long after the race start. */
const RACE_DURATION_MS = 3 * 60 * 60 * 1000;

/**
 * Status is derived only from reliable signals:
 * - "completed" when the source already counts the round in standings;
 * - otherwise from session dates. Jolpica has no cancelled/postponed flags,
 *   so those are never shown.
 */
export function raceStatus(race: RaceEvent, now: Date, lastCompletedRound: number | null): RaceStatus {
  if (lastCompletedRound !== null && race.round <= lastCompletedRound) return 'completed';

  const raceStart = sessionStart(race);
  if (!raceStart) return 'unknown';

  const starts = race.sessions
    .map(sessionStart)
    .filter((d): d is Date => d !== null)
    .map((d) => d.getTime());
  const weekendStart = Math.min(raceStart.getTime(), ...starts);
  const raceEnd = race.time
    ? raceStart.getTime() + RACE_DURATION_MS
    : raceStart.getTime() + 24 * 60 * 60 * 1000;

  const t = now.getTime();
  if (t < weekendStart) return 'upcoming';
  if (t <= raceEnd) return 'live';
  return 'awaiting';
}

export function findNextRace(
  races: RaceEvent[],
  now: Date,
  lastCompletedRound: number | null,
): RaceEvent | null {
  return (
    races.find((r) => {
      const s = raceStatus(r, now, lastCompletedRound);
      return s === 'upcoming' || s === 'live';
    }) ?? null
  );
}
