// Jolpica-F1 endpoints mapped to the internal model.
import {
  arr,
  mapConstructorStandings,
  mapDriverStandings,
  mapQualifying,
  mapRace,
  mapRaceResults,
  mapRaces,
  mapSeasons,
  num,
  rec,
} from '../domain/mappers';
import type {
  ConstructorStanding,
  DataMeta,
  DriverStanding,
  Fetched,
  QualifyingResult,
  RaceEvent,
  RaceResult,
  Season,
  Standings,
} from '../domain/types';
import { client as defaultClient, type ApiClient, type GetOptions } from './client';

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
export async function getPaged(
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

export function seasonPath(season: number | string): string {
  const s = String(season);
  if (!/^\d{4}$/.test(s)) throw new Error(`Invalid season: ${s}`);
  return `/${s}`;
}

function roundPath(season: number | string, round: number | string): string {
  const r = String(round);
  if (!/^\d{1,2}$/.test(r)) throw new Error(`Invalid round: ${r}`);
  return `${seasonPath(season)}/${r}`;
}

export function createJolpica(api: ApiClient = defaultClient) {
  return {
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
      const res = await getPaged(api, `${roundPath(season, round)}/results/`, (mr) => arr(firstRace(mr).Results), opts);
      return {
        data: { race: mapRace(firstRace(res.data.mr)), results: mapRaceResults(res.data.items) },
        meta: res.meta,
      };
    },

    async getSprintResults(season: number, round: number, opts?: GetOptions): Promise<Fetched<RaceResult[]>> {
      const res = await getPaged(api, `${roundPath(season, round)}/sprint/`, (mr) => arr(firstRace(mr).SprintResults), opts);
      return { data: mapRaceResults(res.data.items), meta: res.meta };
    },

    async getQualifying(season: number, round: number, opts?: GetOptions): Promise<Fetched<QualifyingResult[]>> {
      const res = await getPaged(api, `${roundPath(season, round)}/qualifying/`, (mr) => arr(firstRace(mr).QualifyingResults), opts);
      return { data: mapQualifying(res.data.items), meta: res.meta };
    },

    async getDriverStandings(season: number, opts?: GetOptions): Promise<Fetched<Standings<DriverStanding>>> {
      const res = await getPaged(api, `${seasonPath(season)}/driverstandings/`, (mr) => arr(standingsList(mr).DriverStandings), opts);
      return {
        data: { seasonYear: season, round: num(standingsList(res.data.mr).round), rows: mapDriverStandings(res.data.items) },
        meta: res.meta,
      };
    },

    async getConstructorStandings(season: number, opts?: GetOptions): Promise<Fetched<Standings<ConstructorStanding>>> {
      const res = await getPaged(api, `${seasonPath(season)}/constructorstandings/`, (mr) => arr(standingsList(mr).ConstructorStandings), opts);
      return {
        data: { seasonYear: season, round: num(standingsList(res.data.mr).round), rows: mapConstructorStandings(res.data.items) },
        meta: res.meta,
      };
    },
  };
}

export const jolpica = createJolpica();
