import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { localTimeZone, utcOffsetLabel } from '../lib/format';
import { rememberedSeason, rememberSeason, useSeasonParam, useSeasons } from '../series/f1/hooks/data';

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

type Series = 'f1' | 'wec' | null;

function seriesOf(pathname: string): Series {
  if (pathname === '/') return null;
  if (pathname === '/wec' || pathname.startsWith('/wec/')) return 'wec';
  return 'f1';
}

function SeriesSwitch({ series, f1Home }: { series: Series; f1Home: string }) {
  const items: Array<[Exclude<Series, null>, string, string]> = [
    ['f1', 'F1', f1Home],
    ['wec', 'WEC', '/wec'],
  ];
  return (
    <nav className="series-switch" aria-label="Чемпионат">
      {items.map(([id, label, to]) => (
        <Link
          key={id}
          to={to}
          className={`series-switch__item${series === id ? ' is-active' : ''}`}
          aria-current={series === id ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function Layout() {
  const season = useSeasonParam();
  const navSeason = season ?? rememberedSeason();
  const { pathname } = useLocation();
  const series = seriesOf(pathname);

  useEffect(() => {
    if (season !== null) rememberSeason(season);
  }, [season]);

  const tz = localTimeZone();
  const links: Array<[string, string]> =
    series === 'f1' && navSeason
      ? [
          [`/${navSeason}`, 'Главная'],
          [`/${navSeason}/calendar`, 'Календарь'],
          [`/${navSeason}/drivers`, 'Пилоты'],
          [`/${navSeason}/constructors`, 'Конструкторы'],
          [`/${navSeason}/chart`, 'График'],
          ['/about', 'Источники'],
        ]
      : series === 'f1'
        ? [['/about', 'Источники']]
        : series === 'wec'
          ? [['/wec', 'Обзор']]
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
          <Link to="/" className="logo" aria-label="Racing Hub — выбор чемпионата">
            <span className="logo__mark" aria-hidden="true">
              RH
            </span>
            <span className="logo__text">Racing Hub</span>
          </Link>
          <nav className="nav" aria-label="Основная навигация">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} end className="nav__link">
                {label}
              </NavLink>
            ))}
          </nav>
          <SeriesSwitch series={series} f1Home={navSeason ? `/${navSeason}` : '/f1'} />
          {series === 'f1' && <SeasonSelect season={season} />}
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
            . Некоммерческий неофициальный проект, не связан с Formula 1, FIA и WEC.
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
