import React, { useState, useRef, useEffect } from 'react';
import styles from './SearchBox.module.css';
import { SEARCH_LIMIT, NOMINATIM_URL } from '../providers/constants';

export default function SearchBox({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const timeoutRef = useRef(null);
  const skipFetchRef = useRef(false);

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    if (query.length < 3) {
      setResults([]);
      return;
    }
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fetchLocations(query), 400);
    return () => clearTimeout(timeoutRef.current);
  }, [query]);

  async function fetchLocations(q) {
    try {
      const limit = SEARCH_LIMIT;
      const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=${limit}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR,pt' } });
      setResults(await res.json());
    } catch (e) {
      console.error(e);
    }
  }

  function handleSelect(place) {
    onSelect(parseFloat(place.lat), parseFloat(place.lon));
    skipFetchRef.current = true;
    setQuery(place.display_name.split(',')[0]);
    setResults([]);
  }

  return (
    <div className={styles.wrapper}>
      <input
        className={styles.input}
        type="text"
        placeholder="Buscar local..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && setResults([])}
        autoComplete="off"
      />
      {results.length > 0 && (
        <ul className={styles.list}>
          {results.map(place => (
            <li key={place.place_id} className={styles.item} onClick={() => handleSelect(place)}>
              {place.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
