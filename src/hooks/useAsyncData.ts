import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
} from 'react';

export type AsyncData<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'ready'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: Error };

function sameDeps(a: DependencyList | null, b: DependencyList): boolean {
  return (
    a !== null && a.length === b.length && a.every((v, i) => Object.is(v, b[i]))
  );
}

/**
 * Runs `load` and tracks loading/ready/error, ignoring results that arrive
 * after the screen has moved on.
 *
 * - When `deps` change (e.g. a different exercise id) it shows loading again.
 * - When `refreshKey` changes or `reload()` is called, it refreshes quietly,
 *   keeping the current data on screen until the new data arrives.
 */
export function useAsyncData<T>(
  load: () => Promise<T>,
  deps: DependencyList,
  refreshKey: unknown = null,
): AsyncData<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncData<T>>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  const lastDeps = useRef<DependencyList | null>(null);

  useEffect(() => {
    let current = true;
    if (!sameDeps(lastDeps.current, deps)) {
      setState({ status: 'loading' });
    }
    lastDeps.current = deps;
    loadRef.current().then(
      data => current && setState({ status: 'ready', data }),
      error =>
        current &&
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        }),
    );
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version, refreshKey]);

  const reload = useCallback(() => setVersion(v => v + 1), []);
  return { ...state, reload };
}
