import { useEffect } from 'react';
import { HashRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBox, Loading } from './components/DataState';
import { rememberedSeason, useSeasons } from './hooks/data';
import { HomePage } from './pages/HomePage';
import { CalendarPage } from './pages/CalendarPage';
import { RacePage } from './pages/RacePage';
import { DriversPage } from './pages/DriversPage';
import { ConstructorsPage } from './pages/ConstructorsPage';
import { AboutPage } from './pages/AboutPage';

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
    seasons.data.find((s) => s.year === remembered)?.year ?? seasons.data[0]?.year ?? new Date().getFullYear();
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
  useEffect(() => {
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
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
