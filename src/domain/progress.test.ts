import { buildProgress, niceAxis } from './progress';
import type { DriverStanding } from './types';

const st = (id: string, pos: number, pts: number, team = 'mercedes'): DriverStanding => ({
  position: pos,
  positionText: String(pos),
  points: pts,
  wins: 0,
  driver: {
    id,
    givenName: '',
    familyName: id,
    code: id.toUpperCase(),
    number: null,
    nationality: null,
    url: null,
  },
  constructors: [{ id: team, name: team, nationality: null, url: null }],
});

describe('buildProgress', () => {
  it('takes points per round from the source, without summing', () => {
    const p = buildProgress([
      { round: 2, rows: [st('b', 1, 30), st('a', 2, 28)] },
      { round: 1, rows: [st('a', 1, 25), st('b', 2, 18)] },
    ]);
    expect(p.rounds).toEqual([1, 2]);
    expect(p.series.map((s) => s.driver.id)).toEqual(['b', 'a']);
    expect(p.series[0].points).toEqual([18, 30]);
    expect(p.maxPoints).toBe(30);
  });

  it('leaves a gap when a driver is absent from a round', () => {
    const p = buildProgress([
      { round: 1, rows: [st('a', 1, 25)] },
      { round: 2, rows: [st('a', 1, 43), st('new', 2, 1)] },
    ]);
    expect(p.series.find((s) => s.driver.id === 'new')!.points).toEqual([null, 1]);
  });

  it('puts drivers missing from the last round after the rest', () => {
    const p = buildProgress([
      { round: 1, rows: [st('gone', 1, 25), st('a', 2, 18)] },
      { round: 2, rows: [st('a', 1, 36)] },
    ]);
    expect(p.series.map((s) => s.driver.id)).toEqual(['a', 'gone']);
  });
});

describe('helpers', () => {
  it('makes a readable axis', () => {
    expect(niceAxis(365)).toEqual({ max: 400, step: 100 });
    expect(niceAxis(0)).toEqual({ max: 10, step: 2 });
    expect(niceAxis(43)).toEqual({ max: 50, step: 10 });
  });
});
