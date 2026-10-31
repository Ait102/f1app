import { Link, useSearchParams } from 'react-router-dom';

import { ErrorBox, Loading } from '../../../components/DataState';
import { LoadingProgress, posClass, WithFlag } from '../../../components/ui';
import { formatPoints } from '../../../lib/format';
import { teamColor } from '../components/bits';
import {
  bestFinish,
  leader,
  pairSeasons,
  polesIncomplete,
  QUALIFYING_DATA_FROM,
  seasonSpan,
  titleYears,
} from '../domain/career';
import { driverName } from '../domain/mappers';
import type { CareerCounts, Driver, SeasonStanding } from '../domain/types';
import { useDriver, useDriverCareer, useDriverHistory, useDriverStandings } from '../hooks/data';
import { ID_RE, PageHeader, SeasonGuard } from './common';

export function ComparePage() {
  return <SeasonGuard>{(season) => <Compare season={season} />}</SeasonGuard>;
}

function Compare({ season }: { season: number }) {
  const [params, setParams] = useSearchParams();
  const pick = (v: string | null) => (v && ID_RE.test(v) ? v : '');
  const a = pick(params.get('a'));
  const b = pick(params.get('b'));
  const ds = useDriverStandings(season);
  const drivers = ds.status === 'success' ? ds.data.rows.map((r) => r.driver) : [];

  function set(which: 'a' | 'b', id: string) {
    const next = new URLSearchParams(params);
    if (id) next.set(which, id);
    else next.delete(which);
    setParams(next);
  }

  return (
    <section className="page">
      <PageHeader eyebrow={`Сезон ${season}`} title="Сравнение пилотов">
        <p className="lead">
          Победы, подиумы, поулы и итоги чемпионатов по сезонам — по данным источника, без пересчёта.
        </p>
      </PageHeader>

      <div className="cmp-pickers">
        <DriverPicker label="Пилот 1" value={a} drivers={drivers} onChange={(id) => set('a', id)} />
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => setParams(new URLSearchParams({ ...(b && { a: b }), ...(a && { b: a }) }))}
          disabled={!a && !b}
          aria-label="Поменять пилотов местами"
        >
          ⇄
        </button>
        <DriverPicker label="Пилот 2" value={b} drivers={drivers} onChange={(id) => set('b', id)} />
      </div>
      {ds.status === 'success' && (
        <p className="muted small">
          В списке — пилоты сезона {season}. Чтобы сравнить пилотов другой эпохи, выберите сезон в шапке.
        </p>
      )}

      {a && b && a !== b ? (
        <CompareBody a={a} b={b} season={season} />
      ) : (
        <div className="state state--empty">
          {a && a === b
            ? 'Выберите двух разных пилотов.'
            : 'Выберите двух пилотов, чтобы сравнить их карьеры.'}
        </div>
      )}
    </section>
  );
}

function DriverPicker({
  label,
  value,
  drivers,
  onChange,
}: {
  label: string;
  value: string;
  drivers: Driver[];
  onChange: (id: string) => void;
}) {
  const known = drivers.some((d) => d.id === value);
  return (
    <label className="cmp-picker">
      <span className="cmp-picker__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— выберите —</option>
        {value && !known && <option value={value}>{value}</option>}
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>
            {driverName(d)}
            {d.code ? ` (${d.code})` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompareBody({ a, b, season }: { a: string; b: string; season: number }) {
  const pa = useDriver(a);
  const pb = useDriver(b);
  const ca = useDriverCareer(a);
  const cb = useDriverCareer(b);
  const ha = useDriverHistory(a, ca.status === 'success' ? ca.data.seasons : null);
  const hb = useDriverHistory(b, cb.status === 'success' ? cb.data.seasons : null);

  for (const s of [pa, pb, ca, cb]) {
    if (s.status === 'error') return <ErrorBox error={s.error} onRetry={s.reload} />;
  }
  if (
    pa.status !== 'success' ||
    pb.status !== 'success' ||
    ca.status !== 'success' ||
    cb.status !== 'success'
  ) {
    return <Loading rows={6} />;
  }
  const da = pa.data;
  const db = pb.data;
  if (!da || !db) return <div className="state state--empty">Один из пилотов не найден у источника.</div>;

  const rowsA = ha.status === 'success' ? ha.data.rows : null;
  const rowsB = hb.status === 'success' ? hb.data.rows : null;
  // The source lists a driver's teams alphabetically, so the latest team comes from the latest season.
  const lastTeam = (rows: SeasonStanding[] | null) => rows?.at(-1)?.teams.at(-1) ?? null;

  const titlesA = rowsA ? titleYears(rowsA).length : null;
  const titlesB = rowsB ? titleYears(rowsB).length : null;
  const bestA = rowsA ? (bestFinish(rowsA)?.position ?? null) : null;
  const bestB = rowsB ? (bestFinish(rowsB)?.position ?? null) : null;
  const polesNote = polesIncomplete(ca.data.seasons) || polesIncomplete(cb.data.seasons);

  const pending = !rowsA || !rowsB;
  const metrics: Array<{
    label: string;
    a: number | null;
    b: number | null;
    better?: 'higher' | 'lower';
    pending?: boolean;
  }> = [
    { label: 'Гонки', a: ca.data.starts, b: cb.data.starts },
    { label: 'Победы', a: ca.data.wins, b: cb.data.wins },
    { label: 'Подиумы', a: ca.data.podiums, b: cb.data.podiums },
    { label: polesNote ? 'Поулы*' : 'Поулы', a: ca.data.poles, b: cb.data.poles },
    { label: 'Быстрые круги', a: ca.data.fastestLaps, b: cb.data.fastestLaps },
    { label: 'Титулы', a: titlesA, b: titlesB, pending },
    { label: 'Сезоны', a: ca.data.seasons.length, b: cb.data.seasons.length },
    { label: 'Лучшее место в чемпионате', a: bestA, b: bestB, better: 'lower', pending },
  ];

  return (
    <>
      <div className="cmp-heads">
        <DriverHead driver={da} career={ca.data} team={lastTeam(rowsA)} season={season} side="a" />
        <span className="cmp-vs" aria-hidden="true">
          VS
        </span>
        <DriverHead driver={db} career={cb.data} team={lastTeam(rowsB)} season={season} side="b" />
      </div>

      <div className="card cmp-table" role="table" aria-label="Сравнение карьер">
        {metrics.map((m) => (
          <MetricRow key={m.label} {...m} />
        ))}
      </div>
      {polesNote && (
        <p className="muted small">
          * Поулы считаются по результатам квалификаций, а они есть у источника только с{' '}
          {QUALIFYING_DATA_FROM} года.
        </p>
      )}

      <h2 className="section-title">Итоги по сезонам</h2>
      {ha.status === 'loading' || hb.status === 'loading' ? (
        <div className="cmp-progress">
          <LoadingProgress done={ha.done} total={ha.total} label={driverName(da)} />
          <LoadingProgress done={hb.done} total={hb.total} label={driverName(db)} />
        </div>
      ) : ha.status === 'error' ? (
        <ErrorBox error={ha.error} onRetry={ha.reload} />
      ) : hb.status === 'error' ? (
        <ErrorBox error={hb.error} onRetry={hb.reload} />
      ) : (
        <SeasonsTable a={da} b={db} rowsA={rowsA ?? []} rowsB={rowsB ?? []} />
      )}
    </>
  );
}

function DriverHead({
  driver,
  career,
  team,
  season,
  side,
}: {
  driver: Driver;
  career: CareerCounts;
  team: CareerCounts['teams'][number] | null;
  season: number;
  side: 'a' | 'b';
}) {
  return (
    <div className={`cmp-head cmp-head--${side}`} style={{ borderColor: teamColor(team) }}>
      {driver.number && <span className="car-number">{driver.number}</span>}
      <Link to={`/${season}/driver/${driver.id}`} className="cmp-head__name">
        {driverName(driver)}
      </Link>
      <span className="muted small">
        {driver.nationality && <WithFlag value={driver.nationality} kind="nationality" />}
        {seasonSpan(career.seasons) && ` · ${seasonSpan(career.seasons)}`}
        {team && ` · ${team.name}`}
      </span>
    </div>
  );
}

function MetricRow({
  label,
  a,
  b,
  better = 'higher',
  pending = false,
}: {
  label: string;
  a: number | null;
  b: number | null;
  better?: 'higher' | 'lower';
  /** Value still loading (shown as «…»), otherwise null means unknown («—»). */
  pending?: boolean;
}) {
  const show = (v: number | null) => v ?? (pending ? '…' : '—');
  const lead = leader(a, b, better);
  // Bars show the share of the larger value; for "lower is better" the bar is the inverse rank.
  const max = Math.max(a ?? 0, b ?? 0);
  const width = (v: number | null) => {
    if (v === null || max === 0) return 0;
    return better === 'higher' ? (v / max) * 100 : (Math.min(a ?? v, b ?? v) / v) * 100;
  };
  return (
    <div className="cmp-row" role="row">
      <span className={`cmp-cell cmp-cell--a${lead === 'a' ? ' is-lead' : ''}`} role="cell">
        <span className="cmp-bar" style={{ width: `${width(a)}%` }} aria-hidden="true" />
        <span className="cmp-num">{show(a)}</span>
      </span>
      <span className="cmp-label" role="rowheader">
        {label}
      </span>
      <span className={`cmp-cell cmp-cell--b${lead === 'b' ? ' is-lead' : ''}`} role="cell">
        <span className="cmp-bar" style={{ width: `${width(b)}%` }} aria-hidden="true" />
        <span className="cmp-num">{show(b)}</span>
      </span>
    </div>
  );
}

function SeasonsTable({
  a,
  b,
  rowsA,
  rowsB,
}: {
  a: Driver;
  b: Driver;
  rowsA: SeasonStanding[];
  rowsB: SeasonStanding[];
}) {
  const pairs = pairSeasons(rowsA, rowsB);
  const cell = (r: SeasonStanding | null) =>
    r ? (
      <>
        <td className="align-center">
          <span className={posClass('pos', r.position)}>
            {r.final && r.position === 1 && <span className="title-star">★ </span>}
            {r.positionText ?? r.position ?? '—'}
            {!r.final && <span className="muted small"> · идёт</span>}
          </span>
        </td>
        <td className="align-right">{formatPoints(r.points)}</td>
        <td className="align-right col-optional">{r.wins ?? '—'}</td>
      </>
    ) : (
      <td className="align-center muted" colSpan={3}>
        не выступал
      </td>
    );
  return (
    <div className="table-wrap">
      <table className="table cmp-seasons">
        <caption className="visually-hidden">Итоги чемпионатов по сезонам</caption>
        <thead>
          <tr>
            <th scope="col" rowSpan={2} className="align-center">
              Сезон
            </th>
            <th scope="colgroup" colSpan={3} className="align-center">
              {a.code ?? a.familyName}
            </th>
            <th scope="colgroup" colSpan={3} className="align-center">
              {b.code ?? b.familyName}
            </th>
          </tr>
          <tr>
            {[0, 1].map((i) => (
              <Sub key={i} />
            ))}
          </tr>
        </thead>
        <tbody>
          {pairs.map((p) => (
            <tr key={p.season}>
              <th scope="row" className="align-center">
                {p.season}
              </th>
              {cell(p.a)}
              {cell(p.b)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Sub() {
  return (
    <>
      <th scope="col" className="align-center">
        Место
      </th>
      <th scope="col" className="align-right">
        Очки
      </th>
      <th scope="col" className="align-right col-optional">
        Победы
      </th>
    </>
  );
}
