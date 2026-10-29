import type { ReactNode } from 'react';
import { ApiError, describeError } from '../api/client';
import type { DataMeta } from '../domain/types';
import type { ResourceState } from '../hooks/useResource';
import { formatDateTime } from '../domain/format';

interface Props<T> {
  state: ResourceState<T> & { reload: () => void };
  children: (data: T, meta: DataMeta) => ReactNode;
  isEmpty?: (data: T) => boolean;
  emptyText?: ReactNode;
  loadingRows?: number;
  /** Hide the source/refresh line (when the parent shows it). */
  hideMeta?: boolean;
}

export function Loading({ rows = 4, label = 'Загрузка данных…' }: { rows?: number; label?: string }) {
  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${92 - ((i * 13) % 30)}%` }} />
      ))}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const isRate = error instanceof ApiError && error.kind === 'rate-limit';
  return (
    <div className={`state state--error${isRate ? ' state--rate' : ''}`} role="alert">
      <p className="state__title">{isRate ? 'Слишком много запросов' : 'Не удалось загрузить данные'}</p>
      <p>{describeError(error)}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  );
}

export function EmptyBox({ children }: { children: ReactNode }) {
  return <div className="state state--empty">{children}</div>;
}

export function MetaLine({ meta, onRefresh }: { meta: DataMeta; onRefresh?: () => void }) {
  return (
    <div className={`meta${meta.stale ? ' meta--stale' : ''}`}>
      {meta.stale && (
        <p className="meta__warn" role="status">
          ⚠ {meta.staleReason} Показаны последние сохранённые данные.
        </p>
      )}
      <span>
        Источник:{' '}
        <a href={meta.sourceUrl} target="_blank" rel="noreferrer">
          {meta.provider}
        </a>{' '}
        · обновлено <time dateTime={meta.fetchedAt}>{formatDateTime(meta.fetchedAt)}</time>
      </span>
      {onRefresh && (
        <button type="button" className="btn btn--ghost btn--small" onClick={onRefresh}>
          Обновить
        </button>
      )}
    </div>
  );
}

export function DataState<T>({
  state,
  children,
  isEmpty,
  emptyText = 'Данных нет.',
  loadingRows,
  hideMeta,
}: Props<T>) {
  if (state.status === 'loading') return <Loading rows={loadingRows} />;
  if (state.status === 'error') return <ErrorBox error={state.error} onRetry={state.reload} />;
  const empty = isEmpty?.(state.data) ?? false;
  return (
    <>
      {empty ? <EmptyBox>{emptyText}</EmptyBox> : children(state.data, state.meta)}
      {!hideMeta && <MetaLine meta={state.meta} onRefresh={state.reload} />}
    </>
  );
}
