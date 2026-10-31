import {
  ageAt,
  mapCircuit,
  mapConstructorStandings,
  mapDriverProfile,
  mapDriverStandings,
  mapPitStops,
  mapRace,
  mapRaceResults,
  mapRaces,
  mapSeasons,
  mergeRacesByRound,
  num,
} from './mappers';

const driver = {
  driverId: 'russell',
  givenName: 'George',
  familyName: 'Russell',
  code: 'RUS',
  permanentNumber: '63',
  nationality: 'British',
};
const mercedes = { constructorId: 'mercedes', name: 'Mercedes', nationality: 'German' };

describe('num', () => {
  it('parses numeric strings, rejects junk', () => {
    expect(num('25')).toBe(25);
    expect(num('4.5')).toBe(4.5);
    expect(num('')).toBeNull();
    expect(num('N/A')).toBeNull();
    expect(num(undefined)).toBeNull();
    expect(num(null)).toBeNull();
    expect(num(7)).toBe(7);
  });
});

describe('mapSeasons', () => {
  it('sorts newest first and drops duplicates/invalid', () => {
    const s = mapSeasons([{ season: '2024' }, { season: '2026' }, { season: '2024' }, { season: 'x' }, {}]);
    expect(s.map((x) => x.year)).toEqual([2026, 2024]);
  });
});

describe('mapRace', () => {
  it('maps calendar entry with sessions in chronological order', () => {
    const r = mapRace({
      season: '2026',
      round: '2',
      raceName: 'Chinese Grand Prix',
      Circuit: {
        circuitId: 'shanghai',
        circuitName: 'Shanghai International Circuit',
        Location: { locality: 'Shanghai', country: 'China' },
      },
      date: '2026-03-15',
      time: '07:00:00Z',
      FirstPractice: { date: '2026-03-13', time: '03:30:00Z' },
      Qualifying: { date: '2026-03-14', time: '07:00:00Z' },
      Sprint: { date: '2026-03-14', time: '03:00:00Z' },
      SprintQualifying: { date: '2026-03-13', time: '07:30:00Z' },
    })!;
    expect(r.round).toBe(2);
    expect(r.country).toBe('China');
    expect(r.hasSprint).toBe(true);
    expect(r.sessions.map((s) => s.kind)).toEqual([
      'FP1',
      'SprintQualifying',
      'Sprint',
      'Qualifying',
      'Race',
    ]);
  });

  it('keeps missing fields null instead of inventing values', () => {
    const r = mapRace({ season: '1950', round: '1', raceName: 'British Grand Prix', date: '1950-05-13' })!;
    expect(r.time).toBeNull();
    expect(r.circuitName).toBeNull();
    expect(r.country).toBeNull();
    expect(r.sessions).toEqual([{ kind: 'Race', label: 'Гонка', date: '1950-05-13', time: null }]);
  });

  it('returns null without season or round', () => {
    expect(mapRace({ raceName: 'X' })).toBeNull();
  });

  it('mapRaces sorts by round', () => {
    const list = mapRaces([{ season: '2026', round: '3' }, { season: '2026', round: '1' }, { bad: true }]);
    expect(list.map((r) => r.round)).toEqual([1, 3]);
  });
});

describe('mapRaceResults', () => {
  it('parses numbers from strings and keeps optional fields', () => {
    const [a, b] = mapRaceResults([
      {
        position: '1',
        positionText: '1',
        points: '25',
        grid: '1',
        laps: '58',
        status: 'Finished',
        Time: { time: '1:23:06.801' },
        Driver: driver,
        Constructor: mercedes,
      },
      {
        position: '20',
        positionText: 'R',
        points: '0',
        laps: '12',
        status: 'Retired',
        Driver: { driverId: 'x', familyName: 'X' },
      },
    ]);
    expect(a).toMatchObject({ position: 1, points: 25, grid: 1, laps: 58, time: '1:23:06.801' });
    expect(a.driver.code).toBe('RUS');
    expect(b.constructor).toBeNull();
    expect(b.time).toBeNull();
    expect(b.grid).toBeNull();
    expect(b.positionText).toBe('R');
  });

  it('skips rows without a driver and handles empty arrays', () => {
    expect(mapRaceResults([{ position: '1' }])).toEqual([]);
    expect(mapRaceResults([])).toEqual([]);
  });
});

describe('standings', () => {
  it('maps driver standings with fractional points', () => {
    const [s] = mapDriverStandings([
      {
        position: '1',
        positionText: '1',
        points: '365.5',
        wins: '9',
        Driver: driver,
        Constructors: [mercedes],
      },
    ]);
    expect(s.points).toBe(365.5);
    expect(s.wins).toBe(9);
    expect(s.constructors[0].name).toBe('Mercedes');
  });

  it('keeps unknown wins as null', () => {
    const [s] = mapConstructorStandings([{ position: '1', points: '10', Constructor: mercedes }]);
    expect(s.wins).toBeNull();
    expect(s.positionText).toBeNull();
  });
});

describe('profiles', () => {
  it('maps a circuit with coordinates', () => {
    const c = mapCircuit({
      circuitId: 'suzuka',
      circuitName: 'Suzuka Circuit',
      Location: { lat: '34.8431', long: '136.541', locality: 'Suzuka', country: 'Japan' },
    });
    expect(c).toMatchObject({ id: 'suzuka', lat: 34.8431, long: 136.541, country: 'Japan' });
    expect(mapCircuit({})).toBeNull();
  });

  it('joins one race split across pages', () => {
    const base = { season: '2026', round: '1', raceName: 'A' };
    const res = (id: string) => ({ position: '1', Driver: { driverId: id, familyName: id } });
    const merged = mergeRacesByRound([
      { ...base, Results: [res('a')] },
      { ...base, Results: [res('b')] },
      { season: '2026', round: '2', raceName: 'B', Results: [res('a')] },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[0].results.map((r) => r.driver.id)).toEqual(['a', 'b']);
  });

  it('computes age only from a valid birth date', () => {
    expect(ageAt('1998-02-15', new Date('2026-02-14T00:00:00Z'))).toBe(27);
    expect(ageAt('1998-02-15', new Date('2026-02-15T00:00:00Z'))).toBe(28);
    expect(ageAt(null, new Date())).toBeNull();
    expect(ageAt('1998', new Date())).toBeNull();
  });

  it('maps driver profile with birth date', () => {
    expect(mapDriverProfile({ driverId: 'x', familyName: 'X', dateOfBirth: '2000-01-01' })?.dateOfBirth).toBe(
      '2000-01-01',
    );
  });
});

describe('pit stops and car numbers', () => {
  it('maps pit stops and skips rows without a driver', () => {
    const stops = mapPitStops([
      { driverId: 'hamilton', lap: '10', stop: '1', time: '15:20:01', duration: '22.433' },
      { lap: '11' },
    ]);
    expect(stops).toEqual([{ driverId: 'hamilton', stop: 1, lap: 10, time: '15:20:01', duration: '22.433' }]);
  });

  it('keeps the car number of a race result', () => {
    const [r] = mapRaceResults([{ number: '44', position: '1', Driver: { driverId: 'hamilton' } }]);
    expect(r.number).toBe('44');
  });
});
