import { defineConfig } from 'vitest/config';

// Live API contract checks: `npm run test:contract`. Kept out of `npm test`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/contract/**/*.contract.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // One file, sequential: stay well inside the API rate limit.
    fileParallelism: false,
  },
});
