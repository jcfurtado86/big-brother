import styles from './TelecomCard.module.css';
import { useTranslation } from 'react-i18next';
import { TELECOM_CATEGORY_META } from '../providers/telecomIcons';

function Row({ label, value }) {
  if (value == null || value === '') return null;
  return <>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value}</span>
  </>;
}

export default function TelecomCard({ telecom, onClose }) {
  const { t } = useTranslation();
  if (!telecom) return null;

  const meta = TELECOM_CATEGORY_META[telecom.category] ?? {};

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={{ color: meta.color }}>
            {telecom.name || t(meta.label) || 'Telecom'}
          </div>
          <div className={styles.sub}>{t(meta.label)}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <Row label={t('card.operator')} value={telecom.operator} />
        <Row label={t('card.ref')} value={telecom.ref} />
        <Row label={t('card.position')} value={
          telecom.lat != null
            ? `${telecom.lat.toFixed(4)}°, ${telecom.lon.toFixed(4)}°`
            : null
        } />
      </div>
    </div>
  );
}
