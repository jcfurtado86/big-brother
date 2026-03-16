import React from 'react';
import styles from './AirportCard.module.css';
import { getFlagImgByCode } from '../providers/countryFlags';

const TYPE_LABEL = {
  large_airport:  'Aeroporto grande',
  medium_airport: 'Aeroporto médio',
  small_airport:  'Aeroporto pequeno',
  heliport:       'Heliporto',
  seaplane_base:  'Base de hidroavião',
  balloonport:    'Porto de balões',
};

export default function AirportCard({ airport, onClose }) {
  if (!airport) return null;

  const flagImg = getFlagImgByCode(airport.country);
  const flagSrc = flagImg?.src ?? null;
  const codes   = [airport.iata, airport.icao].filter(Boolean).join(' / ');

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {flagSrc && <img src={flagSrc} className={styles.headerFlag} alt="" />}
          <div>
            <div className={styles.name}>{airport.name}</div>
            <div className={styles.codes}>{codes}</div>
          </div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <span className={styles.label}>Tipo</span>
        <span className={styles.value}>{TYPE_LABEL[airport.type] || airport.type}</span>

        <span className={styles.label}>País</span>
        <span className={styles.value}>{airport.country || '—'}</span>

        {airport.city && <>
          <span className={styles.label}>Cidade</span>
          <span className={styles.value}>{airport.city}</span>
        </>}

        <span className={styles.label}>Coordenadas</span>
        <span className={styles.value}>
          {airport.lat.toFixed(4)}, {airport.lon.toFixed(4)}
        </span>
      </div>
    </div>
  );
}
