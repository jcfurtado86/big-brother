import { AIRSPACE_CATEGORY_META } from '../providers/airspaceIcons';
import styles from './NuclearCard.module.css';

function Row({ label, value }) {
  if (value == null || value === '') return null;
  return <>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value}</span>
  </>;
}

export default function AirspaceCard({ airspace, onClose }) {
  if (!airspace) return null;

  const meta = AIRSPACE_CATEGORY_META[airspace.category] ?? { label: airspace.category, color: '#FF5722' };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={{ color: meta.color }}>
            {airspace.name || meta.label}
          </div>
          <div className={styles.sub}>{meta.label}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <Row label="Pais" value={airspace.country} />
        <Row label="Teto" value={airspace.upperLimit} />
        <Row label="Piso" value={airspace.lowerLimit} />
        <Row label="Centro" value={
          airspace.lat != null
            ? `${airspace.lat.toFixed(4)}°, ${airspace.lon.toFixed(4)}°`
            : null
        } />
      </div>
    </div>
  );
}
