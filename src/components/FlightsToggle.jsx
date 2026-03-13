import React from 'react';
import styles from './NightToggle.module.css';
import toggleStyles from './FlightsToggle.module.css';

export default function FlightsToggle({ active, onToggle }) {
  return (
    <button
      className={`${styles.btn} ${toggleStyles.btn} ${active ? styles.active : ''}`}
      onClick={onToggle}
      title={active ? 'Ocultar aviões' : 'Exibir aviões'}
    >
      ✈
    </button>
  );
}
