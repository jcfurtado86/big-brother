import { NUCLEAR_CATEGORY_META, REACTOR_TYPE_LABELS } from '../providers/nuclearIcons';
import { Row, LinkRow, styles } from './DetailCardParts';

function formatStatus(status) {
  const meta = NUCLEAR_CATEGORY_META[status];
  if (meta) return meta.label;
  return status?.replace(/_/g, ' ') || '';
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function NuclearCard({ nuclear, onClose }) {
  if (!nuclear) return null;

  const meta = NUCLEAR_CATEGORY_META[nuclear.status] ?? { label: nuclear.status, color: '#FFC107' };
  const reactorLabel = REACTOR_TYPE_LABELS[nuclear.reactorType] || nuclear.reactorType;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={{ color: meta.color }}>
            {nuclear.name}
          </div>
          <div className={styles.sub}>{formatStatus(nuclear.status)}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <Row label="Pais" value={nuclear.country} />
        <Row label="Tipo" value={reactorLabel} />
        <Row label="Modelo" value={nuclear.reactorModel} />
        <Row label="Capacidade" value={nuclear.capacity ? `${nuclear.capacity} MWe` : null} />
        <Row label="Inicio construcao" value={formatDate(nuclear.constructionStart)} />
        <Row label="Inicio operacao" value={formatDate(nuclear.operationalFrom)} />
        <Row label="Desativado" value={formatDate(nuclear.operationalTo)} />
        <Row label="Posicao" value={
          nuclear.lat != null
            ? `${nuclear.lat.toFixed(4)}°, ${nuclear.lon.toFixed(4)}°`
            : null
        } />
        <Row label="IAEA ID" value={nuclear.iaeaId} />
        {nuclear.iaeaId && (
          <LinkRow
            label="IAEA PRIS"
            url={`https://pris.iaea.org/pris/CountryStatistics/ReactorDetails.aspx?current=${nuclear.iaeaId}`}
            text="Abrir"
          />
        )}
      </div>
    </div>
  );
}
