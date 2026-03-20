import React from 'react';
import styles from './FlightCard.module.css';
import { useTranslation } from 'react-i18next';
import { getCategoryType } from '../providers/planeIcons';
import { getFlagImg } from '../providers/countryFlags';
import { useAircraftMeta } from '../hooks/useAircraftMeta';
import { getAirlineLogo, markLogoFailed } from '../providers/airlineLogos';
import { getAirlineFromCallsign } from '../providers/airlineCodes';
import { toKt, toFt, toCompass, toVs } from '../utils/unitConversion';
import { useLayerState } from '../contexts/LayerContext';

export default function FlightCard({ flight, onClose }) {
  const { t } = useTranslation();
  const { provider: flightProvider } = useLayerState('flights');
  const meta = useAircraftMeta(flight?.icao24 ?? null, flightProvider, flight);

  if (!flight) return null;

  const callsign  = flight.callsign || flight.icao24;
  const type      = getCategoryType(flight.category, flight.velocity, flight.altitude, flight.military);
  const onGround  = flight.altitude === 0 && flight.velocity < 2;
  const vs        = toVs(flight.verticalRate);
  const squawk    = flight.squawk || null;
  const isEmergencySquawk = squawk === '7700' || squawk === '7600' || squawk === '7500';
  const flagImg   = getFlagImg(flight.country);
  const flagSrc   = flagImg?.src ?? null;

  // Fallback: inferir companhia pelo prefixo ICAO do callsign
  const csAirline   = getAirlineFromCallsign(flight.callsign);
  const airlineIata = meta?.airlineIata || csAirline?.iata || null;
  const airlineName = meta?.operator    || csAirline?.name || null;
  const logoUrl     = airlineIata ? getAirlineLogo(airlineIata) : null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {logoUrl && (
            <img
              src={logoUrl}
              className={styles.airlineLogo}
              alt=""
              onError={(e) => { markLogoFailed(airlineIata); e.target.style.display = 'none'; }}
            />
          )}
          <div>
            <div className={styles.callsign}>{callsign}</div>
            {airlineName && <div className={styles.airline}>{airlineName}</div>}
            <div className={styles.icao}>
              {flight.icao24}
              {meta?.registration && <span className={styles.reg}> · {meta.registration}</span>}
            </div>
          </div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <span className={styles.label}>{t('card.country')}</span>
        <span className={styles.value}>
          {flagSrc && <img src={flagSrc} className={styles.flag} alt="" />}
          {flight.country || '—'}
        </span>

        {meta?.manufacturer && <>
          <span className={styles.label}>{t('flight.manufacturer')}</span>
          <span className={styles.value}>{meta.manufacturer}</span>
        </>}

        {meta?.model && <>
          <span className={styles.label}>{t('card.model')}</span>
          <span className={styles.value}>{meta.model}</span>
        </>}

        {meta?.built && <>
          <span className={styles.label}>{t('flight.year')}</span>
          <span className={styles.value}>{meta.built}</span>
        </>}

        <span className={styles.label}>{t('card.type')}</span>
        <span className={styles.value}>{t('cat.flight.' + type)}</span>

        <span className={styles.label}>{t('card.status')}</span>
        <span className={styles.value}>{onGround ? t('flight.onGround') : t('flight.inFlight')}</span>

        <span className={styles.label}>{t('card.altitude')}</span>
        <span className={styles.value}>{toFt(flight.altitude)} ft</span>

        {vs && <>
          <span className={styles.label}>{t('flight.vs')}</span>
          <span className={styles.value}>{vs}</span>
        </>}

        <span className={styles.label}>{t('card.speed')}</span>
        <span className={styles.value}>{toKt(flight.velocity)} kt</span>

        <span className={styles.label}>{t('card.heading')}</span>
        <span className={styles.value}>{Math.round(flight.heading)}° {toCompass(flight.heading)}</span>

        {squawk && <>
          <span className={styles.label}>{t('flight.squawk')}</span>
          <span className={isEmergencySquawk ? styles.emergency : styles.value}>{squawk}</span>
        </>}
      </div>

    </div>
  );
}
