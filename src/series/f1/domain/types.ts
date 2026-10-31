// Internal normalized model. Not a copy of the API JSON: every field the
// source may omit is nullable, and nothing is filled with made-up values.

export interface Season {
  year: number;
  label: string;
}

export type SessionKind = 'FP1' | 'FP2' | 'FP3' | 'SprintQualifying' | 'Sprint' | 'Qualifying' | 'Race';

export interface Session {
  kind: SessionKind;
  label: string;
  /** YYYY-MM-DD as given by the source. */
  date: string | null;
  /** HH:MM:SSZ in UTC, or null when the source has no time. */
  time: string | null;
}

export interface RaceEvent {
  seasonYear: number;
  round: number;
  name: string;
  circuitId: string | null;
  circuitName: string | null;
  locality: string | null;
  country: string | null;
  url: string | null;
  date: string | null;
  time: string | null;
  sessions: Session[];
  hasSprint: boolean;
}

export interface Driver {
  id: string;
  givenName: string;
  familyName: string;
  code: string | null;
  number: string | null;
  nationality: string | null;
  url: string | null;
}

export interface Constructor {
  id: string;
  name: string;
  nationality: string | null;
  url: string | null;
}

export interface RaceResult {
  /** Car number in this race. */
  number: string | null;
  position: number | null;
  positionText: string | null;
  driver: Driver;
  constructor: Constructor | null;
  grid: number | null;
  laps: number | null;
  status: string | null;
  time: string | null;
  points: number | null;
}

export interface QualifyingResult {
  position: number | null;
  driver: Driver;
  constructor: Constructor | null;
  q1: string | null;
  q2: string | null;
  q3: string | null;
}

export interface DriverStanding {
  position: number | null;
  positionText: string | null;
  driver: Driver;
  constructors: Constructor[];
  points: number | null;
  wins: number | null;
}

export interface ConstructorStanding {
  position: number | null;
  positionText: string | null;
  constructor: Constructor;
  points: number | null;
  wins: number | null;
}

export interface Standings<T> {
  seasonYear: number;
  /** Round after which the standings were computed by the source. */
  round: number | null;
  rows: T[];
}

export interface DriverProfile extends Driver {
  dateOfBirth: string | null;
}

export interface Circuit {
  id: string;
  name: string;
  locality: string | null;
  country: string | null;
  lat: number | null;
  long: number | null;
  url: string | null;
}

export interface RaceWithResults {
  race: RaceEvent;
  results: RaceResult[];
}

/** Career totals read from the source's row counts, never computed by us. */
export interface CareerCounts {
  /** Race entries, retirements included. */
  starts: number | null;
  wins: number | null;
  podiums: number | null;
  /** Counted from qualifying results, which the source has from 1994. */
  poles: number | null;
  fastestLaps: number | null;
  /** Seasons with at least one entry, ascending. */
  seasons: number[];
  teams: Constructor[];
}

/** Career totals of a team, read from the source's row counts. */
export interface TeamCareer {
  wins: number | null;
  /** Podium finishes by car (two cars can both finish on the podium). */
  podiums: number | null;
  poles: number | null;
  seasons: number[];
  drivers: number | null;
}

/** Final championship row of one season, as published by the source. */
export interface SeasonStanding {
  season: number;
  position: number | null;
  /** E.g. "D" for a disqualified season. */
  positionText: string | null;
  points: number | null;
  wins: number | null;
  teams: Constructor[];
  /** The season is over: every round of the calendar is counted. A leader of a running season is not a champion. */
  final: boolean;
}

export interface SeasonHistory {
  rows: SeasonStanding[];
  /** Seasons that could not be loaded. */
  failed: number[];
}

export interface PitStop {
  driverId: string;
  stop: number | null;
  lap: number | null;
  /** Local time of day, as given by the source. */
  time: string | null;
  /** Seconds in the pit lane, as text ("23.456" or "1:02.345"). */
  duration: string | null;
}
