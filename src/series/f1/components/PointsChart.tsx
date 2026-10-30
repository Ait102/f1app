import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { formatPoints } from '../domain/format';
import { niceAxis, type ProgressSeries } from '../domain/progress';
import { teamColor } from './bits';

const M = { l: 44, r: 16, t: 16, b: 34 };

interface Props {
  rounds: number[];
  series: ProgressSeries[];
  roundLabel: (round: number) => string;
  highlight?: (driverId: string) => boolean;
}

/** Dashed line for the second (third…) driver of the same team, so teammates stay distinguishable. */
export function lineStyles(series: ProgressSeries[]): Map<string, { color: string; dash?: string }> {
  const seen = new Map<string, number>();
  const out = new Map<string, { color: string; dash?: string }>();
  for (const s of series) {
    const key = s.team?.id ?? `none:${s.driver.id}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    out.set(s.driver.id, { color: teamColor(s.team), dash: n === 0 ? undefined : n === 1 ? '7 5' : '2 4' });
  }
  return out;
}

export function PointsChart({ rounds, series, roundLabel, highlight }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Draw in real pixels so axis labels stay readable on phones.
  const [W, setW] = useState(800);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 560 ? Math.round(W * 0.9) : Math.min(460, Math.round(W * 0.5));
  const n = rounds.length;
  const maxPoints = Math.max(0, ...series.flatMap((s) => s.points.map((p) => p ?? 0)));
  const axis = niceAxis(maxPoints);
  const styles = lineStyles(series);

  const x = (i: number) => M.l + (n > 1 ? (i * (W - M.l - M.r)) / (n - 1) : (W - M.l - M.r) / 2);
  const y = (p: number) => M.t + (1 - p / axis.max) * (H - M.t - M.b);

  function path(points: Array<number | null>): string {
    let d = '';
    let pen = false;
    points.forEach((p, i) => {
      if (p === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(p).toFixed(1)}`;
      pen = true;
    });
    return d;
  }

  function onPointer(e: PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = n > 1 ? Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1)) : 0;
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  }

  const ticks: number[] = [];
  for (let v = 0; v <= axis.max + 1e-9; v += axis.step) ticks.push(v);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(4, Math.floor(W / 60))));

  // Одна точка не рисует линию — помечаем её маркером, чтобы серия была видна.
  const markers = series.flatMap((s) => {
    const known = s.points.filter((p): p is number => p !== null);
    if (known.length !== 1) return [];
    const i = s.points.findIndex((p) => p !== null);
    return [{ id: s.driver.id, cx: x(i), cy: y(known[0]), color: styles.get(s.driver.id)!.color }];
  });

  const hovered =
    hover === null
      ? []
      : series
          .map((s) => ({ s, p: s.points[hover] }))
          .filter((x): x is { s: ProgressSeries; p: number } => x.p !== null)
          .sort((a, b) => b.p - a.p);

  return (
    <div className="chart" ref={boxRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="chart__svg"
        role="img"
        aria-label={`График очков по этапам: ${series.map((s) => s.driver.familyName).join(', ')}. Стрелки влево и вправо — переход по этапам.`}
        tabIndex={0}
        onPointerMove={onPointer}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="chart__grid" />
            <text x={M.l - 8} y={y(v)} className="chart__axis" textAnchor="end" dominantBaseline="middle">
              {v}
            </text>
          </g>
        ))}
        {rounds.map((r, i) =>
          (i % labelEvery === 0 && n - 1 - i >= labelEvery) || i === n - 1 ? (
            <text key={r} x={x(i)} y={H - M.b + 20} className="chart__axis" textAnchor="middle">
              {r}
            </text>
          ) : null,
        )}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="chart__cursor" />
        )}
        {series.map((s) => {
          const st = styles.get(s.driver.id)!;
          const strong = highlight?.(s.driver.id);
          return (
            <path
              key={s.driver.id}
              d={path(s.points)}
              fill="none"
              stroke={st.color}
              strokeWidth={strong ? 4 : 2.5}
              strokeDasharray={st.dash}
              strokeLinejoin="round"
              strokeLinecap="round"
              data-driver={s.driver.id}
            />
          );
        })}
        {markers.map((m) => (
          <circle key={`m-${m.id}`} className="chart__dot" cx={m.cx} cy={m.cy} r={4.5} fill={m.color} />
        ))}
        {hovered.map(({ s, p }) => (
          <circle key={s.driver.id} cx={x(hover!)} cy={y(p)} r={4} fill={styles.get(s.driver.id)!.color} />
        ))}
      </svg>

      {hover !== null && (
        <div
          className={`chart__tip${x(hover) > W / 2 ? ' chart__tip--left' : ''}`}
          style={{ left: `${(x(hover) / W) * 100}%` }}
          role="status"
        >
          <p className="chart__tip-title">{roundLabel(rounds[hover])}</p>
          <ol>
            {hovered.map(({ s, p }) => (
              <li key={s.driver.id}>
                <span
                  className="team-dot"
                  style={{ background: styles.get(s.driver.id)!.color }}
                  aria-hidden="true"
                />
                {s.driver.code ?? s.driver.familyName}
                <strong>{formatPoints(p)}</strong>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
