import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { localTimeZone, utcOffsetLabel } from '../domain/format';
import { rememberedSeason, rememberSeason, useSeasonParam, useSeasons } from '../hooks/data';

function SeasonSelect({ season }: { season: number | null }) {
  const seasons = useSeasons();
  const navigate = useNavigate();
  const location = useLocation();

  function onChange(next: string) {
    // Keep the same section (and profile); a race page jumps to the new season's calendar.
    const rest = location.pathname.split('/').slice(2);
    const section = rest[0] === 'race' ? 'calendar' : rest.join('/');
    navigate(`/${next}${section ? '/' + section : ''}`);
  }

  if (seasons.status === 'error') {
    return (
      <button type="button" className="btn btn--small" onClick={seasons.reload}>
        Сезоны не загружены — повторить
      </button>
    );
  }

  const list = seasons.status === 'success' ? seasons.data : season ? [{ year: season, label: '' }] : [];
  return (
    <label className="season-select">
      <span className="season-select__label">Сезон</span>
      <select
        value={season ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={seasons.status === 'loading'}
        aria-busy={seasons.status === 'loading'}
      >
        {season === null && <option value="">—</option>}
        {list.map((s) => (
          <option key={s.year} value={s.year}>
            {s.year}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Layout() {
  const season = useSeasonParam();
  const navSeason = season ?? rememberedSeason();

  useEffect(() => {
    if (season !== null) rememberSeason(season);
  }, [season]);

  const tz = localTimeZone();
  const links: Array<[string, string]> = navSeason
    ? [
        [`/${navSeason}`, 'Главная'],
        [`/${navSeason}/calendar`, 'Календарь'],
        [`/${navSeason}/drivers`, 'Пилоты'],
        [`/${navSeason}/constructors`, 'Конструкторы'],
        [`/${navSeason}/chart`, 'График'],
      ]
    : [];

  return (
    <div className="app">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          // A plain #main would be treated as a route by HashRouter.
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Перейти к содержимому
      </a>
      <header className="header">
        <div className="container header__inner">
          <Link
            to={navSeason ? `/${navSeason}` : '/'}
            className="logo"
            aria-label="F1 Season Hub — на главную"
          >
            <span className="logo__mark" aria-hidden="true">
              F1
            </span>
            <span className="logo__text">Season Hub</span>
          </Link>
          <nav className="nav" aria-label="Основная навигация">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} end className="nav__link">
                {label}
              </NavLink>
            ))}
            <NavLink to="/about" className="nav__link">
              Источники
            </NavLink>
          </nav>
          <SeasonSelect season={season} />
        </div>
      </header>
      <main id="main" className="container main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer__inner">
          <p>
            Данные:{' '}
            <a href="https://github.com/jolpica/jolpica-f1" target="_blank" rel="noreferrer">
              Jolpica-F1
            </a>{' '}
            (открытый API, совместимый с Ergast), лицензия{' '}
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ru"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-NC-SA 4.0
            </a>
            . Некоммерческий неофициальный проект, не связан с Formula 1.
          </p>
          <p>
            Время показано в зоне <strong>{tz}</strong> ({utcOffsetLabel(tz)}). Наведите на время, чтобы
            увидеть UTC.
          </p>
        </div>
      </footer>
    </div>
  );
}
