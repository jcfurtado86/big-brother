import React from 'react';
import styles from './LayerToggle.module.css';

const LAYERS = [
  { id: 'satellite', label: 'Satélite' },
  { id: 'street', label: 'Mapa' },
];

export default function LayerToggle({ current, onChange }) {
  return (
    <div className={styles.wrapper}>
      {LAYERS.map(l => (
        <button
          key={l.id}
          className={`${styles.btn} ${current === l.id ? styles.active : ''}`}
          onClick={() => onChange(l.id)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
