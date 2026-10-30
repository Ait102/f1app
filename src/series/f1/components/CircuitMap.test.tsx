import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { eraLabel, loadCircuit } from '../data/circuits';
import { CIRCUIT_SLUGS } from '../data/circuits/map';
import { CircuitPanel } from './CircuitMap';

/** Circuit ids of the 2026 calendar as Jolpica reports them. */
const SEASON_2026 = [
  'albert_park',
  'americas',
  'baku',
  'catalunya',
  'hungaroring',
  'interlagos',
  'jeddah',
  'losail',
  'madring',
  'marina_bay',
  'miami',
  'monaco',
  'monza',
  'red_bull_ring',
  'sepang',
  'shanghai',
  'silverstone',
  'spa',
  'suzuka',
  'vegas',
  'villeneuve',
  'yas_marina',
  'zandvoort',
];

describe('circuit geometry', () => {
  it('has a shapes file for every mapped circuit', () => {
    const files = import.meta.glob('../data/circuits/shapes/*.ts');
    const slugs = new Set(Object.keys(files).map((p) => p.replace(/^.*\/(.*)\.ts$/, '$1')));
    for (const [id, slug] of Object.entries(CIRCUIT_SLUGS)) {
      expect(slugs.has(slug), `${id} -> ${slug}`).toBe(true);
    }
  });

  it('covers every circuit of the 2026 calendar', async () => {
    for (const id of SEASON_2026) {
      expect(CIRCUIT_SLUGS[id], id).toBeTruthy();
      const shape = await loadCircuit(id, 2026);
      expect(shape, id).not.toBeNull();
      expect(shape!.d.startsWith('M') || shape!.d.startsWith('m'), id).toBe(true);
    }
  });

  it('picks the layout of the requested season', async () => {
    const now = await loadCircuit('monza', 2026);
    const old = await loadCircuit('monza', 1950);
    const banked = await loadCircuit('monza', 1955);
    expect(now).toMatchObject({ lengthKm: 5.793, turns: 11 });
    expect(old).toMatchObject({ lengthKm: 6.3, turns: 5 });
    expect(banked).toMatchObject({ lengthKm: 10, turns: 7 });
    expect(now!.d).not.toBe(old!.d);
  });

  it('follows layout changes at Silverstone', async () => {
    expect(await loadCircuit('silverstone', 1998)).toMatchObject({ lengthKm: 5.141, turns: 17 });
    expect(await loadCircuit('silverstone', 2012)).toMatchObject({ lengthKm: 5.891, turns: 18 });
  });

  it('returns null for seasons outside the known layouts', async () => {
    expect(await loadCircuit('monza', 1949)).toBeNull();
    expect(await loadCircuit('nowhere', 2026)).toBeNull();
    expect(await loadCircuit(null, 2026)).toBeNull();
  });

  it('formats the era label', async () => {
    expect(eraLabel((await loadCircuit('silverstone', 1998))!)).toBe('1997–2009');
    expect(eraLabel((await loadCircuit('silverstone', 2026))!)).toBe('с 2010');
    // circuits with a single layout never had a different shape
    expect(eraLabel((await loadCircuit('miami', 2026))!)).toBeNull();
  });
});

describe('CircuitPanel', () => {
  it('draws the outline with stats', async () => {
    const { container } = render(<CircuitPanel circuitId="monza" name="Монца" season={2026} />);
    expect(await screen.findByRole('heading', { name: 'Схема трассы' })).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName(/Монца: 11 поворотов, длина 5.793 км/);
    expect(container.querySelector('path')).toHaveAttribute('d', (await loadCircuit('monza', 2026))!.d);
    expect(screen.getByText(/конфигурация с 2000/)).toBeInTheDocument();
    expect(container.querySelector('.stat')).toBeInTheDocument();
  });

  it('shows the old layout for an old season', async () => {
    render(<CircuitPanel circuitId="silverstone" name="Сильверстоун" season={1998} />);
    expect(await screen.findByRole('img')).toHaveAccessibleName(/17 поворотов, длина 5.141 км/);
    expect(screen.getByText(/конфигурация 1997–2009/)).toBeInTheDocument();
  });

  it('omits the era when the layout was used in several periods', async () => {
    render(<CircuitPanel circuitId="monza" name="Монца" season={1955} />);
    expect(await screen.findByRole('img')).toHaveAccessibleName(/7 поворотов, длина 10 км/);
    expect(screen.queryByText(/конфигурация/)).toBeNull();
  });

  it('renders nothing when the season has no known layout', async () => {
    const { container } = render(<CircuitPanel circuitId="monza" name="Монца" season={1949} />);
    await new Promise((r) => setTimeout(r, 30));
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an unmapped circuit', async () => {
    const { container } = render(<CircuitPanel circuitId="nowhere" name="Тест" season={2026} />);
    await new Promise((r) => setTimeout(r, 30));
    expect(container).toBeEmptyDOMElement();
  });
});
