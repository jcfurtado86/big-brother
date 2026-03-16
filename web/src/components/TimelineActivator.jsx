import React, { useState } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import styles from './TimelineActivator.module.css';

const RANGES = [
  { label: 'Última 1h',   ms: 1 * 60 * 60_000 },
  { label: 'Últimas 6h',  ms: 6 * 60 * 60_000 },
  { label: 'Últimas 12h', ms: 12 * 60 * 60_000 },
  { label: 'Últimas 24h', ms: 24 * 60 * 60_000 },
  { label: 'Últimos 3d',  ms: 3 * 24 * 60 * 60_000 },
  { label: 'Últimos 7d',  ms: 7 * 24 * 60 * 60_000 },
];

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function TimelineActivator() {
  const tl = useTimeline();
  const [open, setOpen] = useState(false);

  function handleSelect(ms) {
    const now = Date.now();
    tl.activate(now - ms, now);
    setOpen(false);
  }

  if (tl.active) return null; // hide when timeline is active (TimelineBar takes over)

  return (
    <>
      <button
        className={`${styles.btn} ${open ? styles.btnActive : ''}`}
        onClick={() => setOpen(v => !v)}
        title="Timeline histórica"
      >
        <ClockIcon />
      </button>

      {open && (
        <>
          <div className={styles.overlay} onClick={() => setOpen(false)} />
          <div className={styles.dropdown}>
            {RANGES.map(r => (
              <button key={r.ms} className={styles.option} onClick={() => handleSelect(r.ms)}>
                {r.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
