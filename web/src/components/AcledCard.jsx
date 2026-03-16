import { ACLED_CATEGORY_META } from '../providers/acledIcons';
import { Row, styles } from './DetailCardParts';

export default function AcledCard({ acled, onClose }) {
  if (!acled) return null;

  const meta = ACLED_CATEGORY_META[acled.category] ?? { label: acled.category, color: '#E91E63' };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={{ color: meta.color }}>
            {acled.location || acled.subEventType || meta.label}
          </div>
          <div className={styles.sub}>{meta.label}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <Row label="Tipo" value={acled.eventType} />
        <Row label="Subtipo" value={acled.subEventType} />
        <Row label="Desordem" value={acled.disorderType} />
        <Row label="Semana" value={acled.date} />
        <Row label="Pais" value={acled.country} />
        <Row label="Regiao" value={acled.region} />
        <Row label="Admin 1" value={acled.admin1} />
        <Row label="Admin 2" value={acled.admin2} />
        <Row label="Eventos" value={acled.events > 1 ? String(acled.events) : null} />
        <Row label="Fatalidades" value={acled.fatalities > 0 ? String(acled.fatalities) : null} />
        <Row label="Ator 1" value={acled.actor1} />
        <Row label="Ator 2" value={acled.actor2} />
        <Row label="Fonte" value={acled.source} />
        <Row label="Posicao" value={
          acled.lat != null
            ? `${acled.lat.toFixed(4)}, ${acled.lon.toFixed(4)}`
            : null
        } />
        {acled.notes && (
          <Row label="Notas" value={acled.notes} />
        )}
      </div>
    </div>
  );
}
