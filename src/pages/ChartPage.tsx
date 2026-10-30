import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { describeError } from '../api/client';
import { jolpica } from '../api/jolpica';
import { ErrorBox, Loading, MetaLine } from '../components/DataState';
import { DriverCell } from '../components/bits';
import { PointsChart, lineStyles } from '../components/PointsChart';
import { formatPoints } from '../domain/format';
import { buildProgress } from '../domain/progress';
import { useDriverStandings, useRaces } from '../hooks/data';
import { useFavorites } from '../hooks/useFavorites';
import { useResource } from '../hooks/useResource';
import { PageHeader, SeasonGuard } from './common';

type TopN = 5 | 10 | 'all';

export function ChartPage() {
  return <SeasonGuard>{(season) => <Chart season={season} />}</SeasonGuard>;
}

function Chart({ season }: { season: number }) {
  const ds = useDriverStandings(season);
  const lastRound = ds.status === 'success' ? ds.data.round : null;

  return (
    <section className="page">
      <PageHeader eyebrow={`Сезон ${season}`} title="Борьба за чемпионство">
        <p className="lead">Очки пилотов после каждого этапа — по таблицам источника, без пересчёта.</p>
      </PageHeader>
      {ds.status === 'loading' ? (
        <Loading rows={6} />
      ) : ds.status === 'error' ? (
        <ErrorBox error={ds.error} onRetry={ds.reload} />
      ) : lastRound === null || lastRound < 1 ? (
        <p className="muted">В этом сезоне ещё нет завершённых этапов.</p>
      ) : (
        <ChartBody season={season} lastRound={lastRound} />
      )}
    </section>
  );
}

function ChartBody({ season, lastRound }: { season: number; lastRound: number }) {
  const [done, setDone] = useState(0);
  const [top, setTop] = useState<TopN>(5);
  const { isFav } = useFavorites();
  const races = useRaces(season);
  const prog = useResource(`prog:${season}:${lastRound}`, (force) => {
    setDone(0);
    return jolpica.getStandingsProgress(season, lastRound, { force, onProgress: (d) => setDone(d) });
  });

  const progress = useMemo(() => (prog.status === 'success' ? buildProgress(prog.data.rounds) : null), [prog]);

  if (prog.status === 'loading') {
    return (
      <div className="chart-loading" role="status" aria-live="polite">
        <p>
          Загружаем таблицы по этапам: {done} из {lastRound}
        </p>
        <div className="progress" aria-hidden="true">
          <div className="progress__bar" style={{ width: `${(done / lastRound) * 100}%` }} />
        </div>
      </div>
    );
  }
  if (prog.status === 'error') return <ErrorBox error={prog.error} onRetry={prog.reload} />;

  const { failed, firstError } = prog.data;
  if (failed.length > 0 || !progress) {
    // ТЗ: draw the chart only when every round is available and comparable.
    return (
      <>
        <div className="state state--error" role="alert">
          <p className="state__title">График не построен: нет данных по части этапов</p>
          <p>Не загрузились этапы: {failed.join(', ')}.</p>
          {firstError != null && <p className="muted small">{describeError(firstError)}</p>}
          <button type="button" className="btn" onClick={prog.reload}>
            Повторить
          </button>
        </div>
      </>
    );
  }

  const limit = top === 'all' ? Infinity : top;
  const shown = progress.series.filter((s, i) => i < limit || isFav('drivers', s.driver.id));
  const styles = lineStyles(shown);
  const raceName = (r: number) =>
    (races.status === 'success' ? races.data.find((x) => x.round === r)?.name : null) ?? `Этап ${r}`;

  return (
    <>
      <div className="chips" role="group" aria-label="Сколько пилотов показать">
        {([5, 10, 'all'] as TopN[]).map((t) => (
          <button key={String(t)} type="button" className="chip" aria-pressed={top === t} onClick={() => setTop(t)}>
            {t === 'all' ? 'Все пилоты' : `Топ-${t}`}
          </button>
        ))}
      </div>
      <p className="muted small">Избранные пилоты всегда на графике и выделены толстой линией. Наведите на график или используйте стрелки.</p>

      <div className="card chart-card">
        <PointsChart
          rounds={progress.rounds}
          series={shown}
          roundLabel={(r) => `Этап ${r} · ${raceName(r)}`}
          highlight={(id) => isFav('drivers', id)}
        />
        <ul className="legend">
          {shown.map((s) => {
            const st = styles.get(s.driver.id)!;
            return (
              <li key={s.driver.id}>
                <svg width="26" height="10" aria-hidden="true">
                  <line x1="1" x2="25" y1="5" y2="5" stroke={st.color} strokeWidth="3" strokeDasharray={st.dash} />
                </svg>
                <DriverCell driver={s.driver} team={s.team} season={season} />
                <span className="muted">{formatPoints(s.points.at(-1) ?? null)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <details className="chart-table">
        <summary>Таблица очков по этапам</summary>
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Очки пилотов после каждого этапа</caption>
            <thead>
              <tr>
                <th scope="col">Пилот</th>
                {progress.rounds.map((r) => (
                  <th key={r} scope="col" className="align-right">
                    <Link to={`/${season}/race/${r}`} title={raceName(r)}>
                      {r}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.driver.id}>
                  <th scope="row">{s.driver.code ?? s.driver.familyName}</th>
                  {s.points.map((p, i) => (
                    <td key={i} className="align-right">
                      {formatPoints(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <MetaLine meta={prog.meta} onRefresh={prog.reload} />
    </>
  );
}
