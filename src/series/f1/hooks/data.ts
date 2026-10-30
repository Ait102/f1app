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

export function useConstructorWins(id: string) {
  return useResource(`twins:${id}`, (force) => jolpica.getConstructorWins(id, { force }));
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
