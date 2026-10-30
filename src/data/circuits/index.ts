import type { CircuitShape } from './types';

export type { CircuitShape } from './types';

/** Jolpica ids that changed spelling over time. */
const ALIASES: Record<string, string> = {
  losail: 'lusail',
  las_vegas: 'vegas',
};

/** The geometry chunk is loaded on demand and cached for the session. */
let cache: Record<string, CircuitShape> | null = null;
let pending: Promise<Record<string, CircuitShape>> | null = null;

export function loadCircuit(id: string | null | undefined): Promise<CircuitShape | null> {
  if (!id) return Promise.resolve(null);
  const key = ALIASES[id] ?? id;
  if (cache) return Promise.resolve(cache[key] ?? null);
  pending ??= import('./data').then((m) => (cache = m.CIRCUITS));
  return pending.then((all) => all[key] ?? null);
}
