import { useTranslation } from 'react-i18next';
import { MILITARY_CATEGORY_META, MILITARY_SERVICE_LABELS } from '../providers/militaryIcons';
import { Row, LinkRow, styles } from './DetailCardParts';

function formatService(raw, t) {
  if (!raw) return null;
  return raw.split(';').map(s => {
    const key = MILITARY_SERVICE_LABELS[s.trim()];
    return key ? t(key) : s.trim();
  }).join(', ');
}

function formatAccess(raw, t) {
  if (!raw) return null;
  return t('military.accessLabels.' + raw) || raw;
}

function formatFunction(raw, t) {
  if (!raw) return null;
  return t('military.functionLabels.' + raw) || raw;
}

function wikiUrl(wikipedia) {
  if (!wikipedia) return null;
  const [lang, ...rest] = wikipedia.split(':');
  const title = rest.join(':');
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`;
}

export default function MilitaryCard({ military, onClose }) {
  const { t } = useTranslation();
  if (!military) return null;

  const meta = MILITARY_CATEGORY_META[military.category] ?? { label: military.category, color: '#E91E63' };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={{ color: meta.color }}>
            {military.name || military.ref || t(meta.label)}
          </div>
          <div className={styles.sub}>{t(meta.label)}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <Row label={t('military.branch')} value={formatService(military.militaryService, t)} />
        <Row label={t('military.unit')} value={military.serviceBranch} />
        <Row label={t('military.function')} value={formatFunction(military.baseFunction, t)} />
        <Row label={t('card.operator')} value={military.operator} />
        <Row label={t('card.country')} value={military.country} />
        <Row label={t('card.ref')} value={military.ref} />
        <Row label="ICAO" value={military.icao} />
        <Row label="IATA" value={military.iata} />
        <Row label={t('military.access')} value={formatAccess(military.access, t)} />
        <Row label={t('card.elevation')} value={military.ele ? `${military.ele} m` : null} />
        <Row label={t('military.founded')} value={military.startDate} />
        <Row label={t('card.position')} value={
          military.lat != null
            ? `${military.lat.toFixed(4)}°, ${military.lon.toFixed(4)}°`
            : null
        } />
        {military.description && (
          <Row label={t('card.info')} value={military.description} />
        )}
        <LinkRow label={t('military.website')} url={military.website} text={t('card.open')} />
        <LinkRow label={t('military.wikipedia')} url={wikiUrl(military.wikipedia)} text={military.wikipedia?.split(':').slice(1).join(':')} />
        {military.wikidata && (
          <LinkRow label={t('military.wikidata')} url={`https://www.wikidata.org/wiki/${military.wikidata}`} text={military.wikidata} />
        )}
      </div>
    </div>
  );
}
