import styles from './SatelliteCard.module.css';
import { useTranslation } from 'react-i18next';
import { getSatelliteCategory, SATELLITE_CATEGORY_META } from '../providers/satelliteIcons';

function Row({ label, value }) {
  if (value == null || value === '') return null;
  return <>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value}</span>
  </>;
}

function formatAge(epoch, t) {
  if (!epoch) return null;
  const days = (Date.now() - epoch.getTime()) / 86_400_000;
  if (days < 1) return `${Math.round(days * 24)}h`;
  return `${days.toFixed(1)} ${t('satellite.days')}`;
}

export default function SatelliteCard({ satellite, onClose }) {
  const { t } = useTranslation();
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
        <span className={styles.label}>{t('satellite.orbit')}</span>
        <span className={styles.value}>{t(meta.label)}</span>

        <Row label={t('card.altitude')} value={satellite.alt != null ? `${Math.round(satellite.alt)} km` : null} />

        <Row label={t('card.speed')} value={satellite.velocity != null ? `${satellite.velocity.toFixed(2)} km/s` : null} />

        <Row label={t('satellite.inclination')} value={satellite.inclination != null ? `${satellite.inclination.toFixed(2)}°` : null} />

        <Row label={t('satellite.period')} value={satellite.period != null ? `${satellite.period.toFixed(1)} min` : null} />

        <Row label={t('satellite.revDay')} value={satellite.meanMotion != null ? satellite.meanMotion.toFixed(2) : null} />

        <Row label={t('satellite.eccentricity')} value={satellite.eccentricity != null ? satellite.eccentricity.toFixed(6) : null} />

        <Row label={t('card.position')} value={
          satellite.lat != null
            ? `${satellite.lat.toFixed(2)}°, ${satellite.lon.toFixed(2)}°`
            : null
        } />

        <Row label={t('satellite.tleAge')} value={formatAge(satellite.epoch, t)} />
      </div>
    </div>
  );
}
