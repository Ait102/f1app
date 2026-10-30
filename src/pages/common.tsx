import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSeasonParam, useSeasons } from '../hooks/data';

export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Renders children only for a valid season that the source knows about. */
export function SeasonGuard({ children }: { children: (season: number) => ReactNode }) {
  const season = useSeasonParam();
  const seasons = useSeasons();
  useEffect(() => {
    if (season) document.title = `F1 Season Hub · ${season}`;
  }, [season]);

  if (season === null) {
    return (
      <section className="page">
        <h1>Неверный сезон</h1>
        <p>
          Сезон указывается четырьмя цифрами. <Link to="/">На главную</Link>
        </p>
      </section>
    );
  }
  if (seasons.status === 'success' && !seasons.data.some((s) => s.year === season)) {
    const latest = seasons.data[0]?.year;
    return (
      <section className="page">
        <h1>Сезон {season} недоступен</h1>
        <p>Источник данных не содержит этот сезон.</p>
        {latest && (
          <p>
            <Link to={`/${latest}`}>Открыть сезон {latest}</Link>
          </p>
        )}
      </section>
    );
  }
  return <>{children(season)}</>;
}

export const ID_RE = /^[a-z0-9_]+$/i;

export function NotFoundBlock({ title, season }: { title: string; season: number }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      <p>
        Источник данных не знает такой записи. <Link to={`/${season}`}>На главную сезона {season}</Link>
      </p>
    </section>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="page-header">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children}
    </header>
  );
}
