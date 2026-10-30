// Visual regression runner: `node scripts/test-visual.mjs` compares,
// `node scripts/test-visual.mjs --update` rewrites the baselines.
import { spawnSync } from 'node:child_process';

const update = process.argv.includes('--update');
const args = ['playwright', 'test', '--config', 'playwright.visual.config.ts'];
if (update) args.push('--update-snapshots');

const res = spawnSync('npx', args, { stdio: 'inherit', shell: true });
process.exit(res.status ?? 1);
