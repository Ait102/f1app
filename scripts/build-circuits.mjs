// Generates src/data/circuits/{map.ts,shapes/*.ts} from F1DB (https://github.com/f1db/f1db, CC BY 4.0).
//
// Run once, the result is committed so the app builds offline:
//   node scripts/build-circuits.mjs

import { mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const REPO = 'https://raw.githubusercontent.com/f1db/f1db/main';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'src/data/circuits');

// Jolpica circuitId -> F1DB circuit slug. Jolpica and F1DB name the same track
// differently often enough that this table is written by hand.
const MAP = {
  adelaide: 'adelaide',
  'ain-diab': 'ain-diab',
  aintree: 'aintree',
  albert_park: 'melbourne',
  americas: 'austin',
  anderstorp: 'anderstorp',
  avus: 'avus',
  bahrain: 'bahrain',
  baku: 'baku',
  boavista: 'porto',
  brands_hatch: 'brands-hatch',
  bremgarten: 'bremgarten',
  buddh: 'buddh',
  catalunya: 'catalunya',
  charade: 'clermont-ferrand',
  dallas: 'dallas',
  detroit: 'detroit',
  dijon: 'dijon',
  donington: 'donington',
  essarts: 'rouen',
  estoril: 'estoril',
  fuji: 'fuji',
  galvez: 'buenos-aires',
  george: 'east-london',
  hockenheimring: 'hockenheimring',
  hungaroring: 'hungaroring',
  imola: 'imola',
  indianapolis: 'indianapolis',
  interlagos: 'interlagos',
  istanbul: 'istanbul',
  jacarepagua: 'jacarepagua',
  jarama: 'jarama',
  jeddah: 'jeddah',
  jerez: 'jerez',
  kyalami: 'kyalami',
  las_vegas: 'las-vegas',
  lemans: 'bugatti',
  long_beach: 'long-beach',
  losail: 'lusail',
  madring: 'madring',
  magny_cours: 'magny-cours',
  marina_bay: 'marina-bay',
  miami: 'miami',
  monaco: 'monaco',
  monsanto: 'monsanto',
  montjuic: 'montjuic',
  monza: 'monza',
  mosport: 'mosport',
  mugello: 'mugello',
  nivelles: 'nivelles',
  nurburgring: 'nurburgring',
  okayama: 'aida',
  pedralbes: 'pedralbes',
  pescara: 'pescara',
  phoenix: 'phoenix',
  portimao: 'portimao',
  red_bull_ring: 'spielberg',
  reims: 'reims',
  ricard: 'paul-ricard',
  riverside: 'riverside',
  rodriguez: 'mexico-city',
  sebring: 'sebring',
  sepang: 'sepang',
  shanghai: 'shanghai',
  silverstone: 'silverstone',
  spa: 'spa-francorchamps',
  suzuka: 'suzuka',
  tremblant: 'mont-tremblant',
  valencia: 'valencia',
  vegas: 'las-vegas',
  villeneuve: 'montreal',
  watkins_glen: 'watkins-glen',
  yas_marina: 'yas-marina',
  yeongam: 'yeongam',
  zandvoort: 'zandvoort',
  zeltweg: 'zeltweg',
  zolder: 'zolder',
};

const get = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
};

const getOrNull = async (url) => {
  const res = await fetch(url);
  return res.ok ? res.text() : null;
};

/** Outline path from the F1DB white-outline SVG (a single `<path>` per file). */
function outline(svg) {
  const m = svg.match(/\sd="([^"]+)"/);
  if (!m) throw new Error('no path in svg');
  return m[1].replace(/\s+/g, ' ').trim();
}

/**
 * Years from a layout comment: "1950-1954, 1956, 1958-1960, 1971, 1975-present".
 * Returns [from, to] pairs; `to` is 9999 for "present".
 */
function eras(comment) {
  const text = comment.replace(/^#\s*/, '');
  const out = [];
  const re = /(\d{4})(?:\s*[-–]\s*(\d{4}|present))?/g;
  let m;
  while ((m = re.exec(text))) {
    const from = Number(m[1]);
    const to = m[2] ? (m[2] === 'present' ? 9999 : Number(m[2])) : from;
    out.push([from, to]);
  }
  return out;
}

/** Layouts of one circuit, in F1DB order. */
function parseLayouts(yml) {
  const [head, ...rest] = yml.split('\nlayouts:');
  const direction = /direction:\s*(\w+)/.exec(head)?.[1] === 'ANTI_CLOCKWISE' ? 'anticlockwise' : 'clockwise';
  const blocks = rest.join('\nlayouts:').split(/^\s*-\s+id:\s*/m).slice(1);
  return blocks.map((b) => {
    const [firstLine, ...tail] = b.split('\n');
    const id = firstLine.match(/^([\w-]+)/)[1];
    const comment = firstLine.includes('#') ? `#${firstLine.split('#').slice(1).join('#')}` : '';
    const body = tail.join('\n');
    return {
      id,
      eras: eras(comment),
      lengthKm: Number(/length:\s*([\d.]+)/.exec(body)?.[1]),
      turns: Number(/turns:\s*(\d+)/.exec(body)?.[1]),
      direction,
    };
  });
}

const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n));

async function mapLimit(items, limit, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

// ---- build ----

await rm(resolve(OUT_DIR, 'shapes'), { recursive: true, force: true });
await mkdir(resolve(OUT_DIR, 'shapes'), { recursive: true });

const slugs = [...new Set(Object.values(MAP))];
let files = 0;
let layoutsTotal = 0;
let bytes = 0;
const skipped = [];

for (const slug of slugs) {
  const yml = await get(`${REPO}/src/data/circuits/${slug}.yml`);
  const layouts = parseLayouts(yml);

  const withOutline = (
    await mapLimit(layouts, 4, async (l) => {
      const svg = await getOrNull(`${REPO}/src/assets/circuits/white-outline/${l.id}.svg`);
      if (!svg) {
        skipped.push(l.id);
        return null;
      }
      return { ...l, d: outline(svg) };
    })
  ).filter(Boolean);

  if (!withOutline.length) {
    console.log(`! ${slug}: no outlines`);
    continue;
  }

  const single = withOutline.length === 1;
  const body = withOutline
    .map((l) => {
      // A layout without a year comment is only trusted when it is the only one.
      const ranges = l.eras.length ? l.eras : single ? [[0, 9999]] : [];
      const erasText = ranges.length ? ranges.map(([a, b]) => `[${a}, ${b}]`).join(', ') : '';
      return `  { eras: [${erasText}], lengthKm: ${fmt(l.lengthKm)}, turns: ${l.turns}, direction: '${l.direction}', d: '${l.d}' },`;
    })
    .join('\n');

  const file = `// Generated by scripts/build-circuits.mjs from F1DB (https://github.com/f1db/f1db).
// Data: CC BY 4.0. Do not edit by hand.

import type { CircuitLayout } from '../types';

export const LAYOUTS: CircuitLayout[] = [
${body}
];
`;

  const target = resolve(OUT_DIR, 'shapes', `${slug}.ts`);
  await writeFile(target, file, 'utf8');
  files++;
  layoutsTotal += withOutline.length;
  bytes += file.length;
  console.log(`${slug.padEnd(20)} ${String(withOutline.length).padStart(2)} layouts  ${(file.length / 1024).toFixed(1)} KB`);
}

const mapBody = Object.entries(MAP)
  .map(([id, slug]) => `  ${JSON.stringify(id)}: ${JSON.stringify(slug)},`)
  .join('\n');

await writeFile(
  resolve(OUT_DIR, 'map.ts'),
  `// Generated by scripts/build-circuits.mjs. Do not edit by hand.

import type { CircuitSlug } from './types';

/** Jolpica circuitId -> F1DB circuit slug. */
export const CIRCUIT_SLUGS: Record<string, CircuitSlug> = {
${mapBody}
};
`,
  'utf8',
);

console.log(
  `\n${files} files, ${layoutsTotal} layouts, ${(bytes / 1024).toFixed(0)} KB source` +
    (skipped.length ? `\nmissing outlines: ${skipped.join(', ')}` : ''),
);
