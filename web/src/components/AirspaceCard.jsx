import { useTranslation } from 'react-i18next';
import { AIRSPACE_CATEGORY_META } from '../providers/airspaceIcons';
import { Row, styles } from './DetailCardParts';

export default function AirspaceCard({ airspace, onClose }) {
  const { t } = useTranslation();
  if (!airspace) return null;

  const meta = AIRSPACE_CATEGORY_META[airspace.category] ?? { label: airspace.category, color: '#FF5722' };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={{ color: meta.color }}>
            {airspace.name || t(meta.label)}
          </div>
          <div className={styles.sub}>{t(meta.label)}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <Row label={t('card.country')} value={airspace.country} />
        <Row label={t('card.ceiling')} value={airspace.upperLimit} />
        <Row label={t('card.floor')} value={airspace.lowerLimit} />
        <Row label={t('card.center')} value={
          airspace.lat != null
            ? `${airspace.lat.toFixed(4)}°, ${airspace.lon.toFixed(4)}°`
            : null
        } />
      </div>
    </div>
  );
}
