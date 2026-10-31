import { flagUrl } from './flags';

describe('flagUrl', () => {
  it('finds flags for nationalities and circuit countries as the source writes them', () => {
    expect(flagUrl('British', 'nationality')).toMatch(/gb\.svg/);
    expect(flagUrl('Monegasque', 'nationality')).toMatch(/mc\.svg/);
    expect(flagUrl('UK', 'country')).toMatch(/gb\.svg/);
    expect(flagUrl('UAE', 'country')).toMatch(/ae\.svg/);
    expect(flagUrl('India', 'country')).toMatch(/in\.svg/);
  });

  it('shows no flag for historical states or unknown values', () => {
    expect(flagUrl('East German', 'nationality')).toBeNull();
    expect(flagUrl('Rhodesian', 'nationality')).toBeNull();
    expect(flagUrl('Atlantis', 'country')).toBeNull();
    expect(flagUrl(null, 'country')).toBeNull();
    expect(flagUrl('UK', 'nationality')).toBeNull();
  });
});
