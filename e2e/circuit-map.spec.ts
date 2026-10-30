import { expect, test } from '@playwright/test';
import { mockApi } from './fixtures';

// The default fixtures use synthetic circuit ids, so this spec serves its own
// race list with a real circuit id to exercise the outline.
const race = (round: number, name: string, date: string) => ({
  season: '2026',
  round: String(round),
  raceName: name,
  Circuit: {
    circuitId: 'silverstone',
    circuitName: 'Silverstone Circuit',
    Location: { locality: 'Silverstone', country: 'United Kingdom' },
  },
  date,
  time: '14:00:00Z',
});

const racesBody = JSON.stringify({
  MRData: {
    limit: '100',
    offset: '0',
    total: '2',
    RaceTable: {
      season: '2026',
      Races: [race(1, 'British Grand Prix', '2026-07-05'), race(2, 'Hungarian Grand Prix', '2026-07-19')],
    },
  },
});

test('race page shows the circuit outline', async ({ page }) => {
  await mockApi(page, (path) =>
    path === '/2026/races/'
      ? { status: 200, headers: { 'content-type': 'application/json' }, body: racesBody }
      : null,
  );

  await page.goto('./#/2026/race/1');
  await expect(page.getByRole('heading', { level: 1, name: 'British Grand Prix' })).toBeVisible();

  const panel = page.locator('.circuit-panel');
  await expect(panel.getByRole('heading', { name: 'Схема трассы' })).toBeVisible();
  await expect(panel.locator('path').first()).toHaveAttribute('d', /^M\d/);
  await expect(panel.getByRole('img')).toHaveAccessibleName(/Silverstone Circuit: 18 поворотов, длина 5\.891 км/);
  await expect(panel.getByText('5.891 км')).toBeVisible();
  await expect(panel.getByText('18')).toBeVisible();
});

test('modern layout is not shown for an older season', async ({ page }) => {
  // The stored Silverstone outline is the 2010+ one, so a 1990s race must show no map.
  const seasonsBody = JSON.stringify({
    MRData: {
      limit: '100',
      offset: '0',
      total: '3',
      SeasonTable: { Seasons: [{ season: '1998' }, { season: '2025' }, { season: '2026' }] },
    },
  });
  const oldRaces = JSON.stringify({
    MRData: {
      limit: '100',
      offset: '0',
      total: '1',
      RaceTable: {
        season: '1998',
        Races: [{ ...race(1, 'British Grand Prix', '1998-07-12'), season: '1998' }],
      },
    },
  });

  await mockApi(page, (path) => {
    if (path === '/seasons/') return { status: 200, headers: { 'content-type': 'application/json' }, body: seasonsBody };
    if (path === '/1998/races/') return { status: 200, headers: { 'content-type': 'application/json' }, body: oldRaces };
    return null;
  });

  await page.goto('./#/1998/race/1');
  await expect(page.getByRole('heading', { level: 1, name: 'British Grand Prix' })).toBeVisible();
  await expect(page.locator('.circuit-panel')).toHaveCount(0);
});
