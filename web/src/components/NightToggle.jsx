import React from 'react';
import styles from './NightToggle.module.css';

export default function NightToggle({ active, onToggle }) {
  return (
    <button
      className={`${styles.btn} ${active ? styles.active : ''}`}
      onClick={onToggle}
      title={active ? 'Ocultar ciclo dia/noite' : 'Exibir ciclo dia/noite'}
    >
      <span className={styles.icon}>🌙</span>
    </button>
  );
}
