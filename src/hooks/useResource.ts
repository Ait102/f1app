import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataMeta, Fetched } from '../domain/types';

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T; meta: DataMeta }
  | { status: 'error'; error: unknown };

type Keyed<T> = ResourceState<T> & { key: string | null };

/**
 * Loads data for `key`. State is tied to the key, so switching season never
 * shows the previous season's data, and late responses are ignored.
 */
export function useResource<T>(
  key: string | null,
  load: (force: boolean) => Promise<Fetched<T>>,
): ResourceState<T> & { reload: () => void } {
  const [state, setState] = useState<Keyed<T>>({ status: 'loading', key });
  const [nonce, setNonce] = useState({ n: 0, force: false });
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    setState({ status: 'loading', key });
    loadRef.current(nonce.force).then(
      (res) => {
        if (!cancelled) setState({ status: 'success', key, data: res.data, meta: res.meta });
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'error', key, error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => ({ n: n.n + 1, force: true })), []);

  if (state.key !== key || key === null) return { status: 'loading', reload };
  return { ...state, reload };
}
