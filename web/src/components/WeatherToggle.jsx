import React, { useState, useEffect, useRef } from 'react';
import nightStyles from './NightToggle.module.css';
import styles from './WeatherToggle.module.css';

export default function WeatherToggle({ active, onToggle, opacity, onOpacityChange }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    function onClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [open]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {open && active && (
        <div className={styles.panel}>
          <label className={styles.sliderRow}>
            <span className={styles.sliderLabel}>Opacidade</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => onOpacityChange(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.sliderValue}>{Math.round(opacity * 100)}%</span>
          </label>
        </div>
      )}
      <button
        className={`${nightStyles.btn} ${styles.btn} ${active ? nightStyles.active : ''}`}
        onClick={() => { onToggle(); if (!active) setOpen(true); }}
        onContextMenu={(e) => { e.preventDefault(); if (active) setOpen(v => !v); }}
        title={active ? 'Clique: desligar | Botão direito: ajustar' : 'Exibir atmosfera'}
      >
        <span className={nightStyles.icon}>🌧️</span>
      </button>
    </div>
  );
}
