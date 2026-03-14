import React from 'react';
import styles from './FlightCard.module.css';
import { getCategoryType } from '../providers/planeIcons';
import { getFlagImg } from '../providers/countryFlags';
import { useAircraftMeta } from '../hooks/useAircraftMeta';
import { getAirlineLogo, markLogoFailed } from '../providers/airlineLogos';
import { getAirlineFromCallsign } from '../providers/airlineCodes';
import { toKt, toFt, toCompass } from '../utils/unitConversion';

const TYPE_LABEL = {
  heavy:      'Heavy (wide-body)',
  large:      'Large jet',
  regional:   'Regional / turboprop',
  light:      'Light / GA',
  helicopter: 'Helicopter',
  uav:        'UAV / drone',
  military:   'Militar',
  unknown:    'Unknown',
};

export default function FlightCard({ flight, onClose, flightProvider }) {
  const meta = useAircraftMeta(flight?.icao24 ?? null, flightProvider, flight);

  if (!flight) return null;

  const callsign  = flight.callsign || flight.icao24;
  const type      = getCategoryType(flight.category, flight.velocity, flight.altitude, flight.military);
  const onGround  = flight.altitude === 0 && flight.velocity < 2;
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
        <span className={styles.label}>País</span>
        <span className={styles.value}>
          {flagSrc && <img src={flagSrc} className={styles.flag} alt="" />}
          {flight.country || '—'}
        </span>

        {meta?.manufacturer && <>
          <span className={styles.label}>Fabricante</span>
          <span className={styles.value}>{meta.manufacturer}</span>
        </>}

        {meta?.model && <>
          <span className={styles.label}>Modelo</span>
          <span className={styles.value}>{meta.model}</span>
        </>}

        {meta?.built && <>
          <span className={styles.label}>Ano</span>
          <span className={styles.value}>{meta.built}</span>
        </>}

        <span className={styles.label}>Tipo</span>
        <span className={styles.value}>{TYPE_LABEL[type]}</span>

        <span className={styles.label}>Status</span>
        <span className={styles.value}>{onGround ? 'No solo' : 'Em voo'}</span>

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
