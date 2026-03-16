import React from 'react';
import styles from './LayerToggle.module.css';

export default function LayerToggle({ options, current, onChange }) {
  return (
    <div className={styles.wrapper}>
      {options.map(l => (
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
