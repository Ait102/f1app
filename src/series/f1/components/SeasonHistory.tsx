import { Link } from 'react-router-dom';

import { ErrorBox, MetaLine } from '../../../components/DataState';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { LoadingProgress, posClass } from '../../../components/ui';
import { formatPoints } from '../../../lib/format';
import type { SeasonStanding } from '../domain/types';
import type { useDriverHistory } from '../hooks/data';
import { TeamCell } from './bits';

type HistoryState = ReturnType<typeof useDriverHistory>;

/**
 * Championship position, points and wins for every season, newest first.
 * Rows come straight from the season tables of the source.
 */
export function SeasonHistory({
  state,
  kind,
  link,
}: {
  state: HistoryState;
  kind: 'driver' | 'team';
  /** Where a season row links to (the profile in that season). */
  link: (season: number) => string;
}) {
  if (state.status === 'loading') {
    return <LoadingProgress done={state.done} total={state.total} label="Загружаем сезоны" />;
  }
  if (state.status === 'error') return <ErrorBox error={state.error} onRetry={state.reload} />;

  const { rows, failed } = state.data;
  const columns: Column<SeasonStanding>[] = [
    {
      key: 'season',
      header: 'Сезон',
      align: 'center',
      render: (r) => <Link to={link(r.season)}>{r.season}</Link>,
      sortValue: (r) => r.season,
    },
    ...(kind === 'driver'
      ? [
          {
            key: 'team',
            header: 'Команда',
            optional: true,
            render: (r: SeasonStanding) =>
              r.teams.length ? (
                <span className="team-list">
                  {r.teams.map((t) => (
                    <TeamCell key={t.id} team={t} season={r.season} />
                  ))}
                </span>
              ) : (
                '—'
              ),
          },
        ]
      : []),
    {
      key: 'pos',
      header: 'Место',
      align: 'center',
      render: (r) => (
        <span className={posClass('pos', r.position)}>
          {r.final && r.position === 1 && (
            <span className="title-star" aria-label="Чемпион">
              ★{' '}
            </span>
          )}
          {r.positionText ?? r.position ?? '—'}
          {!r.final && <span className="muted small"> · идёт</span>}
        </span>
      ),
      sortValue: (r) => r.position,
    },
    {
      key: 'pts',
      header: 'Очки',
      align: 'right',
      render: (r) => <strong>{formatPoints(r.points)}</strong>,
      sortValue: (r) => r.points,
    },
    { key: 'wins', header: 'Победы', align: 'right', render: (r) => r.wins ?? '—', sortValue: (r) => r.wins },
  ];

  return (
    <>
      {rows.length === 0 ? (
        <p className="muted">Источник не публикует итоговых таблиц за эти сезоны.</p>
      ) : (
        <SortableTable
          columns={columns}
          rows={[...rows].reverse()}
          rowKey={(r) => String(r.season)}
          caption="Итоги чемпионатов по сезонам"
          rowClassName={(r) => (r.final && r.position === 1 ? 'row--title' : undefined)}
        />
      )}
      {failed.length > 0 && (
        <p className="note">
          Не загрузились сезоны: {failed.join(', ')}.{' '}
          <button type="button" className="btn btn--ghost btn--small" onClick={state.reload}>
            Повторить
          </button>
        </p>
      )}
      <MetaLine meta={state.meta} onRefresh={state.reload} />
    </>
  );
}
