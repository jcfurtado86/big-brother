import React from 'react';
import styles from './InfoBar.module.css';

export default function InfoBar({ coords, mouseCoords }) {
  const display = mouseCoords ?? coords;
  const { lat, lon, alt } = display;
  return (
    <div className={styles.bar}>
      <span>Lat: {lat ?? '—'}  Lon: {lon ?? '—'}</span>
      <span>Alt: {coords.alt != null ? `${coords.alt} km` : '—'}</span>
    </div>
  );
}
