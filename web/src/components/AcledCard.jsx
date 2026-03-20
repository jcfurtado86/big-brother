import { useTranslation } from 'react-i18next';
import { ACLED_CATEGORY_META } from '../providers/acledIcons';
import { Row, styles } from './DetailCardParts';
import { useGdeltRelated } from '../hooks/useGdeltRelated';
import { TONE_COLORS } from '../providers/gdeltIcons';

export default function AcledCard({ acled, onClose }) {
  const { t } = useTranslation();
  // Hook must be called before any early return (Rules of Hooks)
  const { articles, loading } = useGdeltRelated(acled?.lat, acled?.lon, acled?.date, acled?.eventType, acled?.country, acled?.location);

  if (!acled) return null;

  const meta = ACLED_CATEGORY_META[acled.category] ?? { label: acled.category, color: '#E91E63' };
  const images = articles.filter(a => a.socialimage).slice(0, 3);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={{ color: meta.color }}>
            {acled.location || acled.subEventType || t(meta.label)}
          </div>
          <div className={styles.sub}>{t(meta.label)}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <Row label={t('card.type')} value={acled.eventType} />
        <Row label={t('card.subtype')} value={acled.subEventType} />
        <Row label={t('acled.disorder')} value={acled.disorderType} />
        <Row label={t('card.date')} value={acled.date ? acled.date.slice(0, 10).split('-').reverse().join('/') : null} />
        <Row label={t('card.country')} value={acled.country} />
        <Row label={t('acled.region')} value={acled.region} />
        <Row label="Admin 1" value={acled.admin1} />
        <Row label="Admin 2" value={acled.admin2} />
        <Row label={t('acled.events')} value={acled.events > 1 ? String(acled.events) : null} />
        <Row label={t('acled.fatalities')} value={acled.fatalities > 0 ? String(acled.fatalities) : null} />
        <Row label={t('acled.actor1')} value={acled.actor1} />
        <Row label={t('acled.actor2')} value={acled.actor2} />
        <Row label={t('card.source')} value={acled.source} />
        <Row label={t('card.position')} value={
          acled.lat != null
            ? `${acled.lat.toFixed(4)}, ${acled.lon.toFixed(4)}`
            : null
        } />
        {acled.notes && (
          <Row label={t('acled.notes')} value={acled.notes} />
        )}
      </div>

      {/* GDELT Media Section */}
      <div className={styles.mediaSection}>
        <div className={styles.mediaTitle}>{t('acled.mediaCoverage')}</div>

        {loading && (
          <div className={styles.skeletonGroup}>
            <div className={styles.skeleton} style={{ width: '100%' }} />
            <div className={styles.skeleton} style={{ width: '80%' }} />
            <div className={styles.skeleton} style={{ width: '60%' }} />
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className={styles.mediaEmpty}>{t('acled.noNewsFound')}</div>
        )}

        {!loading && images.length > 0 && (
          <div className={styles.mediaImages}>
            {images.map(a => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                <img
                  className={styles.mediaThumb}
                  src={a.socialimage}
                  alt=""
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </a>
            ))}
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div className={styles.articleList}>
            {articles.slice(0, 10).map(a => (
              <div key={a.id} className={styles.articleItem}>
                <a className={styles.articleTitle} href={a.url} target="_blank" rel="noreferrer">
                  {a.title}
                </a>
                <div className={styles.articleMeta}>
                  <span
                    className={styles.toneDot}
                    style={{ background: TONE_COLORS[a.tone_label] || TONE_COLORS.neutral }}
                  />
                  {a.domain}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
