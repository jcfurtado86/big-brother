import { MILITARY_CATEGORY_META, MILITARY_SERVICE_LABELS } from '../providers/militaryIcons';
import { Row, LinkRow, styles } from './DetailCardParts';

function formatService(raw) {
  if (!raw) return null;
  return raw.split(';').map(s => MILITARY_SERVICE_LABELS[s.trim()] || s.trim()).join(', ');
}

function formatAccess(raw) {
  if (!raw) return null;
  const map = { private: 'Privado', military: 'Militar', no: 'Proibido', permissive: 'Permissivo', yes: 'Livre' };
  return map[raw] || raw;
}

function formatFunction(raw) {
  if (!raw) return null;
  const map = { Operational: 'Operacional', Headquarters: 'Quartel-general', Logistics: 'Logistica' };
  return map[raw] || raw;
}

function wikiUrl(wikipedia) {
  if (!wikipedia) return null;
  const [lang, ...rest] = wikipedia.split(':');
  const title = rest.join(':');
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`;
}

export default function MilitaryCard({ military, onClose }) {
  if (!military) return null;

  const meta = MILITARY_CATEGORY_META[military.category] ?? { label: military.category, color: '#E91E63' };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={{ color: meta.color }}>
            {military.name || military.ref || meta.label}
          </div>
          <div className={styles.sub}>{meta.label}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <Row label="Ramo" value={formatService(military.militaryService)} />
        <Row label="Unidade" value={military.serviceBranch} />
        <Row label="Funcao" value={formatFunction(military.baseFunction)} />
        <Row label="Operador" value={military.operator} />
        <Row label="Pais" value={military.country} />
        <Row label="Ref" value={military.ref} />
        <Row label="ICAO" value={military.icao} />
        <Row label="IATA" value={military.iata} />
        <Row label="Acesso" value={formatAccess(military.access)} />
        <Row label="Elevacao" value={military.ele ? `${military.ele} m` : null} />
        <Row label="Fundacao" value={military.startDate} />
        <Row label="Posicao" value={
          military.lat != null
            ? `${military.lat.toFixed(4)}°, ${military.lon.toFixed(4)}°`
            : null
        } />
        {military.description && (
          <Row label="Info" value={military.description} />
        )}
        <LinkRow label="Website" url={military.website} text="Abrir" />
        <LinkRow label="Wikipedia" url={wikiUrl(military.wikipedia)} text={military.wikipedia?.split(':').slice(1).join(':')} />
        {military.wikidata && (
          <LinkRow label="Wikidata" url={`https://www.wikidata.org/wiki/${military.wikidata}`} text={military.wikidata} />
        )}
      </div>
    </div>
  );
}
