import styles from './VesselCard.module.css';
import { useTranslation } from 'react-i18next';
import { getVesselCategory, VESSEL_CATEGORY_META } from '../providers/vesselIcons';
import { getFlagImgByCode } from '../providers/countryFlags';
import { mmsiToCountry } from '../providers/vesselService';
import { toCompass } from '../utils/unitConversion';

function formatEta(eta) {
  if (!eta || (!eta.month && !eta.day)) return null;
  const dd = String(eta.day).padStart(2, '0');
  const mm = String(eta.month).padStart(2, '0');
  const hh = String(eta.hour).padStart(2, '0');
  const min = String(eta.minute).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${min}`;
}

function Row({ label, value }) {
  if (value == null || value === '' || value === false) return null;
  return <>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value}</span>
  </>;
}

export default function VesselCard({ vessel, onClose }) {
  const { t, i18n } = useTranslation();
  if (!vessel) return null;

  const baseCategory = getVesselCategory(vessel.shipType);
  const category = vessel.sanctioned ? 'dark' : baseCategory;
  const meta     = VESSEL_CATEGORY_META[category];
  const flagImg  = getFlagImgByCode(vessel.country);
  const flagSrc  = flagImg?.src ?? null;
  const etaStr   = formatEta(vessel.eta);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={vessel.sanctioned ? { color: '#9C27B0' } : undefined}>{vessel.name}</div>
          <div className={styles.mmsi}>
            MMSI {vessel.mmsi}
            {vessel.imo ? ` · IMO ${vessel.imo}` : ''}
          </div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      {vessel.sanctioned && (
        <div className={styles.sanctionBadge}>
          {t('vessel.sanctioned')}
        </div>
      )}

      <div className={styles.divider} />

      <div className={styles.grid}>
        <span className={styles.label}>{t('card.country')}</span>
        <span className={styles.value}>
          {flagSrc && <img src={flagSrc} className={styles.flag} alt="" />}
          {mmsiToCountry(vessel.mmsi) || vessel.country || '—'}
        </span>

        <span className={styles.label}>{t('card.type')}</span>
        <span className={styles.value}>{t(meta.label)} ({vessel.shipType})</span>

        <span className={styles.label}>{t('card.status')}</span>
        <span className={styles.value}>{t('vessel.navStatus.' + vessel.navStatus) || '—'}</span>

        <Row label={t('card.speed')} value={`${vessel.sog.toFixed(1)} kt`} />

        <span className={styles.label}>{t('vessel.cog')}</span>
        <span className={styles.value}>
          {Math.round(vessel.cog)}° {toCompass(vessel.cog)}
        </span>

        <span className={styles.label}>{t('vessel.bow')}</span>
        <span className={styles.value}>
          {Math.round(vessel.heading)}° {toCompass(vessel.heading)}
        </span>

        <Row label={t('vessel.rateOfTurn')} value={vessel.rateOfTurn != null ? `${vessel.rateOfTurn}°/min` : null} />

        <Row label={t('vessel.destination')} value={vessel.destination} />
        <Row label={t('vessel.eta')} value={etaStr} />
        <Row label={t('vessel.callsign')} value={vessel.callsign} />

        <Row label={t('vessel.length')} value={vessel.length ? `${vessel.length} m` : null} />
        <Row label={t('vessel.beam')} value={vessel.beam ? `${vessel.beam} m` : null} />
        <Row label={t('vessel.draught')} value={vessel.draught ? `${vessel.draught} m` : null} />

        <span className={styles.label}>{t('card.position')}</span>
        <span className={styles.value}>
          {vessel.lat.toFixed(4)}°, {vessel.lon.toFixed(4)}°
        </span>

        <Row label={t('vessel.lastSignal')} value={vessel.timeUtc ? new Date(vessel.timeUtc).toLocaleTimeString(i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US') : null} />
      </div>

    </div>
  );
}
