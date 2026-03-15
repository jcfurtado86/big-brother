import { createContext, useContext, useCallback, useRef, useSyncExternalStore } from 'react';

const LoadingContext = createContext(null);

// Simple counter with external store for zero-re-render increments
function createLoadingStore() {
  let count = 0;
  const listeners = new Set();
  const notify = () => listeners.forEach(fn => fn());

  return {
    inc() { count++; notify(); },
    dec() { count = Math.max(0, count - 1); notify(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    getSnapshot() { return count; },
  };
}

const store = createLoadingStore();

export function LoadingProvider({ children }) {
  return (
    <LoadingContext.Provider value={store}>
      {children}
    </LoadingContext.Provider>
  );
}

/** Returns current loading count (> 0 means something is loading) */
export function useLoadingCount() {
  const s = useContext(LoadingContext);
  return useSyncExternalStore(s.subscribe, s.getSnapshot);
}

/** Returns { start, done } to signal loading boundaries */
export function useLoading() {
  const s = useContext(LoadingContext);
  const active = useRef(false);
  const start = useCallback(() => {
    if (!active.current) { active.current = true; s.inc(); }
  }, [s]);
  const done = useCallback(() => {
    if (active.current) { active.current = false; s.dec(); }
  }, [s]);
  return { start, done };
}
