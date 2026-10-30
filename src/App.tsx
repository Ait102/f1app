import { useEffect, useRef } from 'react';
import { HashRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { ErrorBox, Loading } from './components/DataState';
import { Layout } from './components/Layout';
import { rememberedSeason, useSeasons } from './series/f1/hooks/data';
import { AboutPage } from './series/f1/pages/AboutPage';
import { CalendarPage } from './series/f1/pages/CalendarPage';
import { ChartPage } from './series/f1/pages/ChartPage';
import { CircuitPage } from './series/f1/pages/CircuitPage';
import { ConstructorPage } from './series/f1/pages/ConstructorPage';
import { ConstructorsPage } from './series/f1/pages/ConstructorsPage';
import { DriverPage } from './series/f1/pages/DriverPage';
import { DriversPage } from './series/f1/pages/DriversPage';
import { HomePage } from './series/f1/pages/HomePage';
import { RacePage } from './series/f1/pages/RacePage';

function RootRedirect() {
  const seasons = useSeasons();
  if (seasons.status === 'loading') return <Loading rows={3} label="Загружаем список сезонов…" />;
  if (seasons.status === 'error') {
    const fallback = new Date().getFullYear();
    return (
      <>
        <ErrorBox error={seasons.error} onRetry={seasons.reload} />
        <p>
          Можно попробовать открыть <Link to={`/${fallback}`}>сезон {fallback}</Link> напрямую.
        </p>
      </>
    );
  }
  const remembered = rememberedSeason();
  const target =
    seasons.data.find((s) => s.year === remembered)?.year ??
    seasons.data[0]?.year ??
    new Date().getFullYear();
  return <Navigate to={`/${target}`} replace />;
}

function NotFound() {
  return (
    <section className="page">
      <h1>Страница не найдена</h1>
      <p>
        <Link to="/">Вернуться на главную</Link>
      </p>
    </section>
  );
}

/** Move focus to the main area on navigation for keyboard and screen-reader users. */
function FocusOnNavigate() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    // Leave initial focus alone so the skip link stays the first Tab stop.
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <HashRouter>
      <FocusOnNavigate />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<RootRedirect />} />
          <Route path="about" element={<AboutPage />} />
          <Route path=":season">
            <Route index element={<HomePage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="race/:round" element={<RacePage />} />
            <Route path="drivers" element={<DriversPage />} />
            <Route path="constructors" element={<ConstructorsPage />} />
            <Route path="chart" element={<ChartPage />} />
            <Route path="driver/:driverId" element={<DriverPage />} />
            <Route path="constructor/:constructorId" element={<ConstructorPage />} />
            <Route path="circuit/:circuitId" element={<CircuitPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
