import { useTranslation } from 'react-i18next';
import { ATC_CATEGORY_META } from '../providers/atcIcons';
import { Row, styles } from './DetailCardParts';

export default function AtcCard({ atc, onClose }) {
  const { t } = useTranslation();
  if (!atc) return null;

  const meta = ATC_CATEGORY_META[atc.category] ?? ATC_CATEGORY_META.radar;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={{ color: meta.color }}>
            {atc.name || atc.icao || t(meta.label)}
          </div>
          <div className={styles.sub}>{t(meta.label)}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <Row label="ICAO" value={atc.icao} />
        <Row label={t('card.operator')} value={atc.operator} />
        <Row label={t('card.height')} value={atc.height ? `${atc.height} m` : null} />
        <Row label={t('card.elevation')} value={atc.ele ? `${atc.ele} m` : null} />
        <Row label={t('card.frequency')} value={atc.frequency ? `${atc.frequency} MHz` : null} />
        <Row label={t('card.position')} value={
          atc.lat != null
            ? `${atc.lat.toFixed(4)}°, ${atc.lon.toFixed(4)}°`
            : null
        } />
        {atc.description && (
          <Row label={t('card.info')} value={atc.description} />
        )}
      </div>
    </div>
  );
}
