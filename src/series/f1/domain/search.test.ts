import { matchesDriver } from './search';
import type { Constructor, Driver } from './types';

const hamilton: Driver = {
  id: 'hamilton',
  givenName: 'Lewis',
  familyName: 'Hamilton',
  code: 'HAM',
  number: '44',
  nationality: 'British',
  url: null,
};
const ferrari: Constructor = { id: 'ferrari', name: 'Ferrari', nationality: 'Italian', url: null };

describe('matchesDriver', () => {
  it('matches name, code, number and team, ignoring case and spaces', () => {
    expect(matchesDriver(hamilton, [ferrari], 'lewis')).toBe(true);
    expect(matchesDriver(hamilton, [ferrari], '  ham ')).toBe(true);
    expect(matchesDriver(hamilton, [ferrari], '44')).toBe(true);
    expect(matchesDriver(hamilton, [ferrari], 'ferr')).toBe(true);
  });

  it('treats an empty query as a match and rejects others', () => {
    expect(matchesDriver(hamilton, [], '')).toBe(true);
    expect(matchesDriver(hamilton, [], 'verstappen')).toBe(false);
  });
});
