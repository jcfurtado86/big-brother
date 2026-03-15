import React, { useState } from 'react';
import styles from './ControlPanel.module.css';
import { AIRPORT_TYPES, AIRPORT_TYPE_META } from '../providers/airportIcons';
import { SATELLITE_CATEGORIES, SATELLITE_CATEGORY_META } from '../providers/satelliteIcons';
import { FLIGHT_CATEGORIES, FLIGHT_CATEGORY_META } from '../providers/planeIcons';
import { VESSEL_CATEGORIES, VESSEL_CATEGORY_META } from '../providers/vesselIcons';
import { TELECOM_CATEGORIES, TELECOM_CATEGORY_META } from '../providers/telecomIcons';
import { PROVIDER_LIST } from '../providers/flightProviders';
import { SEA_ROUTE_CATEGORIES, SEA_ROUTE_CATEGORY_META, AIR_ROUTE_CATEGORIES, AIR_ROUTE_CATEGORY_META } from '../providers/constants';

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

export default function ControlPanel({
  layerOptions, currentLayer, onLayerChange,
  lighting, onLightingToggle,
  showWeather, onWeatherToggle, weatherOpacity, onWeatherOpacityChange,
  showFlights, onFlightsToggle, flightTypes, onFlightTypesChange,
  showAirports, onAirportsToggle, airportTypes, onAirportTypesChange,
  showVessels, onVesselsToggle, vesselTypes, onVesselTypesChange,
  showSatellites, onSatellitesToggle, satelliteTypes, onSatelliteTypesChange,
  showTelecom, onTelecomToggle, telecomTypes, onTelecomTypesChange,
  flightProvider, onFlightProviderChange,
  showAirRoutes, onAirRoutesToggle, airRouteTypes, onAirRouteTypesChange,
  showSeaRoutes, onSeaRoutesToggle, seaRouteTypes, onSeaRouteTypesChange,
}) {
  return (
    <div className={styles.panel}>
      {/* Satélites */}
      <Card icon="🛰️" label="Satélites">
        <Toggle label="Satélites" active={showSatellites} onToggle={onSatellitesToggle} />
        <TypeFilter types={SATELLITE_CATEGORIES} activeSet={satelliteTypes} onChange={onSatelliteTypesChange} items={SATELLITE_CATEGORY_META} />
      </Card>

      {/* Telecom */}
      <Card icon="📡" label="Telecom">
        <Toggle label="Infraestrutura" active={showTelecom} onToggle={onTelecomToggle} />
        <TypeFilter types={TELECOM_CATEGORIES} activeSet={telecomTypes} onChange={onTelecomTypesChange} items={TELECOM_CATEGORY_META} />
      </Card>

      {/* Tráfego Marítimo */}
      <Card icon="🚢" label="Tráfego Marítimo">
        <Toggle label="Embarcações" active={showVessels} onToggle={onVesselsToggle} />
        <TypeFilter types={VESSEL_CATEGORIES} activeSet={vesselTypes} onChange={onVesselTypesChange} items={VESSEL_CATEGORY_META} />
        <Separator />
        <Toggle label="Rotas marítimas" active={showSeaRoutes} onToggle={onSeaRoutesToggle} />
        <TypeFilter types={SEA_ROUTE_CATEGORIES} activeSet={seaRouteTypes} onChange={onSeaRouteTypesChange} items={SEA_ROUTE_CATEGORY_META} />
      </Card>

      {/* Tráfego Aéreo */}
      <Card icon="✈️" label="Tráfego Aéreo">
        <Toggle label="Aeronaves" active={showFlights} onToggle={onFlightsToggle} />
        <div className={styles.row}>
          <span className={styles.rowLabel}>Tracker</span>
          <select
            className={styles.select}
            value={flightProvider}
            onChange={e => onFlightProviderChange(e.target.value)}
          >
            {PROVIDER_LIST.map(p => (
              <option key={p.name} value={p.name}>{p.label}</option>
            ))}
          </select>
        </div>
        <TypeFilter types={FLIGHT_CATEGORIES} activeSet={flightTypes} onChange={onFlightTypesChange} items={FLIGHT_CATEGORY_META} />
        <Separator />
        <Toggle label="Rotas aéreas" active={showAirRoutes} onToggle={onAirRoutesToggle} />
        <TypeFilter types={AIR_ROUTE_CATEGORIES} activeSet={airRouteTypes} onChange={onAirRouteTypesChange} items={AIR_ROUTE_CATEGORY_META} />
        <Separator />
        <Toggle label="Aeroportos" active={showAirports} onToggle={onAirportsToggle} />
        <TypeFilter types={AIRPORT_TYPES} activeSet={airportTypes} onChange={onAirportTypesChange} items={AIRPORT_TYPE_META} />
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
