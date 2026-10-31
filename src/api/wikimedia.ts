// Free photos from Wikimedia Commons with their attribution (author and licence).
// Only files hosted on Commons are used: everything there is freely licensed, while
// files kept on Wikipedia itself may be non-free (logos, posters) and are skipped.
// A missing photo is never an error: the page simply shows none.

export interface CommonsPhoto {
  /** Scaled image URL. */
  src: string;
  width: number;
  height: number;
  /** File description page on Commons (licence details). */
  pageUrl: string;
  /** Author as plain text; null when Commons does not name one. */
  artist: string | null;
  /** Short licence name, e.g. "CC BY-SA 4.0". */
  license: string;
  licenseUrl: string | null;
}

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const STORAGE_PREFIX = 'racinghub:wm:v2:';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const memory = new Map<string, Promise<unknown>>();

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Memory + localStorage cache; failures are not cached, so a later visit tries again. */
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = memory.get(key);
  if (hit) return hit as Promise<T>;
  const s = storage();
  try {
    const text = s?.getItem(STORAGE_PREFIX + key);
    if (text) {
      const saved = JSON.parse(text) as { at: number; value: T };
      if (Date.now() - saved.at < MAX_AGE_MS) {
        const p = Promise.resolve(saved.value);
        memory.set(key, p);
        return p;
      }
    }
  } catch {
    /* broken entry: load again */
  }
  const p = load().then(
    (value) => {
      try {
        s?.setItem(STORAGE_PREFIX + key, JSON.stringify({ at: Date.now(), value }));
      } catch {
        /* quota: the cache is optional */
      }
      return value;
    },
    (e: unknown) => {
      memory.delete(key);
      throw e;
    },
  );
  memory.set(key, p);
  return p;
}

async function getJson(base: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(base);
  for (const [k, v] of Object.entries({ ...params, format: 'json', formatversion: '2', origin: '*' })) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

/** "<a href=…>Lukas Raich</a>" → "Lukas Raich". */
export function plainText(html: string | undefined): string | null {
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text || null;
}

/** Article title from a Wikipedia link, e.g. http://en.wikipedia.org/wiki/Max_Verstappen. */
export function wikiTitle(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/(^|\.)wikipedia\.org$/.test(u.hostname) || !u.pathname.startsWith('/wiki/')) return null;
    const title = decodeURIComponent(u.pathname.slice('/wiki/'.length)).replace(/_/g, ' ');
    return title || null;
  } catch {
    return null;
  }
}

type Meta = Record<string, { value?: string } | undefined>;

/** A Commons file scaled to `width` px, or null if it is not on Commons. */
export function getCommonsPhoto(file: string, width = 640): Promise<CommonsPhoto | null> {
  const name = file.replace(/^File:/i, '');
  return cached(`file:${name}:${width}`, async () => {
    const data = await getJson(COMMONS_API, {
      action: 'query',
      titles: `File:${name}`,
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
      iiurlwidth: String(width),
      iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|NonFree',
    });
    const page = ((data.query as { pages?: unknown[] } | undefined)?.pages ?? [])[0] as
      { missing?: boolean; imagerepository?: string; imageinfo?: Record<string, unknown>[] } | undefined;
    const info = page?.imageinfo?.[0];
    if (!page || page.missing || page.imagerepository !== 'local' || !info) return null;
    const meta = (info.extmetadata ?? {}) as Meta;
    const license = plainText(meta.LicenseShortName?.value);
    if (!license || meta.NonFree?.value === 'true') return null;
    const src = String(info.thumburl ?? info.url ?? '');
    if (!/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(src)) return null;
    return {
      src,
      width: Number(info.thumbwidth ?? info.width) || width,
      height: Number(info.thumbheight ?? info.height) || width,
      pageUrl: String(info.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:${name}`),
      artist: plainText(meta.Artist?.value),
      license,
      licenseUrl: meta.LicenseUrl?.value ?? null,
    };
  });
}

/**
 * The main image of a Wikipedia article, if it is a free photo on Commons.
 * `photosOnly` skips drawings and logos (SVG/PNG), keeping JPEG photographs.
 */
export async function getArticlePhoto(
  title: string,
  opts: { width?: number; photosOnly?: boolean } = {},
): Promise<CommonsPhoto | null> {
  const file = await cached(`article:${title}`, async () => {
    const data = await getJson(WIKI_API, {
      action: 'query',
      titles: title,
      redirects: '1',
      prop: 'pageimages',
      piprop: 'name',
    });
    const page = ((data.query as { pages?: unknown[] } | undefined)?.pages ?? [])[0] as
      { pageimage?: string } | undefined;
    return page?.pageimage ?? null;
  });
  if (!file) return null;
  if (opts.photosOnly && !/\.jpe?g$/i.test(file)) return null;
  return getCommonsPhoto(file, opts.width);
}
