import { getArticlePhoto, getCommonsPhoto, plainText, wikiTitle } from './wikimedia';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

const fileInfo = (over: Record<string, unknown> = {}, meta: Record<string, unknown> = {}) => ({
  query: {
    pages: [
      {
        imagerepository: 'local',
        imageinfo: [
          {
            thumburl: 'https://upload.wikimedia.org/x/600px-a.jpg',
            thumbwidth: 600,
            thumbheight: 400,
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:A.jpg',
            extmetadata: {
              Artist: { value: '<a href="x">Jane  Doe</a>' },
              LicenseShortName: { value: 'CC BY-SA 4.0' },
              LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
              ...meta,
            },
            ...over,
          },
        ],
      },
    ],
  },
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('wikimedia helpers', () => {
  it('reads article titles only from Wikipedia links', () => {
    expect(wikiTitle('http://en.wikipedia.org/wiki/George_Russell_(racing_driver)')).toBe(
      'George Russell (racing driver)',
    );
    expect(wikiTitle('https://en.wikipedia.org/wiki/Kimi_R%C3%A4ikk%C3%B6nen')).toBe('Kimi Räikkönen');
    expect(wikiTitle('https://example.org/wiki/X')).toBeNull();
    expect(wikiTitle(null)).toBeNull();
    expect(wikiTitle('not a url')).toBeNull();
  });

  it('turns author HTML into plain text', () => {
    expect(plainText('<a href="x">Lukas  Raich</a>')).toBe('Lukas Raich');
    expect(plainText('')).toBeNull();
  });
});

describe('getCommonsPhoto', () => {
  it('returns the scaled photo with its attribution', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(fileInfo())),
    );
    const p = await getCommonsPhoto('A1.jpg', 600);
    expect(p).toEqual({
      src: 'https://upload.wikimedia.org/x/600px-a.jpg',
      width: 600,
      height: 400,
      pageUrl: 'https://commons.wikimedia.org/wiki/File:A.jpg',
      artist: 'Jane Doe',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    });
  });

  it('skips missing, non-free and foreign files', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ query: { pages: [{ missing: true }] } })),
    );
    expect(await getCommonsPhoto('A2.jpg')).toBeNull();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(fileInfo({}, { NonFree: { value: 'true' } }))),
    );
    expect(await getCommonsPhoto('A3.jpg')).toBeNull();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(fileInfo({ thumburl: 'https://evil.example/a.jpg' }))),
    );
    expect(await getCommonsPhoto('A4.jpg')).toBeNull();
  });

  it('caches the answer for the next visit', async () => {
    const f = vi.fn(async () => json(fileInfo()));
    vi.stubGlobal('fetch', f);
    await getCommonsPhoto('A5.jpg');
    await getCommonsPhoto('A5.jpg');
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe('getArticlePhoto', () => {
  it('uses the article image and can keep photos only', async () => {
    const f = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes('en.wikipedia.org')
        ? json({
            query: { pages: [{ pageimage: String(url).includes('Logo') ? 'Team logo.svg' : 'Car.jpg' }] },
          })
        : json(fileInfo()),
    );
    vi.stubGlobal('fetch', f);
    expect(await getArticlePhoto('Some Car')).not.toBeNull();
    expect(await getArticlePhoto('Logo Team', { photosOnly: true })).toBeNull();
  });
});
