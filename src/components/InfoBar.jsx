import React from 'react';
import styles from './InfoBar.module.css';

export default function InfoBar({ coords }) {
  const { lat, lon, alt } = coords;
  return (
    <div className={styles.bar}>
      <span>Lat: {lat ?? '—'}  Lon: {lon ?? '—'}</span>
      <span>Alt: {alt != null ? `${alt} km` : '—'}</span>
    </div>
  );
}
