import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ControlPanel.module.css';
import { AIRPORT_TYPES, AIRPORT_TYPE_META } from '../providers/airportIcons';
import { SATELLITE_CATEGORIES, SATELLITE_CATEGORY_META } from '../providers/satelliteIcons';
import { FLIGHT_CATEGORIES, FLIGHT_CATEGORY_META } from '../providers/planeIcons';
import { VESSEL_CATEGORIES, VESSEL_CATEGORY_META } from '../providers/vesselIcons';
import { TELECOM_CATEGORIES, TELECOM_CATEGORY_META } from '../providers/telecomIcons';
import { ATC_CATEGORIES, ATC_CATEGORY_META } from '../providers/atcIcons';
import { MILITARY_CATEGORIES, MILITARY_CATEGORY_META } from '../providers/militaryIcons';
import { ACLED_CATEGORIES, ACLED_CATEGORY_META } from '../providers/acledIcons';
import { GDELT_CATEGORIES, GDELT_CATEGORY_META } from '../providers/gdeltIcons';
import { NUCLEAR_CATEGORIES, NUCLEAR_CATEGORY_META } from '../providers/nuclearIcons';
import { AIRSPACE_CATEGORIES, AIRSPACE_CATEGORY_META } from '../providers/airspaceIcons';
import { WEBCAM_CATEGORIES, WEBCAM_CATEGORY_META } from '../providers/webcamIcons';
import { WEBCAM_PROVIDER_LIST } from '../providers/webcamProviders';
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
  const { t } = useTranslation();
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
        <span className={styles.rowLabel}>{t(meta.label)}</span>
      </label>
    );
  });
}

export default function ControlPanel() {
  const { t } = useTranslation();
  const dispatch = useLayerDispatch();
  const flights    = useLayerState('flights');
  const vessels    = useLayerState('vessels');
  const satellites = useLayerState('satellites');
  const airports   = useLayerState('airports');
  const telecom    = useLayerState('telecom');
  const atc        = useLayerState('atc');
  const military   = useLayerState('military');
  const acled      = useLayerState('acled');
  const gdelt      = useLayerState('gdelt');
  const tension    = useLayerState('tension');
  const nuclear    = useLayerState('nuclear');
  const airspace   = useLayerState('airspace');
  const weather    = useLayerState('weather');
  const airRoutes  = useLayerState('airRoutes');
  const seaRoutes  = useLayerState('seaRoutes');
  const receivers  = useLayerState('receivers');
  const webcams    = useLayerState('webcams');
  const env        = useLayerState('environment');

  const toggle     = (layer)        => dispatch({ type: 'TOGGLE_SHOW', layer });
  const toggleF    = (layer, field) => dispatch({ type: 'TOGGLE_FIELD', layer, field });
  const setTypes   = (layer, types) => dispatch({ type: 'SET_TYPES', layer, types });
  const setField   = (layer, field, value) => dispatch({ type: 'SET_FIELD', layer, field, value });

  return (
    <div className={styles.panel}>
      {/* Satelites */}
      <Card icon="🛰️" label={t('control.satellites')}>
        <Toggle label={t('control.satellites')} active={satellites.show} onToggle={() => toggle('satellites')} />
        <TypeFilter types={SATELLITE_CATEGORIES} activeSet={satellites.types} onChange={s => setTypes('satellites', s)} items={SATELLITE_CATEGORY_META} />
      </Card>

      {/* Telecom + ATC */}
      <Card icon="📡" label={t('nav.infrastructure')}>
        <Toggle label={t('control.telecom')} active={telecom.show} onToggle={() => toggle('telecom')} />
        <TypeFilter types={TELECOM_CATEGORIES} activeSet={telecom.types} onChange={s => setTypes('telecom', s)} items={TELECOM_CATEGORY_META} />
        <Separator />
        <Toggle label={t('control.radarAndAtc')} active={atc.show} onToggle={() => toggle('atc')} />
        <TypeFilter types={ATC_CATEGORIES} activeSet={atc.types} onChange={s => setTypes('atc', s)} items={ATC_CATEGORY_META} />
      </Card>

      {/* Militar */}
      <Card icon="🎖️" label={t('nav.military')}>
        <Toggle label={t('control.militaryBases')} active={military.show} onToggle={() => toggle('military')} />
        <TypeFilter types={MILITARY_CATEGORIES} activeSet={military.types} onChange={s => setTypes('military', s)} items={MILITARY_CATEGORY_META} />
      </Card>

      {/* Eventos */}
      <Card icon="⚠️" label={t('nav.events')}>
        <Toggle label={t('control.conflicts')} active={acled.show} onToggle={() => toggle('acled')} />
        <div className={styles.row}>
          <span className={styles.rowLabel}>{t('control.period')}</span>
          <select
            className={styles.select}
            value={acled.period}
            onChange={e => setField('acled', 'period', e.target.value)}
          >
            <option value="1d">{t('control.lastDay')}</option>
            <option value="7d">{t('control.lastWeek')}</option>
            <option value="30d">{t('control.last30Days')}</option>
          </select>
        </div>
        <TypeFilter types={ACLED_CATEGORIES} activeSet={acled.types} onChange={s => setTypes('acled', s)} items={ACLED_CATEGORY_META} />
        <Separator />
        <Toggle label={t('control.gdeltLive')} active={gdelt.show} onToggle={() => toggle('gdelt')} />
        <TypeFilter types={GDELT_CATEGORIES} activeSet={gdelt.types} onChange={s => setTypes('gdelt', s)} items={GDELT_CATEGORY_META} />
        <Separator />
        <Toggle label={t('control.tensionHeatmap')} active={tension.show} onToggle={() => toggle('tension')} />
        {tension.show && (
          <>
            <OpacitySlider label={t('control.heatmapOpacity')} value={tension.opacity} onChange={v => setField('tension', 'opacity', v)} />
            <div className={styles.row}>
              <span className={styles.rowLabel}>{t('control.period')}</span>
              <select
                className={styles.select}
                value={tension.period}
                onChange={e => setField('tension', 'period', e.target.value)}
              >
                <option value="1d">{t('control.lastDay')}</option>
                <option value="7d">{t('control.lastWeek')}</option>
                <option value="30d">{t('control.last30Days')}</option>
              </select>
            </div>
          </>
        )}
      </Card>

      {/* Cameras */}
      <Card icon="📷" label={t('nav.cameras')}>
        <Toggle label={t('control.liveCameras')} active={webcams.show} onToggle={() => toggle('webcams')} />
        <div className={styles.row}>
          <span className={styles.rowLabel}>{t('control.provider')}</span>
          <select
            className={styles.select}
            value={webcams.provider}
            onChange={e => setField('webcams', 'provider', e.target.value)}
          >
            {WEBCAM_PROVIDER_LIST.map(p => (
              <option key={p.name} value={p.name}>{p.label}</option>
            ))}
          </select>
        </div>
        <TypeFilter types={WEBCAM_CATEGORIES} activeSet={webcams.types} onChange={s => setTypes('webcams', s)} items={WEBCAM_CATEGORY_META} />
      </Card>

      {/* Nuclear */}
      <Card icon="☢️" label={t('nav.nuclear')}>
        <Toggle label={t('control.nuclearPlants')} active={nuclear.show} onToggle={() => toggle('nuclear')} />
        <TypeFilter types={NUCLEAR_CATEGORIES} activeSet={nuclear.types} onChange={s => setTypes('nuclear', s)} items={NUCLEAR_CATEGORY_META} />
      </Card>

      {/* Trafego Maritimo */}
      <Card icon="🚢" label={t('nav.maritimeTraffic')}>
        <Toggle label={t('control.vessels')} active={vessels.show} onToggle={() => toggle('vessels')} />
        <TypeFilter types={VESSEL_CATEGORIES} activeSet={vessels.types} onChange={s => setTypes('vessels', s)} items={VESSEL_CATEGORY_META} />
        <Separator />
        <Toggle label={t('control.seaRoutes')} active={seaRoutes.show} onToggle={() => toggle('seaRoutes')} />
        <TypeFilter types={SEA_ROUTE_CATEGORIES} activeSet={seaRoutes.types} onChange={s => setTypes('seaRoutes', s)} items={SEA_ROUTE_CATEGORY_META} />
        <Separator />
        <Toggle label={t('control.aisAntennas')} active={receivers.aisShow} onToggle={() => toggleF('receivers', 'aisShow')} />
        <OpacitySlider label={t('control.antennaOpacity')} value={receivers.aisOpacity} onChange={v => setField('receivers', 'aisOpacity', v)} />
      </Card>

      {/* Trafego Aereo */}
      <Card icon="✈️" label={t('nav.airTraffic')}>
        <Toggle label={t('control.aircraft')} active={flights.show} onToggle={() => toggle('flights')} />
        <div className={styles.row}>
          <span className={styles.rowLabel}>{t('control.tracker')}</span>
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
        <TypeFilter types={FLIGHT_CATEGORIES} activeSet={flights.types} onChange={s => setTypes('flights', s)} items={FLIGHT_CATEGORY_META} />
        <Separator />
        <Toggle label={t('control.airRoutes')} active={airRoutes.show} onToggle={() => toggle('airRoutes')} />
        <TypeFilter types={AIR_ROUTE_CATEGORIES} activeSet={airRoutes.types} onChange={s => setTypes('airRoutes', s)} items={AIR_ROUTE_CATEGORY_META} />
        <Separator />
        <Toggle label={t('control.airports')} active={airports.show} onToggle={() => toggle('airports')} />
        <TypeFilter types={AIRPORT_TYPES} activeSet={airports.types} onChange={s => setTypes('airports', s)} items={AIRPORT_TYPE_META} />
        <Separator />
        <Toggle label={t('control.exclusionZones')} active={airspace.show} onToggle={() => toggle('airspace')} />
        <TypeFilter types={AIRSPACE_CATEGORIES} activeSet={airspace.types} onChange={s => setTypes('airspace', s)} items={AIRSPACE_CATEGORY_META} />
        <OpacitySlider label={t('control.zoneOpacity')} value={airspace.opacity} onChange={v => setField('airspace', 'opacity', v)} />
        <Separator />
        <Toggle label={t('control.adsbAntennas')} active={receivers.adsbShow} onToggle={() => toggleF('receivers', 'adsbShow')} />
        <OpacitySlider label={t('control.antennaOpacity')} value={receivers.adsbOpacity} onChange={v => setField('receivers', 'adsbOpacity', v)} />
      </Card>

      {/* Ambiente */}
      <Card icon="🌍" label={t('nav.environment')} defaultOpen>
        <div className={styles.layerGroup}>
          {layerOptions.map(l => (
            <button
              key={l.id}
              className={`${styles.layerBtn} ${env.layerId === l.id ? styles.layerBtnActive : ''}`}
              onClick={() => setField('environment', 'layerId', l.id)}
            >
              {t(l.label)}
            </button>
          ))}
        </div>
        <Toggle icon="⛰️" label={t('control.terrain3d')} active={env.terrain} onToggle={() => toggleF('environment', 'terrain')} />
        <Toggle icon="🌙" label={t('control.dayNightCycle')} active={env.lighting} onToggle={() => toggleF('environment', 'lighting')} />
        <div className={styles.row} style={{ cursor: 'default' }}>
          <span className={styles.rowIcon}>☁️</span>
          <span className={styles.rowLabel}>{t('control.clouds')}</span>
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
