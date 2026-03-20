import { GDELT_CATEGORY_META, TONE_COLORS, TONE_LABELS } from '../providers/gdeltIcons';
import { Row, LinkRow, styles } from './DetailCardParts';

export default function GdeltCard({ gdelt, onClose }) {
  if (!gdelt) return null;

  const meta = GDELT_CATEGORY_META[gdelt.category] ?? { label: gdelt.category, color: '#E53935' };
  const toneColor = TONE_COLORS[gdelt.toneLabel] || TONE_COLORS.neutral;
  const toneText = TONE_LABELS[gdelt.toneLabel] || 'Neutro';

  const dateStr = gdelt.sourceDate
    ? new Date(gdelt.sourceDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={{ color: meta.color }}>
            {gdelt.actionGeoName || meta.label}
          </div>
          <div className={styles.sub}>GDELT — {meta.label}</div>
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
        <Row label="Evento" value={gdelt.title} />
        <Row label="Tipo" value={meta.label} />
        <Row label="Tom" value={
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: toneColor, display: 'inline-block' }} />
            {toneText} ({gdelt.tone?.toFixed(1)})
          </span>
        } />
        {gdelt.goldsteinScale != null && (
          <Row label="Goldstein" value={gdelt.goldsteinScale.toFixed(1)} />
        )}
        <Row label="Local" value={gdelt.actionGeoName} />
        <Row label="Pais" value={gdelt.country} />
        {gdelt.actor1Name && <Row label="Ator 1" value={gdelt.actor1Name} />}
        {gdelt.actor2Name && <Row label="Ator 2" value={gdelt.actor2Name} />}
        <Row label="Fonte" value={gdelt.domain} />
        <Row label="Data" value={dateStr} />
        <Row label="Posicao" value={
          gdelt.lat != null
            ? `${gdelt.lat.toFixed(4)}, ${(gdelt.lon ?? gdelt.lng).toFixed(4)}`
            : null
        } />
        {gdelt.url && <LinkRow label="Artigo" url={gdelt.url} text="Abrir" />}
      </div>
    </div>
  );
}
