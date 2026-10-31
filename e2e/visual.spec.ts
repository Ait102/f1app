import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures';

// Opt-in: `npm run test:visual` (see playwright.visual.config.ts).

const ROUTES = [
  './',
  './#/wec',
  './#/2026',
  './#/2026/calendar',
  './#/2026/race/1',
  './#/2026/drivers',
  './#/2026/constructors',
  './#/2026/chart',
  './#/2026/driver/russell',
  './#/2026/constructor/mercedes',
  './#/2026/circuit/c1',
  './#/2026/about',
  './#/2026/compare?a=russell&b=max_verstappen',
];

test('pages match the baselines', async ({ page }) => {
  test.setTimeout(300_000);
  // The site drops its entrance animations for reduced motion: screenshots stay stable.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockApi(page);

  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    for (const route of ROUTES) {
      await page.goto(route);
      await page.locator('main h1').waitFor();
      await page.waitForLoadState('networkidle');
      // skeletons are replaced by content; wait for them to go away before shooting
      await page
        .locator('.skeleton')
        .first()
        .waitFor({ state: 'detached' })
        .catch(() => {});
      // Photos arrive after the page itself: wait until each one is shown (or gone).
      await page.waitForFunction(() => !document.querySelector('figure.photo:not(.is-loaded)'));
      // Fonts, flags and team logos must be in place before the shot.
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images].map((img) => {
            img.loading = 'eager'; // lazy images below the fold would never load otherwise
            if (img.complete) return null;
            return new Promise((r) => {
              img.addEventListener('load', r, { once: true });
              img.addEventListener('error', r, { once: true });
            });
          }),
        );
      });
      await page.waitForTimeout(1200);
      await expect(page).toHaveScreenshot(`w${width}${route.replace(/[^a-z0-9]+/gi, '-')}.png`, {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixels: 0,
      });
    }
  }
});
