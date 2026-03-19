import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../utils/api';
import { GDELT_CATEGORY_META } from '../providers/gdeltIcons';
import styles from './GdeltToast.module.css';

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 10_000;
const POLL_INTERVAL = 15 * 60 * 1000;
const MAX_KNOWN_IDS = 2000;

export default function GdeltToast() {
  const [toasts, setToasts] = useState([]);
  const knownIdsRef = useRef(new Set());
  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const firstRunRef = useRef(true);

  const fetchNew = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const since = new Date(Date.now() - 16 * 60 * 1000).toISOString();
      const res = await fetch(`${API_URL}/api/gdelt/live?since=${since}`, { signal: ac.signal });
      if (!res.ok) return;

      const rows = await res.json();
      const fresh = [];

      for (const r of rows) {
        const id = r.id;
        if (knownIdsRef.current.has(id)) continue;
        knownIdsRef.current.add(id);
        fresh.push({
          id,
          title: r.title || '',
          domain: r.domain || '',
          socialimage: r.socialimage || '',
          eventType: r.event_type || 'conflict',
          toneLabel: r.tone_label || 'neutral',
          tone: r.tone ?? 0,
          ts: Date.now(),
        });
      }

      // Bound known IDs to prevent unbounded growth
      if (knownIdsRef.current.size > MAX_KNOWN_IDS) {
        const arr = [...knownIdsRef.current];
        knownIdsRef.current = new Set(arr.slice(arr.length - MAX_KNOWN_IDS));
      }

      // On first run, just populate known IDs without showing toasts
      if (firstRunRef.current) {
        firstRunRef.current = false;
        return;
      }

      if (fresh.length > 0) {
        setToasts(prev => [...fresh.slice(0, MAX_TOASTS), ...prev].slice(0, MAX_TOASTS));
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        // silent
      }
    }
  }, []);

  useEffect(() => {
    fetchNew();
    timerRef.current = setInterval(fetchNew, POLL_INTERVAL);
    return () => {
      clearInterval(timerRef.current);
      abortRef.current?.abort();
    };
  }, [fetchNew]);

  // Auto-dismiss
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(0, -1));
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toasts]);

  const dismiss = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map(t => {
        const meta = GDELT_CATEGORY_META[t.eventType] || GDELT_CATEGORY_META.conflict;
        return (
          <div
            key={t.id}
            className={styles.toast}
            style={{ borderLeftColor: meta.color }}
            onClick={() => dismiss(t.id)}
          >
            {t.socialimage && (
              <img
                className={styles.thumb}
                src={t.socialimage}
                alt=""
                onError={e => { e.target.style.display = 'none'; }}
              />
            )}
            <div className={styles.content}>
              <div className={styles.badge} style={{ background: meta.color }}>
                {meta.label}
              </div>
              <div className={styles.title}>{t.title}</div>
              <div className={styles.domain}>{t.domain}</div>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progress} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
