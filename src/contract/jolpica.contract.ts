// Contract checks against the LIVE Jolpica API (not part of `npm test`).
// They fail when the API is down or its JSON changes in a way our mappers no longer understand.
// Run: npm run test:contract
import { beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '../api/client';
import { createJolpica } from '../api/jolpica';
import type { RaceEvent } from '../domain/types';

// Slower pace than the app (≈2 req/s), no browser storage.
const client = createClient({ storage: null, minIntervalMs: 500, timeoutMs: 20_000 });
const api = createJolpica(client);

type Rec = Record<string, unknown>;
const mrOf = (raw: unknown) => (raw as { MRData: Rec }).MRData;

let season: number;
let races: RaceEvent[];
let lastRound: number | null;

beforeAll(async () => {
  const seasons = await api.getSeasons();
  expect(seasons.data.length, 'список сезонов пуст').toBeGreaterThan(70);
  season = seasons.data[0].year;
  races = (await api.getRaces(season)).data;
  lastRound = (await api.getDriverStandings(season)).data.round;
});

describe(`Jolpica-F1: контракт API`, () => {
  it('последний сезон актуален', () => {
    expect(season, 'в API нет текущего или прошлого сезона').toBeGreaterThanOrEqual(new Date().getUTCFullYear() - 1);
  });

  it('календарь разбирается без потерь', async () => {
    const raw = await client.get(`/${season}/races/?limit=100&offset=0`);
    const rawRaces = (mrOf(raw.data).RaceTable as Rec).Races as unknown[];
    expect(rawRaces.length, 'календарь пуст').toBeGreaterThan(0);
    expect(races.length, 'маппер отбросил часть этапов — формат календаря изменился').toBe(rawRaces.length);
    for (const r of races) {
      expect(r.round).toBeGreaterThan(0);
      expect(r.date, `у этапа ${r.round} нет даты`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.name).not.toMatch(/^Этап \d+$/); // raceName read
      expect(r.circuitId, `у этапа ${r.round} нет трассы`).toBeTruthy();
    }
  });

  it('личный зачёт: позиции и очки — числа', async () => {
    const ds = (await api.getDriverStandings(season)).data;
    if (lastRound === null) return; // season not started yet
    expect(ds.rows.length).toBeGreaterThan(10);
    for (const r of ds.rows) {
      expect(typeof r.points, `очки ${r.driver.id} не разобраны`).toBe('number');
      expect(typeof r.wins).toBe('number');
      expect(r.driver.familyName).toBeTruthy();
    }
    expect(ds.rows[0].position).toBe(1);
  });

  it('кубок конструкторов: позиции и очки — числа', async () => {
    const cs = (await api.getConstructorStandings(season)).data;
    if (lastRound === null) return;
    expect(cs.rows.length).toBeGreaterThan(5);
    for (const r of cs.rows) expect(typeof r.points, `очки ${r.constructor.id} не разобраны`).toBe('number');
  });

  it('результаты гонки разбираются без потерь', async () => {
    const round = lastRound ?? 1;
    const year = lastRound === null ? season - 1 : season;
    const raw = await client.get(`/${year}/${round}/results/?limit=100&offset=0`);
    const rawRows = (((mrOf(raw.data).RaceTable as Rec).Races as Rec[])[0]?.Results as unknown[]) ?? [];
    const res = (await api.getRaceResults(year, round)).data;
    expect(rawRows.length, 'результатов нет').toBeGreaterThan(10);
    expect(res.results.length, 'маппер отбросил строки результатов').toBe(rawRows.length);
    expect(res.results[0].position).toBe(1);
    expect(typeof res.results[0].points).toBe('number');
    expect(res.results[0].constructor).not.toBeNull();
  });

  it('профили пилота и трассы читаются', async () => {
    const ds = (await api.getDriverStandings(lastRound === null ? season - 1 : season)).data;
    const leader = ds.rows[0].driver.id;
    const driver = (await api.getDriver(leader)).data;
    expect(driver?.id).toBe(leader);
    const career = (await api.getDriverCareer(leader)).data;
    expect(career.starts, 'число гонок пилота не прочитано').toBeGreaterThan(0);

    const circuitId = races[0].circuitId!;
    const circuit = (await api.getCircuit(circuitId)).data;
    expect(circuit?.name).toBeTruthy();
    expect(circuit?.lat, 'нет координат трассы').not.toBeNull();
  });
});
