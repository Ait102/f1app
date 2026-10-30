import { defineConfig } from '@playwright/test';

import base from './playwright.config';

// Opt-in visual regression: `npm run test:visual` (add `-- --update` to rewrite
// baselines). Kept out of `npm run test:e2e` because the baselines depend on the
// OS and the fonts installed on the machine.
export default defineConfig({
  ...base,
  testMatch: 'visual.spec.ts',
  testIgnore: undefined,
  fullyParallel: false,
});
