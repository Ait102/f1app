import { useParams } from 'react-router-dom';
import { jolpica } from '../api/jolpica';
import { useResource } from './useResource';

export function useSeasonParam(): number | null {
  const { season } = useParams();
  return season && /^\d{4}$/.test(season) ? Number(season) : null;
}

export function useSeasons() {
  return useResource('seasons', (force) => jolpica.getSeasons({ force }));
}

export function useRaces(season: number | null) {
  return useResource(season === null ? null : `races:${season}`, (force) => jolpica.getRaces(season!, { force }));
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

const SEASON_KEY = 'f1hub:lastSeason';

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
