import { ApiError, createClient, describeError, parseRetryAfter } from './client';
import { createJolpica } from './jolpica';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const MR = (extra: object = {}) => ({ MRData: { total: '0', ...extra } });

function setup(fetchFn: typeof fetch, extra: Parameters<typeof createClient>[0] = {}) {
  let t = 1_000_000;
  const storage = memoryStorage();
  const client = createClient({ fetchFn, storage, minIntervalMs: 0, baseUrl: 'https://x', now: () => t, ...extra });
  return { client, storage, advance: (ms: number) => (t += ms) };
}

describe('client.get', () => {
  it('returns data with meta on success', async () => {
    const { client } = setup(vi.fn(async () => ok(MR())));
    const r = await client.get('/2026/races/');
    expect(r.meta.provider).toBe('Jolpica-F1');
    expect(r.meta.sourceUrl).toBe('https://x/2026/races/');
    expect(r.meta.stale).toBe(false);
  });

  it('caches in memory and refetches on force or after TTL', async () => {
    const f = vi.fn(async () => ok(MR()));
    const { client, advance } = setup(f);
    await client.get('/a');
    await client.get('/a');
    expect(f).toHaveBeenCalledTimes(1);
    await client.get('/a', { force: true });
    expect(f).toHaveBeenCalledTimes(2);
    advance(11 * 60 * 1000);
    await client.get('/a');
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('dedupes concurrent requests', async () => {
    const f = vi.fn(async () => ok(MR()));
    const { client } = setup(f);
    await Promise.all([client.get('/a'), client.get('/a')]);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('maps HTTP errors', async () => {
    const { client } = setup(vi.fn(async () => new Response('x', { status: 500 })));
    await expect(client.get('/a')).rejects.toMatchObject({ kind: 'http', status: 500 });
  });

  it('maps 429 with Retry-After', async () => {
    const { client } = setup(vi.fn(async () => new Response('', { status: 429, headers: { 'Retry-After': '7' } })));
    const err = await client.get('/a').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.kind).toBe('rate-limit');
    expect(err.retryAfterSec).toBe(7);
    expect(describeError(err)).toMatch(/7 с/);
  });

  it('maps invalid JSON and missing MRData to parse errors', async () => {
    const a = setup(vi.fn(async () => new Response('<html>', { status: 200 })));
    await expect(a.client.get('/a')).rejects.toMatchObject({ kind: 'parse' });
    const b = setup(vi.fn(async () => ok({ foo: 1 })));
    await expect(b.client.get('/a')).rejects.toMatchObject({ kind: 'parse' });
  });

  it('maps network failure', async () => {
    const { client } = setup(vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(client.get('/a')).rejects.toMatchObject({ kind: 'network' });
  });

  it('times out', async () => {
    const hanging = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    ) as unknown as typeof fetch;
    const { client } = setup(hanging, { timeoutMs: 20 });
    await expect(client.get('/a')).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('falls back to the last saved response and marks it stale', async () => {
    let fail = false;
    const f = vi.fn(async () => (fail ? Promise.reject(new TypeError('offline')) : ok(MR({ x: 1 }))));
    const { client, storage } = setup(f);
    await client.get('/a');
    fail = true;

    // Same session: memory copy.
    const r1 = await client.get('/a', { force: true });
    expect(r1.meta.stale).toBe(true);
    expect(r1.meta.staleReason).toMatch(/соединения/);

    // New session: localStorage copy.
    const fresh = createClient({ fetchFn: f, storage, minIntervalMs: 0, baseUrl: 'https://x' });
    const r2 = await fresh.get('/a');
    expect(r2.meta.stale).toBe(true);
    expect(r2.data).toEqual(MR({ x: 1 }));
  });
});

describe('parseRetryAfter', () => {
  it('handles seconds, dates and junk', () => {
    expect(parseRetryAfter('3', 0)).toBe(3);
    expect(parseRetryAfter(new Date(10_000).toUTCString(), 0)).toBe(10);
    expect(parseRetryAfter('soon', 0)).toBeUndefined();
    expect(parseRetryAfter(null, 0)).toBeUndefined();
  });
});

describe('pagination', () => {
  it('loads all pages of standings', async () => {
    const row = (i: number) => ({ position: String(i), points: '1', Driver: { driverId: `d${i}`, familyName: `D${i}` } });
    const f = vi.fn(async (url: RequestInfo | URL) => {
      const offset = Number(new URL(String(url)).searchParams.get('offset'));
      const rows = Array.from({ length: offset === 0 ? 100 : 5 }, (_, i) => row(offset + i + 1));
      return ok({ MRData: { total: '105', StandingsTable: { StandingsLists: [{ round: '18', DriverStandings: rows }] } } });
    }) as unknown as typeof fetch;
    const { client } = setup(f);
    const api = createJolpica(client);
    const res = await api.getDriverStandings(2026);
    expect(res.data.rows).toHaveLength(105);
    expect(res.data.round).toBe(18);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid season paths', async () => {
    const { client } = setup(vi.fn());
    await expect(createJolpica(client).getRaces(20 as number)).rejects.toThrow(/Invalid season/);
  });
});

describe('profile endpoints', () => {
  it('reads career counts from list totals', async () => {
    const f = vi.fn(async (url: RequestInfo | URL) =>
      ok({ MRData: { total: String(url).includes('/results/1/') ? '8' : '170' } }),
    ) as unknown as typeof fetch;
    const { client } = setup(f);
    const res = await createJolpica(client).getDriverCareer('russell');
    expect(res.data).toEqual({ wins: 8, starts: 170 });
  });

  it('rejects unsafe ids', async () => {
    const { client } = setup(vi.fn());
    await expect(createJolpica(client).getDriver('../x')).rejects.toThrow(/Invalid drivers id/);
  });
});
