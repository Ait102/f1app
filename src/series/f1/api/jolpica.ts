// Jolpica-F1 endpoints mapped to the internal model.
import { ApiError, createClient, type ApiClient, type GetOptions } from '../../../api/client';
import type { DataMeta, Fetched } from '../../../api/types';
import { addCounts, CONSTRUCTORS_CUP_FROM } from '../domain/career';
import {
  arr,
  mapCircuit,
  mapConstructor,
  mapConstructorStandings,
  mapDriver,
  mapDriverProfile,
  mapDriverStandings,
  mapPitStops,
  mapQualifying,
  mapRace,
  mapRaceResults,
  mapRaces,
  mapSeasons,
  mergeRacesByRound,
  num,
  rec,
} from '../domain/mappers';
import type { RoundStandings } from '../domain/progress';
import type {
  CareerCounts,
  Circuit,
  Constructor,
  ConstructorStanding,
  Driver,
  DriverProfile,
  DriverStanding,
  PitStop,
  QualifyingResult,
  RaceEvent,
  RaceResult,
  RaceWithResults,
  Season,
  SeasonHistory,
  SeasonStanding,
  Standings,
  TeamCareer,
} from '../domain/types';

export const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';
export const JOLPICA_PROVIDER = 'Jolpica-F1';

/** Shared client for the app; Jolpica allows ~4 requests per second without a token. */
const jolpicaClient = createClient({ baseUrl: JOLPICA_BASE, provider: JOLPICA_PROVIDER, minIntervalMs: 260 });

const PAGE_LIMIT = 100;
const MAX_PAGES = 20;

type MR = Record<string, unknown>;

function mergeMeta(metas: DataMeta[]): DataMeta {
  const first = metas[0];
  const stale = metas.find((m) => m.stale);
  const oldest = metas.reduce((a, m) => (m.fetchedAt < a ? m.fetchedAt : a), first.fetchedAt);
  return { ...first, fetchedAt: oldest, stale: Boolean(stale), staleReason: stale?.staleReason };
}

/** Loads every page of a list endpoint and concatenates the picked items. */
async function getPaged(
  api: ApiClient,
  path: string,
  pick: (mr: MR) => unknown[],
  opts?: GetOptions,
): Promise<Fetched<{ mr: MR; items: unknown[] }>> {
  const items: unknown[] = [];
  const metas: DataMeta[] = [];
  let first: MR | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_LIMIT;
    const res = await api.get(`${path}?limit=${PAGE_LIMIT}&offset=${offset}`, opts);
    const mr = rec(rec(res.data).MRData);
    first ??= mr;
    metas.push(res.meta);
    const picked = pick(mr);
    items.push(...picked);
    const total = num(mr.total) ?? 0;
    if (picked.length === 0 || offset + PAGE_LIMIT >= total) break;
  }
  return { data: { mr: first ?? {}, items }, meta: mergeMeta(metas) };
}

const racesOf = (mr: MR) => arr(rec(mr.RaceTable).Races);
const firstRace = (mr: MR) => rec(racesOf(mr)[0]);
const standingsList = (mr: MR) => rec(arr(rec(mr.StandingsTable).StandingsLists)[0]);

function seasonPath(season: number | string): string {
  const s = String(season);
  if (!/^\d{4}$/.test(s)) throw new Error(`Invalid season: ${s}`);
  return `/${s}`;
}

function roundPath(season: number | string, round: number | string): string {
  const r = String(round);
  if (!/^\d{1,2}$/.test(r)) throw new Error(`Invalid round: ${r}`);
  return `${seasonPath(season)}/${r}`;
}

function idPath(kind: 'drivers' | 'constructors' | 'circuits', id: string): string {
  if (!/^[a-z0-9_]+$/i.test(id)) throw new Error(`Invalid ${kind} id: ${id}`);
  return `/${kind}/${id}`;
}

/** A finished season: its final tables no longer change. */
function isPastSeason(year: number): boolean {
  return year < new Date().getFullYear();
}

function yearsOf(items: unknown[]): number[] {
  return mapSeasons(items)
    .map((s) => s.year)
    .sort((a, b) => a - b);
}

/**
 * Runs `load` for every season in order, reporting progress. Seasons that fail
 * are listed, not guessed; rate limiting stops the run instead of hammering the API.
 */
async function seasonBySeason(
  seasons: number[],
  opts: { onProgress?: (done: number, total: number) => void } | undefined,
  load: (year: number) => Promise<{ row: SeasonStanding; meta: DataMeta }>,
): Promise<Fetched<SeasonHistory>> {
  const rows: SeasonStanding[] = [];
  const failed: number[] = [];
  const metas: DataMeta[] = [];
  let firstError: unknown = null;
  for (let i = 0; i < seasons.length; i++) {
    try {
      const { row, meta } = await load(seasons[i]);
      rows.push(row);
      metas.push(meta);
    } catch (e) {
      failed.push(seasons[i]);
      firstError ??= e;
      if (e instanceof ApiError && e.kind === 'rate-limit') {
        failed.push(...seasons.slice(i + 1));
        break;
      }
    }
    opts?.onProgress?.(i + 1, seasons.length);
  }
  if (seasons.length > 0 && metas.length === 0) throw firstError ?? new Error('No standings');
  const meta: DataMeta = metas.length
    ? mergeMeta(metas)
    : {
        provider: JOLPICA_PROVIDER,
        sourceUrl: JOLPICA_BASE,
        fetchedAt: new Date().toISOString(),
        stale: false,
      };
  return { data: { rows, failed }, meta };
}

/** Reads only `total` of a list: how many rows the source has. */
async function count(api: ApiClient, path: string, opts?: GetOptions): Promise<Fetched<number | null>> {
  const res = await api.get(`${path}?limit=1`, opts);
  return { data: num(rec(rec(res.data).MRData).total), meta: res.meta };
}

export function createJolpica(api: ApiClient = jolpicaClient) {
  /** A past season is over; the current one only when its standings cover every round of the calendar. */
  async function isFinal(year: number, round: number | null, opts?: GetOptions): Promise<boolean> {
    if (isPastSeason(year)) return true;
    if (round === null) return false;
    const races = await count(api, `${seasonPath(year)}/races/`, opts);
    return races.data !== null && round >= races.data;
  }

  return {
    async getDriver(id: string, opts?: GetOptions): Promise<Fetched<DriverProfile | null>> {
      const res = await api.get(`${idPath('drivers', id)}/`, opts);
      const mr = rec(rec(res.data).MRData);
      return { data: mapDriverProfile(arr(rec(mr.DriverTable).Drivers)[0]), meta: res.meta };
    },

    async getDriverSeasonResults(
      season: number,
      id: string,
      opts?: GetOptions,
    ): Promise<Fetched<RaceWithResults[]>> {
      const res = await getPaged(
        api,
        `${seasonPath(season)}${idPath('drivers', id)}/results/`,
        racesOf,
        opts,
      );
      return { data: mergeRacesByRound(res.data.items), meta: res.meta };
    },

    async getDriverCareer(id: string, opts?: GetOptions): Promise<Fetched<CareerCounts>> {
      const base = idPath('drivers', id);
      const [starts, wins, p2, p3, poles, fastest, seasons, teams] = await Promise.all([
        count(api, `${base}/results/`, opts),
        count(api, `${base}/results/1/`, opts),
        count(api, `${base}/results/2/`, opts),
        count(api, `${base}/results/3/`, opts),
        count(api, `${base}/qualifying/1/`, opts),
        count(api, `${base}/fastest/1/results/`, opts),
        getPaged(api, `${base}/seasons/`, (mr) => arr(rec(mr.SeasonTable).Seasons), opts),
        getPaged(api, `${base}/constructors/`, (mr) => arr(rec(mr.ConstructorTable).Constructors), opts),
      ]);
      return {
        data: {
          starts: starts.data,
          wins: wins.data,
          podiums: addCounts(wins.data, p2.data, p3.data),
          poles: poles.data,
          fastestLaps: fastest.data,
          seasons: yearsOf(seasons.data.items),
          teams: teams.data.items.map(mapConstructor).filter((c): c is Constructor => c !== null),
        },
        meta: mergeMeta([starts, wins, p2, p3, poles, fastest, seasons, teams].map((x) => x.meta)),
      };
    },

    /** Final championship row for each given season (one request per season). */
    async getDriverHistory(
      id: string,
      seasons: number[],
      opts?: GetOptions & { onProgress?: (done: number, total: number) => void },
    ): Promise<Fetched<SeasonHistory>> {
      return seasonBySeason(seasons, opts, async (year) => {
        const res = await getPaged(
          api,
          `${seasonPath(year)}${idPath('drivers', id)}/driverstandings/`,
          (mr) => arr(standingsList(mr).DriverStandings),
          { ...opts, immutable: isPastSeason(year) },
        );
        const row = mapDriverStandings(res.data.items)[0];
        const final = await isFinal(year, num(standingsList(res.data.mr).round), opts);
        const standing: SeasonStanding = {
          final,
          season: year,
          position: row?.position ?? null,
          positionText: row?.positionText ?? null,
          points: row?.points ?? null,
          wins: row?.wins ?? null,
          teams: row?.constructors ?? [],
        };
        return { row: standing, meta: res.meta };
      });
    },

    async getConstructor(id: string, opts?: GetOptions): Promise<Fetched<Constructor | null>> {
      const res = await api.get(`${idPath('constructors', id)}/`, opts);
      const mr = rec(rec(res.data).MRData);
      return { data: mapConstructor(arr(rec(mr.ConstructorTable).Constructors)[0]), meta: res.meta };
    },

    async getConstructorSeason(
      season: number,
      id: string,
      opts?: GetOptions,
    ): Promise<Fetched<{ drivers: Driver[]; races: RaceWithResults[] }>> {
      const base = `${seasonPath(season)}${idPath('constructors', id)}`;
      const drivers = await getPaged(api, `${base}/drivers/`, (mr) => arr(rec(mr.DriverTable).Drivers), opts);
      const results = await getPaged(api, `${base}/results/`, racesOf, opts);
      return {
        data: {
          drivers: drivers.data.items.map(mapDriver).filter((d): d is Driver => d !== null),
          races: mergeRacesByRound(results.data.items),
        },
        meta: mergeMeta([drivers.meta, results.meta]),
      };
    },

    async getConstructorCareer(id: string, opts?: GetOptions): Promise<Fetched<TeamCareer>> {
      const base = idPath('constructors', id);
      const [wins, p2, p3, poles, drivers, seasons] = await Promise.all([
        count(api, `${base}/results/1/`, opts),
        count(api, `${base}/results/2/`, opts),
        count(api, `${base}/results/3/`, opts),
        count(api, `${base}/qualifying/1/`, opts),
        count(api, `${base}/drivers/`, opts),
        getPaged(api, `${base}/seasons/`, (mr) => arr(rec(mr.SeasonTable).Seasons), opts),
      ]);
      return {
        data: {
          wins: wins.data,
          podiums: addCounts(wins.data, p2.data, p3.data),
          poles: poles.data,
          drivers: drivers.data,
          seasons: yearsOf(seasons.data.items),
        },
        meta: mergeMeta([wins, p2, p3, poles, drivers, seasons].map((x) => x.meta)),
      };
    },

    /** Constructors' championship row for each season from 1958 on (one request per season). */
    async getConstructorHistory(
      id: string,
      seasons: number[],
      opts?: GetOptions & { onProgress?: (done: number, total: number) => void },
    ): Promise<Fetched<SeasonHistory>> {
      return seasonBySeason(
        seasons.filter((y) => y >= CONSTRUCTORS_CUP_FROM),
        opts,
        async (year) => {
          const res = await getPaged(
            api,
            `${seasonPath(year)}${idPath('constructors', id)}/constructorstandings/`,
            (mr) => arr(standingsList(mr).ConstructorStandings),
            { ...opts, immutable: isPastSeason(year) },
          );
          const row = mapConstructorStandings(res.data.items)[0];
          const final = await isFinal(year, num(standingsList(res.data.mr).round), opts);
          const standing: SeasonStanding = {
            final,
            season: year,
            position: row?.position ?? null,
            positionText: row?.positionText ?? null,
            points: row?.points ?? null,
            wins: row?.wins ?? null,
            teams: row ? [row.constructor] : [],
          };
          return { row: standing, meta: res.meta };
        },
      );
    },

    async getPitStops(season: number, round: number, opts?: GetOptions): Promise<Fetched<PitStop[]>> {
      const res = await getPaged(
        api,
        `${roundPath(season, round)}/pitstops/`,
        (mr) => arr(firstRace(mr).PitStops),
        opts,
      );
      return { data: mapPitStops(res.data.items), meta: res.meta };
    },

    async getCircuit(id: string, opts?: GetOptions): Promise<Fetched<Circuit | null>> {
      const res = await api.get(`${idPath('circuits', id)}/`, opts);
      const mr = rec(rec(res.data).MRData);
      return { data: mapCircuit(arr(rec(mr.CircuitTable).Circuits)[0]), meta: res.meta };
    },

    async getCircuitWinners(id: string, opts?: GetOptions): Promise<Fetched<RaceWithResults[]>> {
      const res = await getPaged(api, `${idPath('circuits', id)}/results/1/`, racesOf, opts);
      return { data: mergeRacesByRound(res.data.items), meta: res.meta };
    },

    async getSeasons(opts?: GetOptions): Promise<Fetched<Season[]>> {
      const res = await getPaged(api, '/seasons/', (mr) => arr(rec(mr.SeasonTable).Seasons), opts);
      return { data: mapSeasons(res.data.items), meta: res.meta };
    },

    async getRaces(season: number, opts?: GetOptions): Promise<Fetched<RaceEvent[]>> {
      const res = await getPaged(api, `${seasonPath(season)}/races/`, racesOf, opts);
      return { data: mapRaces(res.data.items), meta: res.meta };
    },

    async getRaceResults(
      season: number,
      round: number,
      opts?: GetOptions,
    ): Promise<Fetched<{ race: RaceEvent | null; results: RaceResult[] }>> {
      const res = await getPaged(
        api,
        `${roundPath(season, round)}/results/`,
        (mr) => arr(firstRace(mr).Results),
        opts,
      );
      return {
        data: { race: mapRace(firstRace(res.data.mr)), results: mapRaceResults(res.data.items) },
        meta: res.meta,
      };
    },

    async getSprintResults(season: number, round: number, opts?: GetOptions): Promise<Fetched<RaceResult[]>> {
      const res = await getPaged(
        api,
        `${roundPath(season, round)}/sprint/`,
        (mr) => arr(firstRace(mr).SprintResults),
        opts,
      );
      return { data: mapRaceResults(res.data.items), meta: res.meta };
    },

    async getQualifying(
      season: number,
      round: number,
      opts?: GetOptions,
    ): Promise<Fetched<QualifyingResult[]>> {
      const res = await getPaged(
        api,
        `${roundPath(season, round)}/qualifying/`,
        (mr) => arr(firstRace(mr).QualifyingResults),
        opts,
      );
      return { data: mapQualifying(res.data.items), meta: res.meta };
    },

    async getDriverStandings(season: number, opts?: GetOptions): Promise<Fetched<Standings<DriverStanding>>> {
      const res = await getPaged(
        api,
        `${seasonPath(season)}/driverstandings/`,
        (mr) => arr(standingsList(mr).DriverStandings),
        opts,
      );
      return {
        data: {
          seasonYear: season,
          round: num(standingsList(res.data.mr).round),
          rows: mapDriverStandings(res.data.items),
        },
        meta: res.meta,
      };
    },

    /**
     * Loads standings after every round 1..lastRound (one request per round,
     * throttled and cached by the client). Rounds that fail are reported, not guessed.
     */
    async getStandingsProgress(
      season: number,
      lastRound: number,
      opts?: GetOptions & { onProgress?: (done: number, total: number) => void },
    ): Promise<Fetched<{ rounds: RoundStandings[]; failed: number[]; firstError: unknown }>> {
      const rounds: RoundStandings[] = [];
      const failed: number[] = [];
      const metas: DataMeta[] = [];
      let firstError: unknown = null;
      for (let r = 1; r <= lastRound; r++) {
        try {
          const res = await getPaged(
            api,
            `${roundPath(season, r)}/driverstandings/`,
            (mr) => arr(standingsList(mr).DriverStandings),
            opts,
          );
          const rows = mapDriverStandings(res.data.items);
          if (rows.length) rounds.push({ round: r, rows });
          else failed.push(r);
          metas.push(res.meta);
        } catch (e) {
          failed.push(r);
          firstError ??= e;
          // Stop on rate limiting instead of hammering the API.
          if (e instanceof ApiError && e.kind === 'rate-limit') {
            for (let k = r + 1; k <= lastRound; k++) failed.push(k);
            break;
          }
        }
        opts?.onProgress?.(r, lastRound);
      }
      if (metas.length === 0) throw firstError ?? new Error('No standings');
      return { data: { rounds, failed, firstError }, meta: mergeMeta(metas) };
    },

    async getConstructorStandings(
      season: number,
      opts?: GetOptions,
    ): Promise<Fetched<Standings<ConstructorStanding>>> {
      const res = await getPaged(
        api,
        `${seasonPath(season)}/constructorstandings/`,
        (mr) => arr(standingsList(mr).ConstructorStandings),
        opts,
      );
      return {
        data: {
          seasonYear: season,
          round: num(standingsList(res.data.mr).round),
          rows: mapConstructorStandings(res.data.items),
        },
        meta: res.meta,
      };
    },
  };
}

export const jolpica = createJolpica();
