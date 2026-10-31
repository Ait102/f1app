// Turns raw Jolpica (Ergast-compatible) JSON into the internal model.
// Every accessor is defensive: unknown shapes become null, never invented data.
import type {
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
  Session,
  SessionKind,
} from './types';

type Rec = Record<string, unknown>;

export function rec(v: unknown): Rec {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {};
}

export function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown): string | null {
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

/** Parses numbers that the API sends as strings ("25", "4.5"). */
export function num(v: unknown): number | null {
  const s = str(v);
  if (s === null) return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function mapSeasons(items: unknown[]): Season[] {
  const seen = new Set<number>();
  const out: Season[] = [];
  for (const item of items) {
    const year = num(rec(item).season);
    if (year === null || !Number.isInteger(year) || seen.has(year)) continue;
    seen.add(year);
    out.push({ year, label: `Сезон ${year}` });
  }
  return out.sort((a, b) => b.year - a.year);
}

export function mapDriver(v: unknown): Driver | null {
  const r = rec(v);
  const id = str(r.driverId);
  if (!id) return null;
  return {
    id,
    givenName: str(r.givenName) ?? '',
    familyName: str(r.familyName) ?? id,
    code: str(r.code),
    number: str(r.permanentNumber),
    nationality: str(r.nationality),
    url: str(r.url),
  };
}

export function mapConstructor(v: unknown): Constructor | null {
  const r = rec(v);
  const id = str(r.constructorId);
  if (!id) return null;
  return {
    id,
    name: str(r.name) ?? id,
    nationality: str(r.nationality),
    url: str(r.url),
  };
}

const SESSION_FIELDS: Array<[string, SessionKind, string]> = [
  ['FirstPractice', 'FP1', 'Практика 1'],
  ['SecondPractice', 'FP2', 'Практика 2'],
  ['ThirdPractice', 'FP3', 'Практика 3'],
  ['SprintQualifying', 'SprintQualifying', 'Спринт-квалификация'],
  ['SprintShootout', 'SprintQualifying', 'Спринт-квалификация'],
  ['Sprint', 'Sprint', 'Спринт'],
  ['Qualifying', 'Qualifying', 'Квалификация'],
];

function sessionSortKey(s: Session): string {
  return `${s.date ?? '9999-99-99'}T${s.time ?? '99:99:99'}`;
}

export function mapRace(v: unknown): RaceEvent | null {
  const r = rec(v);
  const seasonYear = num(r.season);
  const round = num(r.round);
  if (seasonYear === null || round === null) return null;
  const circuit = rec(r.Circuit);
  const location = rec(circuit.Location);
  const date = str(r.date);
  const time = str(r.time);

  const sessions: Session[] = [];
  for (const [field, kind, label] of SESSION_FIELDS) {
    if (!(field in r)) continue;
    if (sessions.some((s) => s.kind === kind)) continue;
    const s = rec(r[field]);
    sessions.push({ kind, label, date: str(s.date), time: str(s.time) });
  }
  sessions.push({ kind: 'Race', label: 'Гонка', date, time });
  sessions.sort((a, b) => sessionSortKey(a).localeCompare(sessionSortKey(b)));

  return {
    seasonYear,
    round,
    name: str(r.raceName) ?? `Этап ${round}`,
    circuitId: str(circuit.circuitId),
    circuitName: str(circuit.circuitName),
    locality: str(location.locality),
    country: str(location.country),
    url: str(r.url),
    date,
    time,
    sessions,
    hasSprint: sessions.some((s) => s.kind === 'Sprint'),
  };
}

export function mapRaces(items: unknown[]): RaceEvent[] {
  return items
    .map(mapRace)
    .filter((r): r is RaceEvent => r !== null)
    .sort((a, b) => a.round - b.round);
}

export function mapRaceResults(items: unknown[]): RaceResult[] {
  const out: RaceResult[] = [];
  for (const item of items) {
    const r = rec(item);
    const driver = mapDriver(r.Driver);
    if (!driver) continue;
    out.push({
      number: str(r.number),
      position: num(r.position),
      positionText: str(r.positionText),
      driver,
      constructor: mapConstructor(r.Constructor),
      grid: num(r.grid),
      laps: num(r.laps),
      status: str(r.status),
      time: str(rec(r.Time).time),
      points: num(r.points),
    });
  }
  return out;
}

export function mapQualifying(items: unknown[]): QualifyingResult[] {
  const out: QualifyingResult[] = [];
  for (const item of items) {
    const r = rec(item);
    const driver = mapDriver(r.Driver);
    if (!driver) continue;
    out.push({
      position: num(r.position),
      driver,
      constructor: mapConstructor(r.Constructor),
      q1: str(r.Q1),
      q2: str(r.Q2),
      q3: str(r.Q3),
    });
  }
  return out;
}

export function mapDriverStandings(items: unknown[]): DriverStanding[] {
  const out: DriverStanding[] = [];
  for (const item of items) {
    const r = rec(item);
    const driver = mapDriver(r.Driver);
    if (!driver) continue;
    out.push({
      position: num(r.position),
      positionText: str(r.positionText),
      driver,
      constructors: arr(r.Constructors)
        .map(mapConstructor)
        .filter((c): c is Constructor => c !== null),
      points: num(r.points),
      wins: num(r.wins),
    });
  }
  return out;
}

export function mapConstructorStandings(items: unknown[]): ConstructorStanding[] {
  const out: ConstructorStanding[] = [];
  for (const item of items) {
    const r = rec(item);
    const constructor = mapConstructor(r.Constructor);
    if (!constructor) continue;
    out.push({
      position: num(r.position),
      positionText: str(r.positionText),
      constructor,
      points: num(r.points),
      wins: num(r.wins),
    });
  }
  return out;
}

export function mapDriverProfile(v: unknown): DriverProfile | null {
  const d = mapDriver(v);
  return d ? { ...d, dateOfBirth: str(rec(v).dateOfBirth) } : null;
}

export function mapCircuit(v: unknown): Circuit | null {
  const r = rec(v);
  const id = str(r.circuitId);
  if (!id) return null;
  const loc = rec(r.Location);
  return {
    id,
    name: str(r.circuitName) ?? id,
    locality: str(loc.locality),
    country: str(loc.country),
    lat: num(loc.lat),
    long: num(loc.long),
    url: str(r.url),
  };
}

/**
 * Paged result lists split rows, not races, so one race can arrive on two
 * pages. Joins them back by season+round, keeping source order.
 */
export function mergeRacesByRound(items: unknown[], resultsField = 'Results'): RaceWithResults[] {
  const byKey = new Map<string, RaceWithResults>();
  for (const item of items) {
    const race = mapRace(item);
    if (!race) continue;
    const key = `${race.seasonYear}:${race.round}`;
    const results = mapRaceResults(arr(rec(item)[resultsField]));
    const existing = byKey.get(key);
    if (existing) existing.results.push(...results);
    else byKey.set(key, { race, results });
  }
  return [...byKey.values()].sort(
    (a, b) => a.race.seasonYear - b.race.seasonYear || a.race.round - b.race.round,
  );
}

/** Full years between birth date and `at`; null when the date is unknown. */
export function ageAt(dateOfBirth: string | null, at: Date): number | null {
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const [y, m, d] = dateOfBirth.split('-').map(Number);
  let age = at.getUTCFullYear() - y;
  if (at.getUTCMonth() + 1 < m || (at.getUTCMonth() + 1 === m && at.getUTCDate() < d)) age--;
  return age;
}

export function driverName(d: Driver): string {
  return `${d.givenName} ${d.familyName}`.trim();
}

export function mapPitStops(items: unknown[]): PitStop[] {
  const out: PitStop[] = [];
  for (const item of items) {
    const r = rec(item);
    const driverId = str(r.driverId);
    if (!driverId) continue;
    out.push({ driverId, stop: num(r.stop), lap: num(r.lap), time: str(r.time), duration: str(r.duration) });
  }
  return out;
}
