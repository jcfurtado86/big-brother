import React from 'react';
import styles from './NightToggle.module.css';
import toggleStyles from './WeatherToggle.module.css';

export default function WeatherToggle({ active, onToggle }) {
  return (
    <button
      className={`${styles.btn} ${toggleStyles.btn} ${active ? styles.active : ''}`}
      onClick={onToggle}
      title={active ? 'Ocultar atmosfera' : 'Exibir atmosfera'}
    >
      🌧
    </button>
  );
}
