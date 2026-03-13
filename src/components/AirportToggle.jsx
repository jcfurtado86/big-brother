import React, { useState, useEffect, useRef } from 'react';
import nightStyles from './NightToggle.module.css';
import styles from './AirportToggle.module.css';
import { AIRPORT_TYPES, AIRPORT_TYPE_META } from '../providers/airportIcons';

export default function AirportToggle({ activeTypes, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const hasAny = activeTypes.size > 0;

  function toggle(type) {
    const next = new Set(activeTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onChange(next);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    function onPointer(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {open && (
        <div className={styles.panel}>
          {AIRPORT_TYPES.map(type => {
            const meta = AIRPORT_TYPE_META[type];
            return (
              <label key={type} className={styles.row}>
                <span className={styles.dot} style={{ background: meta.color }} />
                <span className={styles.label}>{meta.label}</span>
                <input
                  type="checkbox"
                  checked={activeTypes.has(type)}
                  onChange={() => toggle(type)}
                />
              </label>
            );
          })}
        </div>
      )}
      <button
        className={`${nightStyles.btn} ${styles.btn} ${hasAny ? nightStyles.active : ''}`}
        onClick={() => setOpen(v => !v)}
        title="Aeroportos"
      >
        ⊞
      </button>
    </div>
  );
}
