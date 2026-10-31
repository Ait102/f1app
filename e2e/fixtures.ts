// Small Ergast-shaped fixtures so E2E tests don't depend on the live API or today's date.
import type { Page, Route } from '@playwright/test';

/** Frozen "now": after round 1, before round 2 of 2026. */
const NOW = new Date('2026-03-10T12:00:00Z');

const driver = (
  id: string,
  given: string,
  family: string,
  code: string,
  nationality: string,
  number: string,
) => ({
  driverId: id,
  givenName: given,
  familyName: family,
  code,
  nationality,
  permanentNumber: number,
});
const team = (id: string, name: string, nationality: string) => ({ constructorId: id, name, nationality });

const RUS = {
  ...driver('russell', 'George', 'Russell', 'RUS', 'British', '63'),
  url: 'http://en.wikipedia.org/wiki/George_Russell_(racing_driver)',
};
const ANT = driver('antonelli', 'Andrea Kimi', 'Antonelli', 'ANT', 'Italian', '12');
const VER = driver('max_verstappen', 'Max', 'Verstappen', 'VER', 'Dutch', '3');
const MER = team('mercedes', 'Mercedes', 'German');
const RBR = team('red_bull', 'Red Bull', 'Austrian');

const race = (
  season: number,
  round: number,
  name: string,
  date: string,
  extra: object = {},
  country = 'Country',
) => ({
  season: String(season),
  round: String(round),
  raceName: name,
  Circuit: {
    circuitId: `c${round}`,
    circuitName: `${name} Circuit`,
    Location: { locality: 'City', country },
  },
  date,
  time: '13:00:00Z',
  ...extra,
});

const races: Record<number, object[]> = {
  2026: [
    race(2026, 1, 'Australian Grand Prix', '2026-03-08', {}, 'Australia'),
    race(
      2026,
      2,
      'Chinese Grand Prix',
      '2026-03-15',
      { Sprint: { date: '2026-03-14', time: '03:00:00Z' } },
      'China',
    ),
    race(2026, 3, 'Japanese Grand Prix', '2026-03-29', {}, 'Japan'),
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
    number: '63',
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
    number: '12',
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
    number: '3',
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
      DriverTable: { Drivers: d ? [{ ...d, dateOfBirth: '1998-02-15' }] : [] },
    });
  }
  if ((m = path.match(/^\/drivers\/(\w+)\/results\/1\/$/))) return mr(m[1] === 'russell' ? 8 : 0, {});
  if ((m = path.match(/^\/drivers\/(\w+)\/results\/([23])\/$/))) return mr(m[1] === 'russell' ? 5 : 2, {});
  if ((m = path.match(/^\/drivers\/(\w+)\/qualifying\/1\/$/))) return mr(m[1] === 'russell' ? 6 : 9, {});
  if ((m = path.match(/^\/drivers\/(\w+)\/fastest\/1\/results\/$/)))
    return mr(m[1] === 'russell' ? 3 : 4, {});
  if ((m = path.match(/^\/drivers\/(\w+)\/seasons\/$/))) {
    const years = m[1] === 'max_verstappen' ? ['2025', '2026'] : ['2026'];
    return mr(years.length, { SeasonTable: { Seasons: years.map((season) => ({ season })) } });
  }
  if ((m = path.match(/^\/drivers\/(\w+)\/constructors\/$/))) {
    const t = m[1] === 'max_verstappen' ? RBR : MER;
    return mr(1, { ConstructorTable: { Constructors: [t] } });
  }
  if ((m = path.match(/^\/(\d{4})\/drivers\/(\w+)\/driverstandings\/$/))) {
    const rows = (driverStandings[+m[1]] ?? []) as Array<{ Driver: { driverId: string } }>;
    const own = rows.filter((r) => r.Driver.driverId === m![2]);
    return mr(own.length, {
      StandingsTable: {
        StandingsLists: own.length ? [{ season: m[1], round: '1', DriverStandings: own }] : [],
      },
    });
  }
  if ((m = path.match(/^\/constructors\/(\w+)\/results\/2\/$/))) {
    // One second place in a race the team also won: a 1–2 finish.
    const won = {
      season: '2025',
      round: '2',
      raceName: 'Chinese Grand Prix',
      Results: [{ position: '2', Driver: ANT }],
    };
    return mr(40, { RaceTable: { Races: m[1] === 'mercedes' ? [won] : [] } });
  }
  if ((m = path.match(/^\/constructors\/(\w+)\/results\/3\/$/))) return mr(40, {});
  if ((m = path.match(/^\/constructors\/(\w+)\/qualifying\/1\/$/))) return mr(120, {});
  if ((m = path.match(/^\/constructors\/(\w+)\/races\/$/))) return mr(330, {});
  if ((m = path.match(/^\/constructors\/(\w+)\/fastest\/1\/results\/$/))) return mr(101, {});
  if ((m = path.match(/^\/constructors\/(\w+)\/drivers\/$/))) {
    const ds = m[1] === 'mercedes' ? [ANT, RUS] : [VER];
    return mr(m[1] === 'mercedes' ? 2 : 1, { DriverTable: { Drivers: ds } });
  }
  if ((m = path.match(/^\/constructors\/(\w+)\/seasons\/$/))) {
    return mr(2, { SeasonTable: { Seasons: [{ season: '2025' }, { season: '2026' }] } });
  }
  if ((m = path.match(/^\/(\d{4})\/constructors\/(\w+)\/constructorstandings\/$/))) {
    const t = m[2] === 'mercedes' ? MER : RBR;
    return mr(1, {
      StandingsTable: {
        StandingsLists: [
          {
            season: m[1],
            round: '1',
            ConstructorStandings: [{ position: '1', points: '43', wins: '1', Constructor: t }],
          },
        ],
      },
    });
  }
  if ((m = path.match(/^\/(\d{4})\/(\d+)\/pitstops\/$/))) {
    const stops =
      m[2] === '1'
        ? [
            { driverId: 'russell', stop: '1', lap: '20', time: '14:30:00', duration: '22.910' },
            { driverId: 'max_verstappen', stop: '1', lap: '21', time: '14:31:40', duration: '21.874' },
          ]
        : [];
    return mr(stops.length, { RaceTable: { Races: [{ season: m[1], round: m[2], PitStops: stops }] } });
  }
  if ((m = path.match(/^\/drivers\/(\w+)\/results\/$/))) return mr(170, {});
  if ((m = path.match(/^\/(\d{4})\/drivers\/(\w+)\/results\/$/))) {
    const own = results.filter((x) => x.Driver.driverId === m![2]);
    return mr(own.length, { RaceTable: { Races: own.length ? [{ ...r1, Results: own }] : [] } });
  }
  if ((m = path.match(/^\/constructors\/(\w+)\/$/))) {
    const t = allTeams.find((x) => x.constructorId === m![1]);
    return mr(t ? 1 : 0, { ConstructorTable: { Constructors: t ? [t] : [] } });
  }
  if ((m = path.match(/^\/constructors\/(\w+)\/results\/1\/$/))) {
    const wins =
      m[1] === 'mercedes'
        ? [
            {
              season: '2025',
              round: '2',
              raceName: 'Chinese Grand Prix',
              Results: [{ position: '1', Driver: RUS }],
            },
            {
              season: '2014',
              round: '1',
              raceName: 'Australian Grand Prix',
              Results: [{ position: '1', Driver: RUS }],
            },
          ]
        : [];
    return mr(143, { RaceTable: { Races: wins } });
  }
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
// Wikimedia: Russell's article has a photo, the Mercedes car photo exists; nothing else does.
const PHOTO_SVG = (w: number, h: number, color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${color}"/></svg>`;

const PHOTOS: Record<string, [string, number, number]> = {
  'File:Russell test.jpg': ['portrait.svg', 480, 640],
  'File:FIA F1 Austria 2026 Nr. 12 Antonelli (1).jpg': ['car.svg', 900, 450],
};

async function mockWikimedia(page: Page): Promise<void> {
  const cors = { 'Access-Control-Allow-Origin': '*' };
  await page.route('https://en.wikipedia.org/w/api.php**', (route) => {
    const title = new URL(route.request().url()).searchParams.get('titles') ?? '';
    const pageimage = title.startsWith('George Russell') ? 'Russell test.jpg' : undefined;
    return route.fulfill({
      contentType: 'application/json',
      headers: cors,
      body: JSON.stringify({ query: { pages: [{ title, ...(pageimage ? { pageimage } : {}) }] } }),
    });
  });
  await page.route('https://commons.wikimedia.org/w/api.php**', (route) => {
    const title = new URL(route.request().url()).searchParams.get('titles') ?? '';
    const k = PHOTOS[title];
    const info = k
      ? {
          title,
          imagerepository: 'local',
          imageinfo: [
            {
              thumburl: `https://upload.wikimedia.org/test/${k[0]}`,
              thumbwidth: k[1],
              thumbheight: k[2],
              descriptionurl: `https://commons.wikimedia.org/wiki/${title}`,
              extmetadata: {
                Artist: { value: '<a href="https://example.org">Test Photographer</a>' },
                LicenseShortName: { value: 'CC BY-SA 4.0' },
                LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
              },
            },
          ],
        }
      : { title, missing: true };
    return route.fulfill({
      contentType: 'application/json',
      headers: cors,
      body: JSON.stringify({ query: { pages: [info] } }),
    });
  });
  await page.route('https://upload.wikimedia.org/test/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: route.request().url().endsWith('car.svg')
        ? PHOTO_SVG(900, 450, '#2a6f68')
        : PHOTO_SVG(480, 640, '#5a4a7a'),
    }),
  );
}

export async function mockApi(page: Page, override?: Override): Promise<string[]> {
  const calls: string[] = [];
  await page.clock.setFixedTime(NOW);
  await mockWikimedia(page);
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
