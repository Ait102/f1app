import { fireEvent, render, screen } from '@testing-library/react';

import { badgeInk, teamAbbr, TeamLogo } from './TeamLogo';

const team = (id: string, name: string) => ({ id, name, nationality: null, url: null });

describe('TeamLogo', () => {
  it('uses the usual short name or the first letters', () => {
    expect(teamAbbr(team('red_bull', 'Red Bull'))).toBe('RBR');
    expect(teamAbbr(team('lola', 'Lola'))).toBe('LOL');
    expect(teamAbbr(team('x', 'De Tomaso'))).toBe('DET');
  });

  it('picks readable ink for the team color', () => {
    expect(badgeInk('#27f4d2')).toBe('#111318');
    expect(badgeInk('#3671c6')).toBe('#fff');
    expect(badgeInk('bad')).toBe('#fff');
  });

  it('shows a badge, not an image, when no logo is registered', () => {
    const { container } = render(<TeamLogo team={team('lola', 'Lola')} />);
    expect(screen.getByText('LOL')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows a registered logo and falls back to the badge if it fails to load', () => {
    const { container } = render(<TeamLogo team={team('ferrari', 'Ferrari')} />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toMatch(/logos\/ferrari\.svg$/);
    expect(img).toHaveAttribute('alt', '');
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('FER')).toBeInTheDocument();
  });
});
