import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../utils/api';

export function useGdeltRelated(lat, lng, date, eventType, country) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (lat == null || lng == null || !date) {
      setArticles([]);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);

    const dateStr = typeof date === 'string' ? date.slice(0, 10) : new Date(date).toISOString().slice(0, 10);
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      date: dateStr,
      event_type: eventType || '',
      country: country || '',
    });

    fetch(`${API_URL}/api/gdelt/related?${params}`, { signal: ac.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (!ac.signal.aborted) {
          setArticles(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(e => {
        if (e.name !== 'AbortError') {
          setError(e.message);
          setLoading(false);
        }
      });

    return () => ac.abort();
  }, [lat, lng, date, eventType, country]);

  return { articles, loading, error };
}
