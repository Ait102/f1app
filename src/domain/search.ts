import { driverName } from './mappers';
import type { Constructor, Driver } from './types';

/** Case-insensitive match on name, code, number or team name. An empty query matches everything. */
export function matchesDriver(d: Driver, teams: Constructor[], q: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  const hay = [driverName(d), d.code ?? '', d.number ?? '', ...teams.map((t) => t.name)]
    .join(' ')
    .toLowerCase();
  return hay.includes(query);
}
