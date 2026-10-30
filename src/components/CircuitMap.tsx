import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { loadCircuit, type CircuitShape } from '../data/circuits';
import { Stat } from './bits';

const FULL_BOX = { x: 0, y: 0, w: 500, h: 500 };

/**
 * Circuit outline + basic stats (length, turns, direction).
 * Renders nothing at all when the circuit is not in the geometry table —
 * the same "no data, no block" rule the rest of the app follows.
 */
export function CircuitPanel({ circuitId, name }: { circuitId: string | null; name: string | null }) {
  const [shape, setShape] = useState<CircuitShape | null>(null);
  const [box, setBox] = useState(FULL_BOX);
  const line = useRef<SVGPathElement>(null);

  useEffect(() => {
    let alive = true;
    setShape(null);
    setBox(FULL_BOX);
    loadCircuit(circuitId).then((s) => {
      if (alive) setShape(s);
    });
    return () => {
      alive = false;
    };
  }, [circuitId]);

  // The source outlines leave different margins inside their 500 × 500 frame,
  // so the viewBox is tightened to the drawing itself for a consistent weight.
  useLayoutEffect(() => {
    const el = line.current;
    if (!el || typeof el.getBBox !== 'function') return;
    const b = el.getBBox();
    if (!b.width || !b.height) return;
    const pad = Math.max(b.width, b.height) * 0.07;
    setBox({ x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2 });
  }, [shape]);

  if (!shape) return null;

  const label = `Схема трассы${name ? ` ${name}` : ''}: ${shape.turns} поворотов, длина ${shape.lengthKm} км`;

  return (
    <article className="card circuit-panel">
      <h2 className="card__title">Схема трассы</h2>
      <div className="circuit-panel__body">
        <div className="circuit-map">
          <svg
            className="circuit-map__svg"
            viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
            role="img"
            aria-label={label}
          >
            <path className="circuit-map__glow" d={shape.d} pathLength={1} />
            <path ref={line} className="circuit-map__line" d={shape.d} pathLength={1} />
          </svg>
        </div>
        <div className="circuit-panel__meta">
          <div className="stats">
            <Stat label="Длина" value={`${shape.lengthKm} км`} />
            <Stat label="Поворотов" value={shape.turns} />
            <Stat label="Направление" value={shape.direction === 'clockwise' ? 'По часовой' : 'Против часовой'} />
          </div>
          <p className="muted small">
            Схема:{' '}
            <a href="https://github.com/f1db/f1db" target="_blank" rel="noreferrer">
              F1DB
            </a>
            , CC BY 4.0
          </p>
        </div>
      </div>
    </article>
  );
}
