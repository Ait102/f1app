import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures';

test('start page offers F1 and WEC; F1 opens the latest season', async ({ page }) => {
  await mockApi(page);
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Что смотрим?' })).toBeVisible();
  await expect(page.getByRole('link', { name: /World Endurance Championship/ })).toBeVisible();
  await page.getByRole('link', { name: /Formula 1/ }).click();
  await expect(page).toHaveURL(/#\/2026$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Сезон 2026' })).toBeVisible();
  await expect(page.getByText('Завершено этапов: 1 из 3')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Chinese Grand Prix' })).toBeVisible();
  await expect(page.getByText('Источник:').first()).toBeVisible();
});

test('calendar filter, race page and sorting', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026/calendar');
  await expect(page.getByRole('heading', { name: 'Календарь' })).toBeVisible();
  await expect(page.locator('.race-card')).toHaveCount(3);

  await page.getByRole('button', { name: /^Завершён/ }).click();
  await expect(page.locator('.race-card')).toHaveCount(1);
  await page.getByRole('link', { name: /Australian Grand Prix/ }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Australian Grand Prix' })).toBeVisible();
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText('Russell');

  // Sort by points ascending → lowest first.
  await page.getByRole('button', { name: /Очки/ }).click();
  await expect(rows.first()).toContainText('Verstappen');
});

test('upcoming race shows no results instead of an error', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026/race/3');
  await expect(page.getByText('Этап ещё не состоялся')).toBeVisible();
});

test('switching season replaces the standings', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026/drivers');
  await expect(page.locator('table tbody tr')).toHaveCount(3);

  await page.getByLabel('Сезон').selectOption('2025');
  await expect(page).toHaveURL(/#\/2025\/drivers$/);
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Verstappen');
  await expect(page.getByText('Russell')).toHaveCount(0);
});

test('HTTP 429 shows a clear message and retry recovers', async ({ page }) => {
  // Jolpica doesn't expose Retry-After via CORS, so the app must cope without it.
  let limited = true;
  await mockApi(page, (path) =>
    limited && path.endsWith('/driverstandings/')
      ? { status: 429, headers: { 'Access-Control-Allow-Origin': '*', 'Retry-After': '3' } }
      : null,
  );
  await page.goto('./#/2026/drivers');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('HTTP 429');
  await expect(alert).toContainText('Повторите немного позже');

  limited = false;
  await alert.getByRole('button', { name: 'Повторить' }).click();
  await expect(page.locator('table tbody tr')).toHaveCount(3);
});

test('network failure keeps the UI working', async ({ page }) => {
  await mockApi(page, (path) => (path.includes('/races/') ? { status: 503 } : null));
  await page.goto('./#/2026/calendar');
  await expect(page.getByRole('alert')).toContainText('HTTP 503');
  await expect(page.getByRole('navigation', { name: 'Основная навигация' })).toBeVisible();
});

test('mobile layout has no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockApi(page);
  for (const path of [
    './',
    './#/wec',
    './#/2026',
    './#/2026/calendar',
    './#/2026/race/1',
    './#/2026/drivers',
    './#/2026/driver/russell',
    './#/2026/constructor/mercedes',
    './#/2026/circuit/c1',
    './#/2026/chart',
    './#/2026/compare?a=russell&b=max_verstappen',
  ]) {
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('keyboard: skip link moves focus to content', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Перейти к содержимому' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await expect(page).toHaveURL(/#\/2026$/);
});

test('Retry-After is shown when the server exposes it', async ({ page }) => {
  await mockApi(page, (path) =>
    path.endsWith('/driverstandings/')
      ? {
          status: 429,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Retry-After',
            'Retry-After': '3',
          },
        }
      : null,
  );
  await page.goto('./#/2026/drivers');
  await expect(page.getByRole('alert')).toContainText('3 с');
});

test('driver profile from standings', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026/drivers');
  await page.getByRole('link', { name: /Russell/ }).click();
  await expect(page).toHaveURL(/#\/2026\/driver\/russell$/);
  await expect(page.getByRole('heading', { level: 1, name: 'George Russell' })).toBeVisible();
  // Career: counts from the source, titles only from finished seasons.
  const career = page.locator('.card', { hasText: 'Карьера' });
  await expect(career.locator('.stat', { hasText: 'Победы' })).toContainText('8');
  await expect(career.locator('.stat', { hasText: 'Подиумы' })).toContainText('18');
  await expect(career.locator('.stat', { hasText: 'Поулы' })).toContainText('6');
  // Leading the running 2026 season is not a title.
  await expect(career.locator('.stat', { hasText: 'Титулы' })).toContainText('0');
  await expect(page.locator('.car-number--big')).toHaveText('63');
  await expect(page.locator('.profile-facts img.flag')).toHaveCount(1);
  // Season history: 2026 is marked as running.
  await expect(page.getByRole('table', { name: /Итоги чемпионатов/ }).locator('tbody tr')).toContainText(
    'идёт',
  );

  // Season switch keeps the profile.
  await page.getByLabel('Сезон').selectOption('2025');
  await expect(page).toHaveURL(/#\/2025\/driver\/russell$/);
});

test('constructor profile lists its drivers', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026/constructors');
  await page.locator('table').getByRole('link', { name: 'Mercedes' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mercedes' })).toBeVisible();
  await expect(page.locator('.chip-card')).toHaveCount(2);
  await expect(page.getByRole('columnheader', { name: 'RUS' })).toBeVisible();
});

test('circuit profile from race page shows winners', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026/race/1');
  await page.getByRole('link', { name: 'Australian Grand Prix Circuit' }).click();
  await expect(page).toHaveURL(/#\/2026\/circuit\/c1$/);
  await expect(page.getByRole('link', { name: 'На карте ↗' })).toHaveAttribute('href', /openstreetmap/);
  await expect(page.locator('table tbody tr')).toHaveCount(2);
});

test('unknown driver shows a not-found message', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026/driver/nobody');
  await expect(page.getByRole('heading', { name: 'Пилот не найден' })).toBeVisible();
});

test('championship chart draws lines and a data table', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026');
  await page.getByRole('link', { name: 'График' }).click();
  await expect(page.getByRole('heading', { name: 'Борьба за чемпионство' })).toBeVisible();
  await expect(page.locator('.chart__svg path[data-driver]')).toHaveCount(3);
  await expect(page.locator('.legend li')).toHaveCount(3);
  await page.getByText('Таблица очков по этапам').click();
  await expect(page.locator('.chart-table tbody tr').first()).toContainText('25');
});

test('chart shows an error instead of a partial picture', async ({ page }) => {
  // Fixtures have one finished round; when it fails nothing is drawn.
  await mockApi(page, (path) => (path === '/2026/1/driverstandings/' ? { status: 500 } : null));
  await page.goto('./#/2026/chart');
  await expect(page.getByRole('alert')).toContainText('HTTP 500');
  await expect(page.locator('.chart__svg')).toHaveCount(0);
});

test('favourite from profile shows on home and highlights rows', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026/driver/max_verstappen');
  await page.getByRole('button', { name: /Добавить .* в избранное/ }).click();
  await expect(page.getByRole('button', { name: /Убрать .* из избранного/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.goto('./#/2026');
  await expect(page.getByRole('heading', { name: /Избранное/ })).toBeVisible();

  await page.goto('./#/2026/drivers');
  await expect(page.locator('tr.row--fav')).toHaveCount(1);
  await expect(page.locator('tr.row--fav')).toContainText('Verstappen');

  // Survives reload.
  await page.reload();
  await expect(page.locator('tr.row--fav')).toHaveCount(1);
});

test('WEC section is a placeholder without made-up data', async ({ page }) => {
  await mockApi(page);
  await page.goto('./');
  await page.getByRole('link', { name: /World Endurance Championship/ }).click();
  await expect(page).toHaveURL(/#\/wec$/);
  await expect(page.getByRole('heading', { level: 1, name: /WEC/ })).toBeVisible();
  await expect(page.getByText('Раздел в разработке.')).toBeVisible();
  // No F1 season picker or tables in the WEC section.
  await expect(page.getByLabel('Сезон')).toHaveCount(0);
  await expect(page.locator('table')).toHaveCount(0);
});

test('header switch moves between F1 and WEC', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026/drivers');
  const sw = page.getByRole('navigation', { name: 'Чемпионат' });
  await expect(sw.getByRole('link', { name: 'F1' })).toHaveAttribute('aria-current', 'page');
  await sw.getByRole('link', { name: 'WEC' }).click();
  await expect(page).toHaveURL(/#\/wec$/);
  await expect(sw.getByRole('link', { name: 'WEC' })).toHaveAttribute('aria-current', 'page');
  // Back to F1 keeps the season the user was looking at.
  await sw.getByRole('link', { name: 'F1' }).click();
  await expect(page).toHaveURL(/#\/2026$/);
});

test('driver comparison shows careers and seasons side by side', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026/drivers');
  await page.getByRole('link', { name: 'Сравнить пилотов →' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Сравнение пилотов' })).toBeVisible();
  await page.getByLabel('Пилот 1').selectOption('russell');
  await page.getByLabel('Пилот 2').selectOption('max_verstappen');
  await expect(page).toHaveURL(/compare\?a=russell&b=max_verstappen$/);

  const wins = page.locator('.cmp-row', { hasText: 'Победы' });
  await expect(wins.locator('.cmp-cell--a')).toContainText('8');
  await expect(wins.locator('.cmp-cell--a')).toHaveClass(/is-lead/);
  // Verstappen won the finished 2025 season in the fixtures.
  await expect(page.locator('.cmp-row', { hasText: 'Титулы' }).locator('.cmp-cell--b')).toContainText('1');
  const seasons = page.locator('.cmp-seasons tbody tr');
  await expect(seasons).toHaveCount(2);
  await expect(seasons.nth(1)).toContainText('не выступал');

  // Swap keeps both drivers.
  await page.getByRole('button', { name: 'Поменять пилотов местами' }).click();
  await expect(page).toHaveURL(/a=max_verstappen&b=russell/);
});

test('sprint weekends are marked and can be filtered', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026/calendar');
  await expect(page.locator('.race-card--sprint')).toHaveCount(1);
  await expect(page.locator('.race-card--sprint .sprint-badge')).toBeVisible();
  await page.getByRole('button', { name: /Спринт-уикенды/ }).click();
  await expect(page.locator('.race-card')).toHaveCount(1);
  await expect(page.locator('.race-card')).toContainText('Chinese Grand Prix');
});

test('flags and car numbers', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026/drivers');
  await expect(page.locator('table tbody img.flag')).toHaveCount(3);
  await expect(page.locator('table tbody .car-number').first()).toHaveText('63');
  await page.goto('./#/2026/calendar');
  await expect(page.locator('.race-card img.flag')).toHaveCount(3);
});

test('pit stops tab with the shortest stop', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026/race/1');
  await page.getByRole('tab', { name: 'Пит-стопы' }).click();
  await expect(
    page.getByText(/Самое короткое время в пит-лейне: 21\.874 с — Verstappen, круг 21/),
  ).toBeVisible();
  await expect(page.locator('[role=tabpanel] table tbody tr')).toHaveCount(2);
});

test('team history loads on request', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/2026/constructor/mercedes');
  await expect(page.locator('.stat', { hasText: 'Подиумы' })).toContainText('223');
  await page.getByRole('button', { name: /Показать историю/ }).click();
  await expect(page.getByRole('table', { name: /Итоги чемпионатов/ }).locator('tbody tr')).toHaveCount(2);
});
