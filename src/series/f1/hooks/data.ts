import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { useResource } from '../../../hooks/useResource';
import { jolpica } from '../api/jolpica';

export function useSeasonParam(): number | null {
  const { season } = useParams();
  return season && /^\d{4}$/.test(season) ? Number(season) : null;
}

export function useSeasons() {
  return useResource('seasons', (force) => jolpica.getSeasons({ force }));
}

export function useRaces(season: number | null) {
  return useResource(season === null ? null : `races:${season}`, (force) =>
    jolpica.getRaces(season!, { force }),
  );
}

export function useDriverStandings(season: number | null) {
  return useResource(season === null ? null : `ds:${season}`, (force) =>
    jolpica.getDriverStandings(season!, { force }),
  );
}

export function useConstructorStandings(season: number | null) {
  return useResource(season === null ? null : `cs:${season}`, (force) =>
    jolpica.getConstructorStandings(season!, { force }),
  );
}

export function useRaceResults(season: number | null, round: number | null) {
  return useResource(season === null || round === null ? null : `res:${season}:${round}`, (force) =>
    jolpica.getRaceResults(season!, round!, { force }),
  );
}

export function useQualifying(season: number | null, round: number | null) {
  return useResource(season === null || round === null ? null : `q:${season}:${round}`, (force) =>
    jolpica.getQualifying(season!, round!, { force }),
  );
}

export function useSprint(season: number | null, round: number | null) {
  return useResource(season === null || round === null ? null : `spr:${season}:${round}`, (force) =>
    jolpica.getSprintResults(season!, round!, { force }),
  );
}

export function useDriver(id: string) {
  return useResource(`driver:${id}`, (force) => jolpica.getDriver(id, { force }));
}

export function useDriverSeasonResults(season: number, id: string) {
  return useResource(`dres:${season}:${id}`, (force) =>
    jolpica.getDriverSeasonResults(season, id, { force }),
  );
}

export function useDriverCareer(id: string) {
  return useResource(`dcar:${id}`, (force) => jolpica.getDriverCareer(id, { force }));
}

export function useConstructor(id: string) {
  return useResource(`team:${id}`, (force) => jolpica.getConstructor(id, { force }));
}

export function useConstructorSeason(season: number, id: string) {
  return useResource(`tseason:${season}:${id}`, (force) =>
    jolpica.getConstructorSeason(season, id, { force }),
  );
}

export function useConstructorCareer(id: string) {
  return useResource(`tcar:${id}`, (force) => jolpica.getConstructorCareer(id, { force }));
}

/** Everyone who drove for the team; off until the user opens the list. */
export function useConstructorDrivers(id: string, enabled: boolean) {
  return useResource(enabled ? `tdrivers:${id}` : null, (force) =>
    jolpica.getConstructorDrivers(id, { force }),
  );
}

/** Season-by-season championship rows, with progress (one request per season). Off while `seasons` is null. */
export function useDriverHistory(id: string, seasons: number[] | null) {
  const [done, setDone] = useState(0);
  const res = useResource(seasons ? `dhist:${id}:${seasons.join(',')}` : null, (force) => {
    setDone(0);
    return jolpica.getDriverHistory(id, seasons!, { force, onProgress: setDone });
  });
  return { ...res, done, total: seasons?.length ?? 0 };
}

/** Same for a team; loads only when `seasons` is given (the user asked for it). */
export function useConstructorHistory(id: string, seasons: number[] | null) {
  const [done, setDone] = useState(0);
  const res = useResource(seasons ? `thist:${id}:${seasons.join(',')}` : null, (force) => {
    setDone(0);
    return jolpica.getConstructorHistory(id, seasons!, { force, onProgress: setDone });
  });
  return { ...res, done, total: seasons?.length ?? 0 };
}

export function usePitStops(season: number, round: number) {
  return useResource(`pits:${season}:${round}`, (force) => jolpica.getPitStops(season, round, { force }));
}

export function useCircuit(id: string) {
  return useResource(`circuit:${id}`, (force) => jolpica.getCircuit(id, { force }));
}

export function useCircuitWinners(id: string) {
  return useResource(`cwin:${id}`, (force) => jolpica.getCircuitWinners(id, { force }));
}

const SEASON_KEY = 'racinghub:f1:lastSeason';

export function rememberSeason(season: number): void {
  try {
    localStorage.setItem(SEASON_KEY, String(season));
  } catch {
    /* optional */
  }
}

export function rememberedSeason(): number | null {
  try {
    const v = localStorage.getItem(SEASON_KEY);
    return v && /^\d{4}$/.test(v) ? Number(v) : null;
  } catch {
    return null;
  }
}
