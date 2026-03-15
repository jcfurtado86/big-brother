import React, { useState } from 'react';
import styles from './ControlPanel.module.css';
import { AIRPORT_TYPES, AIRPORT_TYPE_META } from '../providers/airportIcons';
import { SATELLITE_CATEGORIES, SATELLITE_CATEGORY_META } from '../providers/satelliteIcons';
import { FLIGHT_CATEGORIES, FLIGHT_CATEGORY_META } from '../providers/planeIcons';
import { VESSEL_CATEGORIES, VESSEL_CATEGORY_META } from '../providers/vesselIcons';
import { TELECOM_CATEGORIES, TELECOM_CATEGORY_META } from '../providers/telecomIcons';
import { PROVIDER_LIST } from '../providers/flightProviders';
import { SEA_ROUTE_CATEGORIES, SEA_ROUTE_CATEGORY_META, AIR_ROUTE_CATEGORIES, AIR_ROUTE_CATEGORY_META } from '../providers/constants';
import { layers } from '../providers/layers';
import { useLayerState, useLayerDispatch } from '../contexts/LayerContext';

const layerOptions = layers.map(({ id, label }) => ({ id, label }));

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

function Toggle({ icon, label, active, onToggle }) {
  return (
    <div className={styles.row} onClick={(e) => { e.preventDefault(); onToggle(); }}>
      <span className={styles.switch}>
        <input type="checkbox" checked={active} readOnly tabIndex={-1} />
        <span className={styles.switchTrack} />
      </span>
      {icon && <span className={styles.rowIcon}>{icon}</span>}
      <span className={styles.rowLabel}>{label}</span>
    </div>
  );
}

function Separator() {
  return <div className={styles.separator} />;
}

function OpacitySlider({ label, value, onChange }) {
  return (
    <>
      <div className={styles.row} style={{ cursor: 'default' }}>
        <span className={styles.rowLabel}>{label}</span>
        <span className={styles.sliderValue}>{Math.round(value * 100)}%</span>
      </div>
      <div className={styles.sliderRow}>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className={styles.slider}
        />
      </div>
    </>
  );
}

function TypeFilter({ types, activeSet, onChange, items }) {
  function toggle(type) {
    const next = new Set(activeSet);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onChange(next);
  }
  return types.map(type => {
    const meta = items[type];
    return (
      <label key={type} className={styles.subRow}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={activeSet.has(type)}
          onChange={() => toggle(type)}
        />
        <span className={styles.dot} style={{ background: meta.color }} />
        <span className={styles.rowLabel}>{meta.label}</span>
      </label>
    );
  });
}

export default function ControlPanel() {
  const dispatch = useLayerDispatch();
  const flights    = useLayerState('flights');
  const vessels    = useLayerState('vessels');
  const satellites = useLayerState('satellites');
  const airports   = useLayerState('airports');
  const telecom    = useLayerState('telecom');
  const weather    = useLayerState('weather');
  const airRoutes  = useLayerState('airRoutes');
  const seaRoutes  = useLayerState('seaRoutes');
  const receivers  = useLayerState('receivers');
  const env        = useLayerState('environment');

  const toggle     = (layer)        => dispatch({ type: 'TOGGLE_SHOW', layer });
  const toggleF    = (layer, field) => dispatch({ type: 'TOGGLE_FIELD', layer, field });
  const setTypes   = (layer, types) => dispatch({ type: 'SET_TYPES', layer, types });
  const setField   = (layer, field, value) => dispatch({ type: 'SET_FIELD', layer, field, value });

  return (
    <div className={styles.panel}>
      {/* Satelites */}
      <Card icon="🛰️" label="Satelites">
        <Toggle label="Satelites" active={satellites.show} onToggle={() => toggle('satellites')} />
        <TypeFilter types={SATELLITE_CATEGORIES} activeSet={satellites.types} onChange={t => setTypes('satellites', t)} items={SATELLITE_CATEGORY_META} />
      </Card>

      {/* Telecom */}
      <Card icon="📡" label="Telecom">
        <Toggle label="Infraestrutura" active={telecom.show} onToggle={() => toggle('telecom')} />
        <TypeFilter types={TELECOM_CATEGORIES} activeSet={telecom.types} onChange={t => setTypes('telecom', t)} items={TELECOM_CATEGORY_META} />
      </Card>

      {/* Trafego Maritimo */}
      <Card icon="🚢" label="Trafego Maritimo">
        <Toggle label="Embarcacoes" active={vessels.show} onToggle={() => toggle('vessels')} />
        <TypeFilter types={VESSEL_CATEGORIES} activeSet={vessels.types} onChange={t => setTypes('vessels', t)} items={VESSEL_CATEGORY_META} />
        <Separator />
        <Toggle label="Rotas maritimas" active={seaRoutes.show} onToggle={() => toggle('seaRoutes')} />
        <TypeFilter types={SEA_ROUTE_CATEGORIES} activeSet={seaRoutes.types} onChange={t => setTypes('seaRoutes', t)} items={SEA_ROUTE_CATEGORY_META} />
        <Separator />
        <Toggle label="Antenas AIS" active={receivers.aisShow} onToggle={() => toggleF('receivers', 'aisShow')} />
        <OpacitySlider label="Opacidade antenas" value={receivers.aisOpacity} onChange={v => setField('receivers', 'aisOpacity', v)} />
      </Card>

      {/* Trafego Aereo */}
      <Card icon="✈️" label="Trafego Aereo">
        <Toggle label="Aeronaves" active={flights.show} onToggle={() => toggle('flights')} />
        <div className={styles.row}>
          <span className={styles.rowLabel}>Tracker</span>
          <select
            className={styles.select}
            value={flights.provider}
            onChange={e => setField('flights', 'provider', e.target.value)}
          >
            {PROVIDER_LIST.map(p => (
              <option key={p.name} value={p.name}>{p.label}</option>
            ))}
          </select>
        </div>
        <TypeFilter types={FLIGHT_CATEGORIES} activeSet={flights.types} onChange={t => setTypes('flights', t)} items={FLIGHT_CATEGORY_META} />
        <Separator />
        <Toggle label="Rotas aereas" active={airRoutes.show} onToggle={() => toggle('airRoutes')} />
        <TypeFilter types={AIR_ROUTE_CATEGORIES} activeSet={airRoutes.types} onChange={t => setTypes('airRoutes', t)} items={AIR_ROUTE_CATEGORY_META} />
        <Separator />
        <Toggle label="Aeroportos" active={airports.show} onToggle={() => toggle('airports')} />
        <TypeFilter types={AIRPORT_TYPES} activeSet={airports.types} onChange={t => setTypes('airports', t)} items={AIRPORT_TYPE_META} />
        <Separator />
        <Toggle label="Antenas ADS-B" active={receivers.adsbShow} onToggle={() => toggleF('receivers', 'adsbShow')} />
        <OpacitySlider label="Opacidade antenas" value={receivers.adsbOpacity} onChange={v => setField('receivers', 'adsbOpacity', v)} />
      </Card>

      {/* Ambiente */}
      <Card icon="🌍" label="Ambiente" defaultOpen>
        <div className={styles.layerGroup}>
          {layerOptions.map(l => (
            <button
              key={l.id}
              className={`${styles.layerBtn} ${env.layerId === l.id ? styles.layerBtnActive : ''}`}
              onClick={() => setField('environment', 'layerId', l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <Toggle icon="🌙" label="Ciclo dia/noite" active={env.lighting} onToggle={() => toggleF('environment', 'lighting')} />
        <div className={styles.row} style={{ cursor: 'default' }}>
          <span className={styles.rowIcon}>☁️</span>
          <span className={styles.rowLabel}>Nuvens</span>
          <span className={styles.sliderValue}>{Math.round(weather.opacity * 100)}%</span>
        </div>
        <div className={styles.sliderRow}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={weather.opacity}
            onChange={e => {
              const v = Number(e.target.value);
              setField('weather', 'opacity', v);
              if (v > 0 && !weather.show) toggle('weather');
              if (v === 0 && weather.show) toggle('weather');
            }}
            className={styles.slider}
          />
        </div>
      </Card>
    </div>
  );
}
