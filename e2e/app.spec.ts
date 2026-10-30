import { expect, test } from '@playwright/test';
import { mockApi } from './fixtures';

test('opens the latest season with next race and leaders', async ({ page }) => {
  await mockApi(page);
  await page.goto('./');
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
  for (const path of ['./#/2026', './#/2026/calendar', './#/2026/race/1', './#/2026/drivers', './#/2026/driver/russell', './#/2026/constructor/mercedes', './#/2026/circuit/c1', './#/2026/chart']) {
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
          headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Retry-After', 'Retry-After': '3' },
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
  await expect(page.getByText('Гонки (с учётом сходов)')).toBeVisible();
  await expect(page.locator('.stat', { hasText: 'Победы' }).last()).toContainText('8');
  await expect(page.locator('table tbody tr')).toHaveCount(1);

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
  await expect(page.getByRole('button', { name: /Убрать .* из избранного/ })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('./#/2026');
  await expect(page.getByRole('heading', { name: /Избранное/ })).toBeVisible();

  await page.goto('./#/2026/drivers');
  await expect(page.locator('tr.row--fav')).toHaveCount(1);
  await expect(page.locator('tr.row--fav')).toContainText('Verstappen');

  // Survives reload.
  await page.reload();
  await expect(page.locator('tr.row--fav')).toHaveCount(1);
});
