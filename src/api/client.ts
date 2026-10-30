// The only module that talks HTTP. Handles timeouts, HTTP errors, 429,
// broken JSON, an in-memory cache and a localStorage fallback with the last
// successful response.
import type { DataMeta, Fetched } from './types';

type ApiErrorKind = 'network' | 'timeout' | 'http' | 'rate-limit' | 'parse';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly retryAfterSec?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number, retryAfterSec?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.retryAfterSec = retryAfterSec;
  }
}

export function describeError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Не удалось загрузить данные.';
  switch (e.kind) {
    case 'network':
      return 'Нет соединения с источником данных. Проверьте интернет и повторите.';
    case 'timeout':
      return 'Источник данных не ответил вовремя.';
    case 'rate-limit':
      return e.retryAfterSec
        ? `Превышен лимит запросов к API (HTTP 429). Повторите через ${e.retryAfterSec} с.`
        : 'Превышен лимит запросов к API (HTTP 429). Повторите немного позже.';
    case 'http':
      return `Источник данных вернул ошибку HTTP ${e.status ?? ''}.`.replace(' .', '.');
    case 'parse':
      return 'Источник данных вернул некорректный ответ.';
  }
}

export function parseRetryAfter(value: string | null, nowMs: number): number | undefined {
  if (!value) return undefined;
  const secs = Number(value);
  if (Number.isFinite(secs) && secs >= 0) return Math.ceil(secs);
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, Math.ceil((date - nowMs) / 1000));
  return undefined;
}

interface CacheEntry {
  raw: unknown;
  fetchedAt: number;
}

export interface ClientOptions {
  fetchFn?: typeof fetch;
  now?: () => number;
  storage?: Storage | null;
  timeoutMs?: number;
  ttlMs?: number;
  /** Minimal gap between request starts, to respect the source's rate limit. */
  minIntervalMs?: number;
  /** Base URL of the data source, e.g. https://api.jolpi.ca/ergast/f1 */
  baseUrl: string;
  /** Source name shown next to the data, e.g. "Jolpica-F1". */
  provider: string;
}

export interface GetOptions {
  /** Skip the fresh in-memory cache (user pressed "refresh"). */
  force?: boolean;
}

const STORAGE_PREFIX = 'racinghub:v1:';

function defaultStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function createClient(options: ClientOptions) {
  const fetchFn = options.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const now = options.now ?? (() => Date.now());
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const timeoutMs = options.timeoutMs ?? 12_000;
  const ttlMs = options.ttlMs ?? 10 * 60 * 1000;
  const minIntervalMs = options.minIntervalMs ?? 260;
  const { baseUrl, provider } = options;

  const memory = new Map<string, CacheEntry>();
  const inflight = new Map<string, Promise<Fetched<unknown>>>();
  let nextSlot = 0;

  async function throttle(): Promise<void> {
    if (minIntervalMs <= 0) return;
    const t = now();
    const wait = Math.max(0, nextSlot - t);
    nextSlot = Math.max(t, nextSlot) + minIntervalMs;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }

  function readStored(url: string): CacheEntry | null {
    if (!storage) return null;
    try {
      const text = storage.getItem(STORAGE_PREFIX + url);
      if (!text) return null;
      const parsed = JSON.parse(text) as CacheEntry;
      return typeof parsed.fetchedAt === 'number' ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeStored(url: string, entry: CacheEntry): void {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_PREFIX + url, JSON.stringify(entry));
    } catch {
      // Quota or private mode: the fallback is optional.
    }
  }

  function meta(url: string, fetchedAt: number, stale: boolean, error?: unknown): DataMeta {
    return {
      provider,
      sourceUrl: url,
      fetchedAt: new Date(fetchedAt).toISOString(),
      stale,
      ...(stale ? { staleReason: describeError(error) } : {}),
    };
  }

  async function request(url: string): Promise<unknown> {
    await throttle();
    const ctrl = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, timeoutMs);
    let res: Response;
    try {
      res = await fetchFn(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    } catch {
      clearTimeout(timer);
      if (timedOut) throw new ApiError('timeout', 'Request timed out');
      throw new ApiError('network', 'Network error');
    }
    try {
      if (res.status === 429) {
        throw new ApiError(
          'rate-limit',
          'Rate limited',
          429,
          parseRetryAfter(res.headers.get('Retry-After'), now()),
        );
      }
      if (!res.ok) throw new ApiError('http', `HTTP ${res.status}`, res.status);
      let text: string;
      try {
        text = await res.text();
      } catch {
        throw new ApiError(timedOut ? 'timeout' : 'network', 'Body read failed');
      }
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new ApiError('parse', 'Invalid JSON');
      }
      const mr = (json as { MRData?: unknown } | null)?.MRData;
      if (!mr || typeof mr !== 'object') throw new ApiError('parse', 'Missing MRData');
      return json;
    } finally {
      clearTimeout(timer);
    }
  }

  function get(path: string, opts: GetOptions = {}): Promise<Fetched<unknown>> {
    const url = baseUrl + path;
    const cached = memory.get(url);
    if (!opts.force && cached && now() - cached.fetchedAt < ttlMs) {
      return Promise.resolve({ data: cached.raw, meta: meta(url, cached.fetchedAt, false) });
    }
    const pending = inflight.get(url);
    if (pending) return pending;

    const p = (async () => {
      try {
        const raw = await request(url);
        const entry = { raw, fetchedAt: now() };
        memory.set(url, entry);
        writeStored(url, entry);
        return { data: raw, meta: meta(url, entry.fetchedAt, false) };
      } catch (e) {
        const fallback = cached ?? readStored(url);
        if (fallback) return { data: fallback.raw, meta: meta(url, fallback.fetchedAt, true, e) };
        throw e;
      } finally {
        inflight.delete(url);
      }
    })();
    inflight.set(url, p);
    return p;
  }

  return { get, clearMemory: () => memory.clear() };
}

export type ApiClient = ReturnType<typeof createClient>;
