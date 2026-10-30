import { formatDate, formatMoment, formatPoints, utcOffsetLabel } from '../../../lib/format';
import { findNextRace, raceStatus } from './status';
import type { RaceEvent } from './types';

function race(round: number, date: string | null, time: string | null, fp1?: string): RaceEvent {
  return {
    seasonYear: 2026,
    round,
    name: `R${round}`,
    circuitId: null,
    circuitName: null,
    locality: null,
    country: null,
    url: null,
    date,
    time,
    hasSprint: false,
    sessions: [
      ...(fp1 ? [{ kind: 'FP1' as const, label: 'FP1', date: fp1.slice(0, 10), time: fp1.slice(11) }] : []),
      { kind: 'Race' as const, label: 'Гонка', date, time },
    ],
  };
}

describe('raceStatus', () => {
  const r = race(19, '2026-11-01', '20:00:00Z', '2026-10-30T18:30:00Z');

  it('completed when the round is in standings', () => {
    expect(raceStatus(r, new Date('2026-10-01T00:00:00Z'), 19)).toBe('completed');
  });

  it('upcoming before the first session', () => {
    expect(raceStatus(r, new Date('2026-10-29T00:00:00Z'), 18)).toBe('upcoming');
  });

  it('live during the weekend', () => {
    expect(raceStatus(r, new Date('2026-10-31T12:00:00Z'), 18)).toBe('live');
  });

  it('awaiting results after the race when standings lag', () => {
    expect(raceStatus(r, new Date('2026-11-02T12:00:00Z'), 18)).toBe('awaiting');
  });

  it('unknown without a date', () => {
    expect(raceStatus(race(1, null, null), new Date(), null)).toBe('unknown');
  });

  it('date-only race is live for that UTC day', () => {
    const d = race(1, '1950-05-13', null);
    expect(raceStatus(d, new Date('1950-05-13T15:00:00Z'), null)).toBe('live');
    expect(raceStatus(d, new Date('1950-05-15T00:00:00Z'), null)).toBe('awaiting');
  });

  it('findNextRace picks the first upcoming', () => {
    const list = [
      race(1, '2026-03-08', '04:00:00Z'),
      race(2, '2026-03-15', '07:00:00Z'),
      race(3, '2026-03-29', '05:00:00Z'),
    ];
    expect(findNextRace(list, new Date('2026-03-10T00:00:00Z'), 1)?.round).toBe(2);
    expect(findNextRace(list, new Date('2026-12-31T00:00:00Z'), 3)).toBeNull();
  });
});

describe('format', () => {
  it('shows time in the given zone and keeps UTC', () => {
    const m = formatMoment('2026-11-01', '20:00:00Z', 'Europe/Moscow');
    expect(m.text).toMatch(/23:00/);
    expect(m.utc).toBe('2026-11-01 20:00 UTC');
    expect(m.hasTime).toBe(true);
  });

  it('does not shift date-only values', () => {
    const m = formatMoment('2026-11-01', null, 'America/Los_Angeles');
    expect(m.text).toMatch(/1 ноября 2026/);
    expect(m.text).toMatch(/время не объявлено/);
  });

  it('handles missing dates', () => {
    expect(formatMoment(null, null).text).toBe('Дата не объявлена');
  });

  it('offset label', () => {
    expect(utcOffsetLabel('Europe/Moscow', new Date('2026-01-01'))).toBe('UTC+3');
    expect(utcOffsetLabel('UTC')).toBe('UTC');
    expect(utcOffsetLabel('Asia/Kolkata', new Date('2026-01-01'))).toBe('UTC+5:30');
  });

  it('full date without a time-zone shift', () => {
    expect(formatDate('1998-02-15')).toMatch(/^15 февраля 1998/);
    expect(formatDate(null)).toBe('Дата не объявлена');
  });

  it('points', () => {
    expect(formatPoints(null)).toBe('—');
    expect(formatPoints(4.5)).toBe('4,5');
  });
});
