import {
  addCounts,
  bestFinish,
  leader,
  pairSeasons,
  polesIncomplete,
  seasonSpan,
  titleYears,
} from './career';
import type { SeasonStanding } from './types';

const row = (season: number, position: number | null, final = true): SeasonStanding => ({
  season,
  position,
  positionText: position === null ? 'D' : String(position),
  points: 10,
  wins: 0,
  teams: [],
  final,
});

describe('career helpers', () => {
  it('adds counts only when every part is known', () => {
    expect(addCounts(106, 59, 43)).toBe(208);
    expect(addCounts(1, null, 2)).toBeNull();
  });

  it('flags careers older than the qualifying data', () => {
    expect(polesIncomplete([1991, 1992, 2006])).toBe(true);
    expect(polesIncomplete([2007, 2026])).toBe(false);
    expect(polesIncomplete([])).toBe(false);
  });

  it('formats the season span', () => {
    expect(seasonSpan([2026, 2007, 2015])).toBe('2007–2026');
    expect(seasonSpan([1950])).toBe('1950');
    expect(seasonSpan([])).toBeNull();
  });

  it('counts titles and best finish only in finished seasons', () => {
    const history = [row(2008, 1), row(2016, 2), row(2026, 1, false), row(1997, null)];
    expect(titleYears(history)).toEqual([2008]);
    expect(bestFinish(history)).toEqual({ position: 1, seasons: [2008] });
    expect(bestFinish([row(2026, 1, false)])).toBeNull();
  });

  it('pairs two careers by season, newest first', () => {
    const pairs = pairSeasons([row(2020, 3), row(2021, 1)], [row(2021, 2), row(2022, 1)]);
    expect(pairs.map((p) => p.season)).toEqual([2022, 2021, 2020]);
    expect(pairs[0].a).toBeNull();
    expect(pairs[1].a?.position).toBe(1);
    expect(pairs[2].b).toBeNull();
  });

  it('decides who leads a metric', () => {
    expect(leader(5, 3)).toBe('a');
    expect(leader(5, 5)).toBe('tie');
    expect(leader(2, 1, 'lower')).toBe('b');
    expect(leader(null, 1)).toBeNull();
  });
});
