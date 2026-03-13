import React from 'react';
import styles from './NightToggle.module.css';

export default function NightToggle({ active, onToggle }) {
  return (
    <button
      className={`${styles.btn} ${active ? styles.active : ''}`}
      onClick={onToggle}
      title={active ? 'Desativar visão noturna' : 'Ativar visão noturna'}
    >
      🌙
    </button>
  );
}
