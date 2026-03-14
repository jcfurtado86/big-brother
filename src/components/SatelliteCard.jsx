import styles from './SatelliteCard.module.css';
import { getSatelliteCategory, SATELLITE_CATEGORY_META } from '../providers/satelliteIcons';

function Row({ label, value }) {
  if (value == null || value === '') return null;
  return <>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value}</span>
  </>;
}

function formatAge(epoch) {
  if (!epoch) return null;
  const days = (Date.now() - epoch.getTime()) / 86_400_000;
  if (days < 1) return `${Math.round(days * 24)}h`;
  return `${days.toFixed(1)} dias`;
}

export default function SatelliteCard({ satellite, onClose }) {
  if (!satellite) return null;

  const category = getSatelliteCategory(satellite.alt ?? 0);
  const meta = SATELLITE_CATEGORY_META[category];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name}>{satellite.name}</div>
          <div className={styles.norad}>NORAD {satellite.noradId}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <span className={styles.label}>Orbita</span>
        <span className={styles.value}>{meta.label}</span>

        <Row label="Altitude" value={satellite.alt != null ? `${Math.round(satellite.alt)} km` : null} />

        <Row label="Velocidade" value={satellite.velocity != null ? `${satellite.velocity.toFixed(2)} km/s` : null} />

        <Row label="Inclinacao" value={satellite.inclination != null ? `${satellite.inclination.toFixed(2)}°` : null} />

        <Row label="Periodo" value={satellite.period != null ? `${satellite.period.toFixed(1)} min` : null} />

        <Row label="Rev/dia" value={satellite.meanMotion != null ? satellite.meanMotion.toFixed(2) : null} />

        <Row label="Excentric." value={satellite.eccentricity != null ? satellite.eccentricity.toFixed(6) : null} />

        <Row label="Posicao" value={
          satellite.lat != null
            ? `${satellite.lat.toFixed(2)}°, ${satellite.lon.toFixed(2)}°`
            : null
        } />

        <Row label="Idade TLE" value={formatAge(satellite.epoch)} />
      </div>
    </div>
  );
}
