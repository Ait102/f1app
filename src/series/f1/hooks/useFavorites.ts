// Favourite drivers and teams, kept in localStorage (per browser, per ТЗ first step).
import { useCallback, useSyncExternalStore } from 'react';

export type FavKind = 'drivers' | 'constructors';
interface Favorites {
  drivers: string[];
  constructors: string[];
}

const KEY = 'racinghub:f1:favorites';
const EVENT = 'racinghub:f1:favorites-change';
const EMPTY: Favorites = { drivers: [], constructors: [] };

let cachedRaw: string | null | undefined;
let cachedValue: Favorites = EMPTY;

function sanitize(v: unknown): Favorites {
  const r = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const ids = (x: unknown) =>
    Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string' && /^[a-z0-9_]+$/i.test(s)) : [];
  return { drivers: ids(r.drivers), constructors: ids(r.constructors) };
}

export function readFavorites(): Favorites {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  // Stable snapshot for useSyncExternalStore: same string → same object.
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = raw ? sanitize(JSON.parse(raw)) : EMPTY;
  } catch {
    cachedValue = EMPTY;
  }
  return cachedValue;
}

function writeFavorites(next: Favorites): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: favourites just don't persist */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function toggleFavorite(kind: FavKind, id: string): void {
  const cur = readFavorites();
  const list = cur[kind];
  writeFavorites({ ...cur, [kind]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb); // other tabs
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

export function useFavorites() {
  const favs = useSyncExternalStore(subscribe, readFavorites, () => EMPTY);
  const isFav = useCallback((kind: FavKind, id: string) => favs[kind].includes(id), [favs]);
  return { favs, isFav, toggle: toggleFavorite };
}
