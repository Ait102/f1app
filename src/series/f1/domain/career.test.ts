import {
  addCounts,
  bestFinish,
  countOneTwos,
  leader,
  pairSeasons,
  polesIncomplete,
  seasonSpan,
  titleYears,
  winSpan,
} from './career';
import type { RaceWithResults, SeasonStanding } from './types';

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

const won = (season: number, round: number, driverId = 'x'): RaceWithResults => ({
  race: { seasonYear: season, round, name: `GP ${round}` } as RaceWithResults['race'],
  results: [
    {
      position: 1,
      driver: { id: driverId, givenName: 'A', familyName: driverId },
    } as RaceWithResults['results'][0],
  ],
});

describe('team wins', () => {
  it('counts 1–2 finishes as races in both lists', () => {
    expect(countOneTwos([won(2020, 1), won(2020, 2), won(2021, 1)], [won(2020, 2), won(2021, 3)])).toBe(1);
    expect(countOneTwos([], [won(2020, 2)])).toBe(0);
  });

  it('finds the first and last win in any order', () => {
    const s = winSpan([won(2021, 5, 'b'), won(1999, 3, 'a'), won(2021, 2)]);
    expect([s.first?.season, s.first?.round, s.first?.driver?.id]).toEqual([1999, 3, 'a']);
    expect([s.last?.season, s.last?.round, s.last?.driver?.id]).toEqual([2021, 5, 'b']);
    expect(winSpan([])).toEqual({ first: null, last: null });
  });
});
