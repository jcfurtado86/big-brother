import React, { useState } from 'react';
import styles from './ControlPanel.module.css';
import { AIRPORT_TYPES, AIRPORT_TYPE_META } from '../providers/airportIcons';

function Card({ icon, label, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} onClick={() => setOpen(v => !v)}>
        <span className={styles.cardIcon}>{icon}</span>
        <span className={styles.cardLabel}>{label}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>▼</span>
      </div>
      {open && <div className={styles.cardBody}>{children}</div>}
    </div>
  );
}

function Toggle({ icon, label, active, onToggle, children }) {
  return (
    <>
      <div className={styles.row} onClick={(e) => { e.preventDefault(); onToggle(); }}>
        <span className={styles.rowIcon}>{icon}</span>
        <span className={styles.rowLabel}>{label}</span>
        <span className={styles.switch}>
          <input type="checkbox" checked={active} readOnly tabIndex={-1} />
          <span className={styles.switchTrack} />
        </span>
      </div>
      {children}
    </>
  );
}

function Separator() {
  return <div className={styles.separator} />;
}

export default function ControlPanel({
  layerOptions, currentLayer, onLayerChange,
  lighting, onLightingToggle,
  showWeather, onWeatherToggle, weatherOpacity, onWeatherOpacityChange,
  showFlights, onFlightsToggle,
  airportTypes, onAirportTypesChange,
  showVessels, onVesselsToggle,
}) {
  function toggleAirportType(type) {
    const next = new Set(airportTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onAirportTypesChange(next);
  }

  return (
    <div className={styles.panel}>
      {/* Tráfego Marítimo */}
      <Card icon="🚢" label="Tráfego Marítimo">
        <Toggle icon="🚢" label="Embarcações" active={showVessels} onToggle={onVesselsToggle} />
      </Card>

      {/* Tráfego Aéreo */}
      <Card icon="✈️" label="Tráfego Aéreo">
        <Toggle icon="✈️" label="Aeronaves" active={showFlights} onToggle={onFlightsToggle} />
        <Separator />
        <div className={styles.row} style={{ cursor: 'default', color: '#999', fontSize: 11 }}>
          <span className={styles.rowIcon}>🛫</span>
          <span className={styles.rowLabel}>Aeroportos</span>
        </div>
        {AIRPORT_TYPES.map(type => {
          const meta = AIRPORT_TYPE_META[type];
          return (
            <label key={type} className={styles.row} style={{ paddingLeft: 26 }}>
              <span className={styles.dot} style={{ background: meta.color }} />
              <span className={styles.rowLabel}>{meta.label}</span>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={airportTypes.has(type)}
                onChange={() => toggleAirportType(type)}
              />
            </label>
          );
        })}
      </Card>

      {/* Ambiente — mapa base, iluminação, nuvens */}
      <Card icon="🌍" label="Ambiente" defaultOpen>
        <div className={styles.layerGroup}>
          {layerOptions.map(l => (
            <button
              key={l.id}
              className={`${styles.layerBtn} ${currentLayer === l.id ? styles.layerBtnActive : ''}`}
              onClick={() => onLayerChange(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <Toggle icon="🌙" label="Ciclo diurno" active={lighting} onToggle={onLightingToggle} />
        <div className={styles.row} style={{ cursor: 'default' }}>
          <span className={styles.rowIcon}>☁️</span>
          <span className={styles.rowLabel}>Nuvens</span>
          <span className={styles.sliderValue}>{Math.round(weatherOpacity * 100)}%</span>
        </div>
        <div className={styles.sliderRow}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={weatherOpacity}
            onChange={e => {
              const v = Number(e.target.value);
              onWeatherOpacityChange(v);
              if (v > 0 && !showWeather) onWeatherToggle();
              if (v === 0 && showWeather) onWeatherToggle();
            }}
            className={styles.slider}
          />
        </div>
      </Card>
    </div>
  );
}
