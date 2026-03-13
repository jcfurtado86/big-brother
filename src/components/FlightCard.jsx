import React from 'react';
import styles from './FlightCard.module.css';
import { getCategoryType } from '../providers/planeIcons';

const TYPE_LABEL = {
  heavy:      'Heavy (wide-body)',
  large:      'Large jet',
  regional:   'Regional / turboprop',
  light:      'Light / GA',
  helicopter: 'Helicopter',
  uav:        'UAV / drone',
  unknown:    'Unknown',
};

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function toKt(ms)     { return Math.round(ms  * 1.94384); }
function toFt(m)      { return Math.round(m   * 3.28084).toLocaleString(); }
function toCompass(d) { return COMPASS[Math.round(d / 45) % 8]; }

export default function FlightCard({ flight, onClose }) {
  if (!flight) return null;

  const callsign = flight.callsign || flight.icao24;
  const type     = getCategoryType(flight.category, flight.velocity, flight.altitude);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.callsign}>{callsign}</div>
          <div className={styles.icao}>{flight.icao24}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <span className={styles.label}>País</span>
        <span className={styles.value}>{flight.country || '—'}</span>

        <span className={styles.label}>Tipo</span>
        <span className={styles.value}>{TYPE_LABEL[type]}</span>

        <span className={styles.label}>Altitude</span>
        <span className={styles.value}>{toFt(flight.altitude)} ft</span>

        <span className={styles.label}>Velocidade</span>
        <span className={styles.value}>{toKt(flight.velocity)} kt</span>

        <span className={styles.label}>Rumo</span>
        <span className={styles.value}>{Math.round(flight.heading)}° {toCompass(flight.heading)}</span>
      </div>
    </div>
  );
}
