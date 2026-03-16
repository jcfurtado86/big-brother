import { ATC_CATEGORY_META } from '../providers/atcIcons';
import { Row, styles } from './DetailCardParts';

export default function AtcCard({ atc, onClose }) {
  if (!atc) return null;

  const meta = ATC_CATEGORY_META[atc.category] ?? ATC_CATEGORY_META.radar;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={{ color: meta.color }}>
            {atc.name || atc.icao || meta.label}
          </div>
          <div className={styles.sub}>{meta.label}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <Row label="ICAO" value={atc.icao} />
        <Row label="Operador" value={atc.operator} />
        <Row label="Altura" value={atc.height ? `${atc.height} m` : null} />
        <Row label="Elevacao" value={atc.ele ? `${atc.ele} m` : null} />
        <Row label="Frequencia" value={atc.frequency ? `${atc.frequency} MHz` : null} />
        <Row label="Posicao" value={
          atc.lat != null
            ? `${atc.lat.toFixed(4)}°, ${atc.lon.toFixed(4)}°`
            : null
        } />
        {atc.description && (
          <Row label="Info" value={atc.description} />
        )}
      </div>
    </div>
  );
}
