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
      return 'Источник данных не ответил. Проверьте интернет; если он есть — скорее всего, исчерпан лимит запросов к API (500 в час), повторите через несколько минут.';
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

interface ClientOptions {
  fetchFn?: typeof fetch;
  now?: () => number;
  storage?: Storage | null;
  timeoutMs?: number;
  ttlMs?: number;
  /** Minimal gap between request starts, to respect the source's rate limit. */
  minIntervalMs?: number;
  /** Extra attempts after 429, a network error, a timeout or HTTP 5xx. */
  retries?: number;
  /** First pause before a retry; doubles every attempt unless the source says how long to wait. */
  retryBaseMs?: number;
  /** A longer wait (e.g. the hourly limit is used up) is not worth retrying: the error is shown instead. */
  maxRetryWaitMs?: number;
  /** Base URL of the data source, e.g. https://api.jolpi.ca/ergast/f1 */
  baseUrl: string;
  /** Source name shown next to the data, e.g. "Jolpica-F1". */
  provider: string;
}

export interface GetOptions {
  /** Skip the fresh in-memory cache (user pressed "refresh"). */
  force?: boolean;
  /**
   * The data cannot change any more (e.g. final standings of a past season):
   * a saved copy is used without asking the source again. Saves the rate limit.
   */
  immutable?: boolean;
  /** How old a saved copy may be to be used without a request (default: the client's TTL). */
  maxAgeMs?: number;
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
  const minIntervalMs = options.minIntervalMs ?? 300;
  const retries = options.retries ?? 3;
  const retryBaseMs = options.retryBaseMs ?? 1000;
  const maxRetryWaitMs = options.maxRetryWaitMs ?? 20_000;
  const { baseUrl, provider } = options;

  const memory = new Map<string, CacheEntry>();
  const inflight = new Map<string, Promise<Fetched<unknown>>>();
  let nextSlot = 0;

  async function throttle(): Promise<void> {
    if (minIntervalMs <= 0) return;
    // Monotonic clock: pacing must not depend on wall-clock changes (or a frozen clock in tests).
    const t = performance.now();
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

  /** Pauses the whole queue, so the requests behind this one do not hit the limit too. */
  function pauseQueue(ms: number): void {
    nextSlot = Math.max(nextSlot, performance.now() + ms);
  }

  function retryable(e: unknown): e is ApiError {
    if (!(e instanceof ApiError)) return false;
    if (e.kind === 'http') return (e.status ?? 0) >= 500;
    return e.kind === 'rate-limit' || e.kind === 'network' || e.kind === 'timeout';
  }

  async function requestWithRetry(url: string): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await request(url);
      } catch (e) {
        if (attempt >= retries || !retryable(e)) throw e;
        const wait =
          e.retryAfterSec !== undefined
            ? e.retryAfterSec * 1000
            : retryBaseMs * 2 ** attempt * (1 + Math.random() * 0.25);
        if (wait > maxRetryWaitMs) throw e;
        if (e.kind === 'rate-limit') pauseQueue(wait);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
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
        let retryAfter = parseRetryAfter(res.headers.get('Retry-After'), now());
        if (retryAfter === undefined) {
          // Jolpica has no Retry-After header but may say "Expected available in N seconds".
          const body = await res.text().catch(() => '');
          const m = /available in (\d+) second/i.exec(body);
          if (m) retryAfter = Number(m[1]);
        }
        throw new ApiError('rate-limit', 'Rate limited', 429, retryAfter);
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
    const maxAge = opts.immutable ? Infinity : (opts.maxAgeMs ?? ttlMs);
    const fresh = (e: CacheEntry) => now() - e.fetchedAt < maxAge;
    if (!opts.force && cached && fresh(cached)) {
      return Promise.resolve({ data: cached.raw, meta: meta(url, cached.fetchedAt, false) });
    }
    // A fresh enough copy saved by an earlier visit saves a request (the hourly limit is small).
    if (!opts.force) {
      const stored = readStored(url);
      if (stored && fresh(stored)) {
        memory.set(url, stored);
        return Promise.resolve({ data: stored.raw, meta: meta(url, stored.fetchedAt, false) });
      }
    }
    const pending = inflight.get(url);
    if (pending) return pending;

    const p = (async () => {
      try {
        const raw = await requestWithRetry(url);
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

  return { get };
}

export type ApiClient = ReturnType<typeof createClient>;
