import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../utils/api';
import { GDELT_CATEGORY_META } from '../providers/gdeltIcons';
import styles from './GdeltToast.module.css';

const MAX_TOASTS = 5;
const POLL_INTERVAL = 15 * 60 * 1000;
const MAX_KNOWN_IDS = 2000;

// Only show toasts for extremely critical events
function isCritical(r) {
  return (r.goldstein_scale != null && r.goldstein_scale <= -7)
      || (r.tone != null && r.tone <= -15);
}

export default function GdeltToast({ onFlyTo, onGdeltSelect }) {
  const { t } = useTranslation();
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
        if (!isCritical(r)) continue;
        fresh.push({
          id,
          title: r.title || '',
          url: r.url || '',
          domain: r.domain || '',
          socialimage: r.socialimage || '',
          eventType: r.event_type || 'conflict',
          toneLabel: r.tone_label || 'neutral',
          tone: r.tone ?? 0,
          goldstein: r.goldstein_scale ?? 0,
          lat: r.lat,
          lng: r.lng,
          country: r.country || '',
          actionGeo: r.action_geo_name || '',
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

  const handleClick = (toast) => {
    if (toast.lat != null && toast.lng != null && onFlyTo) {
      onFlyTo(toast.lat, toast.lng);
    }
    if (onGdeltSelect) {
      onGdeltSelect({
        id: toast.id,
        title: toast.title,
        url: toast.url,
        domain: toast.domain,
        socialimage: toast.socialimage,
        event_type: toast.eventType,
        tone: toast.tone,
        tone_label: toast.toneLabel,
        goldstein_scale: toast.goldstein,
        lat: toast.lat,
        lng: toast.lng,
        country: toast.country,
        action_geo_name: toast.actionGeo,
      });
    }
    setToasts(prev => prev.filter(x => x.id !== toast.id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map(toast => {
        const meta = GDELT_CATEGORY_META[toast.eventType] || GDELT_CATEGORY_META.conflict;
        return (
          <div
            key={toast.id}
            className={styles.toast}
            style={{ borderLeftColor: meta.color, cursor: 'pointer', position: 'relative' }}
            onClick={() => handleClick(toast)}
          >
            <button
              className={styles.closeBtn}
              onClick={(e) => {
                e.stopPropagation();
                setToasts(prev => prev.filter(x => x.id !== toast.id));
              }}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                background: 'rgba(0,0,0,0.5)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                borderRadius: '50%',
                width: 20,
                height: 20,
                fontSize: 12,
                lineHeight: '18px',
                textAlign: 'center',
                padding: 0,
              }}
            >
              ×
            </button>
            {toast.socialimage && (
              <img
                className={styles.thumb}
                src={toast.socialimage}
                alt=""
                onError={e => { e.target.style.display = 'none'; }}
              />
            )}
            <div className={styles.content}>
              <div className={styles.badge} style={{ background: meta.color }}>
                {t(meta.label)}
              </div>
              <div className={styles.title}>{toast.title}</div>
              <div className={styles.domain}>{toast.domain}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
