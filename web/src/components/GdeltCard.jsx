import { useTranslation } from 'react-i18next';
import { GDELT_CATEGORY_META, TONE_COLORS, TONE_LABELS } from '../providers/gdeltIcons';
import { Row, LinkRow, styles } from './DetailCardParts';

export default function GdeltCard({ gdelt, onClose }) {
  const { t, i18n } = useTranslation();
  if (!gdelt) return null;

  const meta = GDELT_CATEGORY_META[gdelt.category] ?? { label: gdelt.category, color: '#E53935' };
  const toneColor = TONE_COLORS[gdelt.toneLabel] || TONE_COLORS.neutral;
  const toneText = t('tone.' + (gdelt.toneLabel || 'neutral'));

  const dateStr = gdelt.sourceDate
    ? new Date(gdelt.sourceDate).toLocaleDateString(i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={{ color: meta.color }}>
            {gdelt.actionGeoName || t(meta.label)}
          </div>
          <div className={styles.sub}>GDELT — {t(meta.label)}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      {gdelt.socialimage && (
        <a href={gdelt.url} target="_blank" rel="noreferrer">
          <img
            src={gdelt.socialimage}
            alt=""
            style={{
              width: '100%',
              maxHeight: 120,
              objectFit: 'cover',
              borderRadius: 8,
              marginBottom: 10,
              cursor: 'pointer',
            }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </a>
      )}

      <div className={styles.grid}>
        <Row label={t('gdelt.event')} value={gdelt.title} />
        <Row label={t('card.type')} value={t(meta.label)} />
        <Row label={t('briefing.tone')} value={
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: toneColor, display: 'inline-block' }} />
            {toneText} ({gdelt.tone?.toFixed(1)})
          </span>
        } />
        {gdelt.goldsteinScale != null && (
          <Row label="Goldstein" value={gdelt.goldsteinScale.toFixed(1)} />
        )}
        <Row label={t('gdelt.location')} value={gdelt.actionGeoName} />
        <Row label={t('card.country')} value={gdelt.country} />
        {gdelt.actor1Name && <Row label={t('acled.actor1')} value={gdelt.actor1Name} />}
        {gdelt.actor2Name && <Row label={t('acled.actor2')} value={gdelt.actor2Name} />}
        <Row label={t('card.source')} value={gdelt.domain} />
        <Row label={t('card.date')} value={dateStr} />
        <Row label={t('card.position')} value={
          gdelt.lat != null
            ? `${gdelt.lat.toFixed(4)}, ${(gdelt.lon ?? gdelt.lng).toFixed(4)}`
            : null
        } />
        {gdelt.url && <LinkRow label={t('gdelt.article')} url={gdelt.url} text={t('card.open')} />}
      </div>
    </div>
  );
}
