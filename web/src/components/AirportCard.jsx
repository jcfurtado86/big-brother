import React from 'react';
import styles from './AirportCard.module.css';
import { useTranslation } from 'react-i18next';
import { getFlagImgByCode } from '../providers/countryFlags';

export default function AirportCard({ airport, onClose }) {
  const { t } = useTranslation();
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
        <span className={styles.label}>{t('card.type')}</span>
        <span className={styles.value}>{t('airport.typeLabels.' + airport.type, { defaultValue: airport.type })}</span>

        <span className={styles.label}>{t('card.country')}</span>
        <span className={styles.value}>{airport.country || '—'}</span>

        {airport.city && <>
          <span className={styles.label}>{t('airport.city')}</span>
          <span className={styles.value}>{airport.city}</span>
        </>}

        <span className={styles.label}>{t('airport.coordinates')}</span>
        <span className={styles.value}>
          {airport.lat.toFixed(4)}, {airport.lon.toFixed(4)}
        </span>
      </div>
    </div>
  );
}
