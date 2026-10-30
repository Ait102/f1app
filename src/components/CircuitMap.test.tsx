import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CIRCUITS } from '../data/circuits/data';
import { loadCircuit } from '../data/circuits';
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
  it('covers every circuit of the 2026 calendar', async () => {
    for (const id of SEASON_2026) {
      const shape = await loadCircuit(id);
      expect(shape, id).not.toBeNull();
      expect(shape!.d.startsWith('M') || shape!.d.startsWith('m'), id).toBe(true);
    }
  });

  it('keeps generated shapes within plausible bounds', () => {
    for (const [id, shape] of Object.entries(CIRCUITS)) {
      expect(shape.d.length, id).toBeGreaterThan(500);
      expect(shape.lengthKm, id).toBeGreaterThan(2);
      expect(shape.lengthKm, id).toBeLessThan(8);
      expect(shape.turns, id).toBeGreaterThan(5);
      expect(shape.from, id).toBeGreaterThanOrEqual(0);
      expect(['clockwise', 'anticlockwise'], id).toContain(shape.direction);
    }
  });

  it('returns null for an unknown circuit', async () => {
    expect(await loadCircuit('nowhere')).toBeNull();
    expect(await loadCircuit(null)).toBeNull();
  });
});

describe('CircuitPanel', () => {
  it('draws the outline with stats', async () => {
    const { container } = render(<CircuitPanel circuitId="monza" name="Монца" season={2026} />);
    expect(await screen.findByRole('heading', { name: 'Схема трассы' })).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName(/Монца: 11 поворотов, длина 5.793 км/);
    expect(container.querySelector('path')).toHaveAttribute('d', CIRCUITS.monza.d);
    expect(container.querySelector('.stat')).toBeInTheDocument();
  });

  it('hides the modern layout for a season before it existed', async () => {
    const { container, unmount } = render(<CircuitPanel circuitId="monza" name="Монца" season={1999} />);
    await new Promise((r) => setTimeout(r, 30));
    expect(container).toBeEmptyDOMElement();
    unmount();

    const old = render(<CircuitPanel circuitId="monza" name="Монца" season={2000} />);
    expect(await old.findByRole('heading', { name: 'Схема трассы' })).toBeInTheDocument();
  });

  it('renders nothing when the circuit has no geometry', async () => {
    const { container } = render(<CircuitPanel circuitId="unknown" name="Тест" season={2026} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
  });
});
