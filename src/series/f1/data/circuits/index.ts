import { CIRCUIT_SLUGS } from './map';
import type { CircuitLayout } from './types';

export type { CircuitLayout } from './types';

const shapes = import.meta.glob<{ LAYOUTS: CircuitLayout[] }>('./shapes/*.ts');

const cache = new Map<string, CircuitLayout[]>();

async function layoutsOf(slug: string): Promise<CircuitLayout[]> {
  const cached = cache.get(slug);
  if (cached) return cached;
  const load = shapes[`./shapes/${slug}.ts`];
  if (!load) return [];
  const mod = await load();
  cache.set(slug, mod.LAYOUTS);
  return mod.LAYOUTS;
}

/**
 * Fetches the chunk ahead of time, e.g. when the pointer reaches a race card.
 * Failures are ignored: the map loads on its own when the page needs it.
 */
export function preloadCircuit(circuitId: string | null | undefined): void {
  if (!circuitId) return;
  const slug = CIRCUIT_SLUGS[circuitId];
  if (!slug || cache.has(slug)) return;
  void layoutsOf(slug).catch(() => {});
}

/** Shape of the circuit as it existed in `season`, or null when unknown. */
export async function loadCircuit(
  circuitId: string | null | undefined,
  season: number,
): Promise<CircuitLayout | null> {
  if (!circuitId) return null;
  const slug = CIRCUIT_SLUGS[circuitId];
  if (!slug) return null;

  const layouts = await layoutsOf(slug);
  const hits = layouts.filter((l) => l.eras.some(([from, to]) => season >= from && season <= to));
  return hits.length === 1 ? hits[0] : null;
}

/**
 * Human label of the era, e.g. "с 2010" or "1997–2009".
 * Null when the shape was used in several separate periods — listing them all
 * would not fit the caption, and claiming one range would be wrong.
 */
export function eraLabel(layout: CircuitLayout): string | null {
  if (layout.eras.length !== 1) return null;
  const [from, to] = layout.eras[0];
  if (from === 0) return null;
  if (to === 9999) return `с ${from}`;
  return from === to ? String(from) : `${from}–${to}`;
}
