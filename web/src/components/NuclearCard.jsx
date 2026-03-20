import { useTranslation } from 'react-i18next';
import { NUCLEAR_CATEGORY_META, REACTOR_TYPE_LABELS } from '../providers/nuclearIcons';
import { Row, LinkRow, styles } from './DetailCardParts';

function formatStatus(status, t) {
  const meta = NUCLEAR_CATEGORY_META[status];
  if (meta) return t(meta.label);
  return status?.replace(/_/g, ' ') || '';
}

function formatDate(dateStr, locale) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function NuclearCard({ nuclear, onClose }) {
  const { t, i18n } = useTranslation();
  if (!nuclear) return null;

  const locale = i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US';
  const meta = NUCLEAR_CATEGORY_META[nuclear.status] ?? { label: nuclear.status, color: '#FFC107' };
  const reactorLabel = REACTOR_TYPE_LABELS[nuclear.reactorType] || nuclear.reactorType;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={{ color: meta.color }}>
            {nuclear.name}
          </div>
          <div className={styles.sub}>{formatStatus(nuclear.status, t)}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <Row label={t('card.country')} value={nuclear.country} />
        <Row label={t('card.type')} value={reactorLabel} />
        <Row label={t('card.model')} value={nuclear.reactorModel} />
        <Row label={t('nuclear.capacity')} value={nuclear.capacity ? `${nuclear.capacity} MWe` : null} />
        <Row label={t('nuclear.constructionStart')} value={formatDate(nuclear.constructionStart, locale)} />
        <Row label={t('nuclear.operationStart')} value={formatDate(nuclear.operationalFrom, locale)} />
        <Row label={t('nuclear.decommissioned')} value={formatDate(nuclear.operationalTo, locale)} />
        <Row label={t('card.position')} value={
          nuclear.lat != null
            ? `${nuclear.lat.toFixed(4)}°, ${nuclear.lon.toFixed(4)}°`
            : null
        } />
        <Row label="IAEA ID" value={nuclear.iaeaId} />
        {nuclear.iaeaId && (
          <LinkRow
            label="IAEA PRIS"
            url={`https://pris.iaea.org/pris/CountryStatistics/ReactorDetails.aspx?current=${nuclear.iaeaId}`}
            text={t('card.open')}
          />
        )}
      </div>
    </div>
  );
}
