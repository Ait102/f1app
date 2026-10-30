// Small Ergast-shaped fixtures so E2E tests don't depend on the live API or today's date.
import type { Page, Route } from '@playwright/test';

/** Frozen "now": after round 1, before round 2 of 2026. */
const NOW = new Date('2026-03-10T12:00:00Z');

const driver = (id: string, given: string, family: string, code: string) => ({
  driverId: id,
  givenName: given,
  familyName: family,
  code,
  nationality: 'Test',
});
const team = (id: string, name: string) => ({ constructorId: id, name, nationality: 'Test' });

const RUS = driver('russell', 'George', 'Russell', 'RUS');
const ANT = driver('antonelli', 'Andrea Kimi', 'Antonelli', 'ANT');
const VER = driver('max_verstappen', 'Max', 'Verstappen', 'VER');
const MER = team('mercedes', 'Mercedes');
const RBR = team('red_bull', 'Red Bull');

const race = (season: number, round: number, name: string, date: string, extra: object = {}) => ({
  season: String(season),
  round: String(round),
  raceName: name,
  Circuit: {
    circuitId: `c${round}`,
    circuitName: `${name} Circuit`,
    Location: { locality: 'City', country: 'Country' },
  },
  date,
  time: '13:00:00Z',
  ...extra,
});

const races: Record<number, object[]> = {
  2026: [
    race(2026, 1, 'Australian Grand Prix', '2026-03-08'),
    race(2026, 2, 'Chinese Grand Prix', '2026-03-15', { Sprint: { date: '2026-03-14', time: '03:00:00Z' } }),
    race(2026, 3, 'Japanese Grand Prix', '2026-03-29'),
  ],
  2025: [race(2025, 1, 'Season 2025 Finale', '2025-12-07')],
};

const driverStandings: Record<number, object[]> = {
  2026: [
    { position: '1', positionText: '1', points: '25', wins: '1', Driver: RUS, Constructors: [MER] },
    { position: '2', positionText: '2', points: '18', wins: '0', Driver: ANT, Constructors: [MER] },
    { position: '3', positionText: '3', points: '15', wins: '0', Driver: VER, Constructors: [RBR] },
  ],
  2025: [{ position: '1', positionText: '1', points: '400', wins: '10', Driver: VER, Constructors: [RBR] }],
};

const results = [
  {
    position: '1',
    positionText: '1',
    points: '25',
    grid: '1',
    laps: '58',
    status: 'Finished',
    Time: { time: '1:23:06.801' },
    Driver: RUS,
    Constructor: MER,
  },
  {
    position: '2',
    positionText: '2',
    points: '18',
    grid: '2',
    laps: '58',
    status: 'Finished',
    Time: { time: '+2.974' },
    Driver: ANT,
    Constructor: MER,
  },
  {
    position: '3',
    positionText: '3',
    points: '15',
    grid: '3',
    laps: '58',
    status: 'Finished',
    Time: { time: '+5.100' },
    Driver: VER,
    Constructor: RBR,
  },
];

const mr = (total: number, body: object) => ({
  MRData: { limit: '100', offset: '0', total: String(total), ...body },
});

function respond(path: string): object | null {
  let m: RegExpMatchArray | null;
  if (/^\/seasons\/$/.test(path)) {
    return mr(2, { SeasonTable: { Seasons: [{ season: '2025' }, { season: '2026' }] } });
  }
  if ((m = path.match(/^\/(\d{4})\/races\/$/))) {
    const list = races[+m[1]] ?? [];
    return mr(list.length, { RaceTable: { season: m[1], Races: list } });
  }
  if ((m = path.match(/^\/(\d{4})\/driverstandings\/$/))) {
    const rows = driverStandings[+m[1]] ?? [];
    return mr(rows.length, {
      StandingsTable: { StandingsLists: [{ season: m[1], round: '1', DriverStandings: rows }] },
    });
  }
  if ((m = path.match(/^\/(\d{4})\/(\d+)\/driverstandings\/$/))) {
    const rows = driverStandings[+m[1]] ?? [];
    return mr(rows.length, {
      StandingsTable: { StandingsLists: [{ season: m[1], round: m[2], DriverStandings: rows }] },
    });
  }
  if ((m = path.match(/^\/(\d{4})\/constructorstandings\/$/))) {
    const rows = [
      { position: '1', positionText: '1', points: '43', wins: '1', Constructor: MER },
      { position: '2', positionText: '2', points: '15', wins: '0', Constructor: RBR },
    ];
    return mr(2, {
      StandingsTable: { StandingsLists: [{ season: m[1], round: '1', ConstructorStandings: rows }] },
    });
  }
  if ((m = path.match(/^\/(\d{4})\/(\d+)\/results\/$/))) {
    const r = { ...(races[+m[1]]?.[+m[2] - 1] ?? {}), Results: +m[2] === 1 ? results : [] };
    return mr(r.Results.length, { RaceTable: { Races: [r] } });
  }
  if ((m = path.match(/^\/(\d{4})\/(\d+)\/(qualifying|sprint)\/$/))) {
    return mr(0, { RaceTable: { Races: [] } });
  }

  // Profiles
  const allDrivers = [RUS, ANT, VER];
  const allTeams = [MER, RBR];
  const r1 = races[2026][0];
  if ((m = path.match(/^\/drivers\/(\w+)\/$/))) {
    const d = allDrivers.find((x) => x.driverId === m![1]);
    return mr(d ? 1 : 0, {
      DriverTable: { Drivers: d ? [{ ...d, permanentNumber: '63', dateOfBirth: '1998-02-15' }] : [] },
    });
  }
  if ((m = path.match(/^\/drivers\/(\w+)\/results\/1\/$/))) return mr(m[1] === 'russell' ? 8 : 0, {});
  if ((m = path.match(/^\/drivers\/(\w+)\/results\/$/))) return mr(170, {});
  if ((m = path.match(/^\/(\d{4})\/drivers\/(\w+)\/results\/$/))) {
    const own = results.filter((x) => x.Driver.driverId === m![2]);
    return mr(own.length, { RaceTable: { Races: own.length ? [{ ...r1, Results: own }] : [] } });
  }
  if ((m = path.match(/^\/constructors\/(\w+)\/$/))) {
    const t = allTeams.find((x) => x.constructorId === m![1]);
    return mr(t ? 1 : 0, { ConstructorTable: { Constructors: t ? [t] : [] } });
  }
  if ((m = path.match(/^\/constructors\/(\w+)\/results\/1\/$/))) return mr(143, {});
  if ((m = path.match(/^\/(\d{4})\/constructors\/(\w+)\/drivers\/$/))) {
    const ds = results.filter((x) => x.Constructor.constructorId === m![2]).map((x) => x.Driver);
    return mr(ds.length, { DriverTable: { Drivers: ds } });
  }
  if ((m = path.match(/^\/(\d{4})\/constructors\/(\w+)\/results\/$/))) {
    const own = results.filter((x) => x.Constructor.constructorId === m![2]);
    return mr(own.length, { RaceTable: { Races: [{ ...r1, Results: own }] } });
  }
  if ((m = path.match(/^\/circuits\/(\w+)\/$/))) {
    return mr(1, {
      CircuitTable: {
        Circuits: [
          {
            circuitId: m[1],
            circuitName: 'Australian Grand Prix Circuit',
            Location: { lat: '-37.8', long: '144.9', locality: 'City', country: 'Country' },
          },
        ],
      },
    });
  }
  if ((m = path.match(/^\/circuits\/(\w+)\/results\/1\/$/))) {
    return mr(2, {
      RaceTable: {
        Races: [
          { ...races[2025][0], Results: [{ position: '1', points: '25', Driver: VER, Constructor: RBR }] },
          { ...r1, Results: [results[0]] },
        ],
      },
    });
  }
  return null;
}

type Override = (path: string) => { status: number; headers?: Record<string, string>; body?: string } | null;

/** Serves fixtures for every Jolpica request; `override` can inject failures. */
export async function mockApi(page: Page, override?: Override): Promise<string[]> {
  const calls: string[] = [];
  await page.clock.setFixedTime(NOW);
  await page.route('https://api.jolpi.ca/ergast/f1/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/ergast/f1', '');
    calls.push(path);
    const o = override?.(path);
    if (o) return route.fulfill({ status: o.status, headers: o.headers, body: o.body ?? '' });
    const body = respond(path);
    if (!body) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return calls;
}
