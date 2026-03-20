import styles from './VesselCard.module.css';
import { getVesselCategory, VESSEL_CATEGORY_META } from '../providers/vesselIcons';
import { getFlagImgByCode } from '../providers/countryFlags';
import { mmsiToCountry } from '../providers/vesselService';
import { toCompass } from '../utils/unitConversion';

const NAV_STATUS = {
  0: 'Em navegação (motor)',
  1: 'Ancorado',
  2: 'Sem comando',
  3: 'Manobrabilidade restrita',
  4: 'Restrito por calado',
  5: 'Atracado',
  6: 'Encalhado',
  7: 'Em pesca',
  8: 'Em navegação (vela)',
  14: 'AIS-SART',
  15: 'Não definido',
};

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
          SANCIONADO
        </div>
      )}

      <div className={styles.divider} />

      <div className={styles.grid}>
        <span className={styles.label}>País</span>
        <span className={styles.value}>
          {flagSrc && <img src={flagSrc} className={styles.flag} alt="" />}
          {mmsiToCountry(vessel.mmsi) || vessel.country || '—'}
        </span>

        <span className={styles.label}>Tipo</span>
        <span className={styles.value}>{meta.label} ({vessel.shipType})</span>

        <span className={styles.label}>Status</span>
        <span className={styles.value}>{NAV_STATUS[vessel.navStatus] ?? '—'}</span>

        <Row label="Velocidade" value={`${vessel.sog.toFixed(1)} kt`} />

        <span className={styles.label}>Rumo (COG)</span>
        <span className={styles.value}>
          {Math.round(vessel.cog)}° {toCompass(vessel.cog)}
        </span>

        <span className={styles.label}>Proa</span>
        <span className={styles.value}>
          {Math.round(vessel.heading)}° {toCompass(vessel.heading)}
        </span>

        <Row label="Taxa de guinada" value={vessel.rateOfTurn != null ? `${vessel.rateOfTurn}°/min` : null} />

        <Row label="Destino" value={vessel.destination} />
        <Row label="ETA" value={etaStr} />
        <Row label="Callsign" value={vessel.callsign} />

        <Row label="Comprimento" value={vessel.length ? `${vessel.length} m` : null} />
        <Row label="Boca" value={vessel.beam ? `${vessel.beam} m` : null} />
        <Row label="Calado" value={vessel.draught ? `${vessel.draught} m` : null} />

        <span className={styles.label}>Posição</span>
        <span className={styles.value}>
          {vessel.lat.toFixed(4)}°, {vessel.lon.toFixed(4)}°
        </span>

        <Row label="Último sinal" value={vessel.timeUtc ? new Date(vessel.timeUtc).toLocaleTimeString('pt-BR') : null} />
      </div>

    </div>
  );
}
