import { useState } from 'react';
import styles from './BriefingPanel.module.css';

const ACLED_COLORS = {
  battles: '#E53935',
  explosions_remote_violence: '#FF6F00',
  violence_against_civilians: '#D32F2F',
  protests: '#1E88E5',
  riots: '#F4511E',
  strategic_developments: '#7B1FA2',
};

function Section({ title, count, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setOpen(!open)}>
        <span className={`${styles.arrow} ${open ? styles.arrowOpen : ''}`}>&#9654;</span>
        {title}
        {count != null && <span className={styles.sectionCount}>{count}</span>}
      </div>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function BriefingPanel({ briefing, loading, onClose }) {
  if (!briefing && !loading) return null;

  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.title}>BRIEFING</div>
          <button className={styles.close} onClick={onClose}>×</button>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <div>Analisando regiao...</div>
        </div>
      </div>
    );
  }

  const s = briefing.summary;
  const toneClass = s.avgTone == null ? '' : s.avgTone < -2 ? styles.toneNeg : s.avgTone > 2 ? styles.tonePos : styles.toneNeutral;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>BRIEFING</div>
          <div className={styles.subtitle}>
            {briefing.center.lat.toFixed(2)}°, {briefing.center.lon.toFixed(2)}° — raio {briefing.radius}km
          </div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      {/* Summary */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <div className={styles.summaryValue} style={{ color: s.conflicts > 0 ? '#E53935' : '#666' }}>{s.conflicts}</div>
          <div className={styles.summaryLabel}>CONFLITOS</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryValue} style={{ color: s.fatalities > 0 ? '#E53935' : '#666' }}>{s.fatalities}</div>
          <div className={styles.summaryLabel}>FATALIDADES</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryValue}>{s.gdeltArticles}</div>
          <div className={styles.summaryLabel}>ARTIGOS</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryValue}>
            <span className={toneClass}>{s.avgTone != null ? s.avgTone : '—'}</span>
          </div>
          <div className={styles.summaryLabel}>TOM MEDIO</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryValue}>{s.militaryBases}</div>
          <div className={styles.summaryLabel}>BASES MIL.</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryValue}>{s.airports}</div>
          <div className={styles.summaryLabel}>AEROPORTOS</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryValue} style={{ color: s.sanctionedVessels > 0 ? '#9C27B0' : '#666' }}>{s.sanctionedVessels}</div>
          <div className={styles.summaryLabel}>SANCIONADOS</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryValue}>{s.totalVessels}</div>
          <div className={styles.summaryLabel}>NAVIOS</div>
        </div>
      </div>

      <div className={styles.divider} />

      {/* ACLED Conflicts */}
      <Section title="CONFLITOS" count={briefing.acled.length} defaultOpen={briefing.acled.length > 0}>
        {briefing.acled.length === 0 && <div className={styles.empty}>Nenhum conflito nos ultimos 30 dias</div>}
        {briefing.acled.map((e, i) => (
          <div key={e.event_id || i} className={styles.item}>
            <div>
              <span className={styles.badge} style={{ background: ACLED_COLORS[e.category] || '#666', color: '#fff' }}>
                {(e.event_type || e.category || '').substring(0, 20)}
              </span>
              {e.fatalities > 0 && <span style={{ color: '#E53935' }}>{e.fatalities} mortes</span>}
            </div>
            <div className={styles.itemSub}>
              {e.location || e.country} — {formatDate(e.event_date)}
            </div>
            {e.actor1 && <div className={styles.itemSub}>{e.actor1}</div>}
          </div>
        ))}
      </Section>

      <div className={styles.divider} />

      {/* GDELT Media */}
      <Section title="MIDIA" count={briefing.gdelt.length} defaultOpen={briefing.gdelt.length > 0}>
        {briefing.gdelt.length === 0 && <div className={styles.empty}>Nenhuma cobertura nos ultimos 14 dias</div>}
        {briefing.gdelt.map((e, i) => (
          <div key={e.id || i} className={styles.item}>
            <div className={styles.itemTitle}>{(e.title || '').substring(0, 80)}</div>
            <div className={styles.itemSub}>
              {e.domain} — {formatDate(e.source_date)}
              {e.tone != null && (
                <span className={e.tone < -2 ? styles.toneNeg : e.tone > 2 ? styles.tonePos : styles.toneNeutral}>
                  {' '}tom {e.tone.toFixed(1)}
                </span>
              )}
            </div>
            {e.url && <a href={e.url} target="_blank" rel="noreferrer" className={styles.itemLink}>Abrir artigo</a>}
          </div>
        ))}
      </Section>

      <div className={styles.divider} />

      {/* Infrastructure */}
      <Section title="INFRAESTRUTURA" count={s.militaryBases + s.airports + s.telecomPoints + s.atcPoints + s.nuclearPlants}>
        {briefing.military.length > 0 && (
          <div className={styles.item}>
            <div className={styles.itemTitle}>Militar ({briefing.military.length})</div>
            {briefing.military.map((m, i) => (
              <div key={m.osm_id || i} className={styles.itemSub}>
                {m.name || m.category} {m.country ? `— ${m.country}` : ''}
              </div>
            ))}
          </div>
        )}
        {briefing.airports.length > 0 && (
          <div className={styles.item}>
            <div className={styles.itemTitle}>Aeroportos ({briefing.airports.length})</div>
            {briefing.airports.map((a, i) => (
              <div key={a.ident || i} className={styles.itemSub}>
                {a.iata_code || a.ident} — {a.name}
              </div>
            ))}
          </div>
        )}
        {briefing.telecom.length > 0 && (
          <div className={styles.item}>
            <div className={styles.itemTitle}>Telecom ({briefing.telecom.length})</div>
            <div className={styles.itemSub}>
              {briefing.telecom.slice(0, 5).map(t => t.name || t.layer).join(', ')}
              {briefing.telecom.length > 5 && ` +${briefing.telecom.length - 5}`}
            </div>
          </div>
        )}
        {briefing.atc.length > 0 && (
          <div className={styles.item}>
            <div className={styles.itemTitle}>ATC ({briefing.atc.length})</div>
            {briefing.atc.map((a, i) => (
              <div key={a.osm_id || i} className={styles.itemSub}>
                {a.icao || a.name || a.category}
              </div>
            ))}
          </div>
        )}
        {briefing.nuclear.length > 0 && (
          <div className={styles.item}>
            <div className={styles.itemTitle} style={{ color: '#FF9800' }}>Nuclear ({briefing.nuclear.length})</div>
            {briefing.nuclear.map((n, i) => (
              <div key={n.id || i} className={styles.itemSub}>
                {n.name} — {n.status} ({n.country})
              </div>
            ))}
          </div>
        )}
        {s.militaryBases + s.airports + s.telecomPoints + s.atcPoints + s.nuclearPlants === 0 && (
          <div className={styles.empty}>Nenhuma infraestrutura encontrada</div>
        )}
      </Section>

      <div className={styles.divider} />

      {/* Alerts */}
      <Section title="ALERTAS" count={s.sanctionedVessels + s.nuclearPlants} defaultOpen={s.sanctionedVessels > 0}>
        {briefing.sanctionedVessels.length > 0 && (
          <div className={styles.item}>
            <div className={styles.itemTitle} style={{ color: '#9C27B0' }}>
              Navios sancionados ({briefing.sanctionedVessels.length})
            </div>
            {briefing.sanctionedVessels.map((v, i) => (
              <div key={v.mmsi || i} className={styles.itemSub}>
                {v.name} (MMSI {v.mmsi})
              </div>
            ))}
          </div>
        )}
        {s.sanctionedVessels === 0 && s.nuclearPlants === 0 && (
          <div className={styles.empty}>Nenhum alerta ativo</div>
        )}
      </Section>
    </div>
  );
}
