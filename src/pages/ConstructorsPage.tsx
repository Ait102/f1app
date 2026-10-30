import { useState } from 'react';
import { DataState } from '../components/DataState';
import { SearchBox, TeamCell } from '../components/bits';
import { SortableTable, type Column } from '../components/SortableTable';
import { formatPoints } from '../domain/format';
import type { ConstructorStanding } from '../domain/types';
import { useConstructorStandings } from '../hooks/data';
import { PageHeader, SeasonGuard } from './common';
import { useFavorites } from '../hooks/useFavorites';

const columns: Column<ConstructorStanding>[] = [
  { key: 'pos', header: 'Позиция', abbr: 'Поз.', align: 'center', render: (r) => <span className="pos">{r.positionText ?? r.position ?? '—'}</span>, sortValue: (r) => r.position },
  { key: 'team', header: 'Команда', render: (r) => <TeamCell team={r.constructor} />, sortValue: (r) => r.constructor.name },
  { key: 'nat', header: 'Страна', optional: true, render: (r) => r.constructor.nationality ?? '—', sortValue: (r) => r.constructor.nationality },
  { key: 'wins', header: 'Победы', abbr: 'Поб.', align: 'right', render: (r) => r.wins ?? '—', sortValue: (r) => r.wins },
  { key: 'pts', header: 'Очки', align: 'right', render: (r) => <strong>{formatPoints(r.points)}</strong>, sortValue: (r) => r.points },
];

export function ConstructorsPage() {
  return <SeasonGuard>{(season) => <Constructors season={season} />}</SeasonGuard>;
}

function Constructors({ season }: { season: number }) {
  const cs = useConstructorStandings(season);
  const [q, setQ] = useState('');
  const { isFav } = useFavorites();
  return (
    <section className="page">
      <PageHeader eyebrow={`Сезон ${season}`} title="Кубок конструкторов">
        {cs.status === 'success' && cs.data.round !== null && (
          <p className="lead">После этапа {cs.data.round}. Очки и позиции — как у источника, без пересчёта.</p>
        )}
      </PageHeader>
      <DataState
        state={cs}
        isEmpty={(d) => d.rows.length === 0}
        emptyText="Командный зачёт для этого сезона не опубликован. Кубок конструкторов разыгрывается с 1958 года."
        loadingRows={8}
      >
        {(d) => {
          const query = q.trim().toLowerCase();
          const rows = query ? d.rows.filter((r) => r.constructor.name.toLowerCase().includes(query)) : d.rows;
          return (
            <>
              <SearchBox value={q} onChange={setQ} label="Поиск команды" />
              {rows.length === 0 ? (
                <p className="muted">Ничего не найдено.</p>
              ) : (
                <SortableTable columns={columns} rows={rows} rowKey={(r) => r.constructor.id} caption={`Кубок конструкторов ${season}`} rowClassName={(r) => (isFav('constructors', r.constructor.id) ? 'row--fav' : undefined)} />
              )}
            </>
          );
        }}
      </DataState>
    </section>
  );
}
