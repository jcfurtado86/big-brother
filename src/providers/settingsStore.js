import { useSyncExternalStore } from 'react';
import * as C from './constants';

/* ── Schema ──────────────────────────────────────────────────────────────── */

export const SETTINGS_SCHEMA = [
  { section: 'Câmera', items: [
    { key: 'ZOOM_SENSITIVITY',  label: 'Sensibilidade do zoom',  default: C.ZOOM_SENSITIVITY,  min: 0.01, max: 0.3,  step: 0.01 },
    { key: 'ZOOM_MIN',          label: 'Zoom mín (m)',           default: C.ZOOM_MIN,          min: 10,   max: 1000, step: 10 },
    { key: 'ZOOM_MAX',          label: 'Zoom máx (m)',           default: C.ZOOM_MAX,          min: 10_000_000, max: 100_000_000, step: 5_000_000 },
    { key: 'FLY_DURATION',      label: 'Duração do voo (s)',     default: C.FLY_DURATION,      min: 0.2,  max: 5,    step: 0.1 },
    { key: 'FLY_ZOOM_FACTOR',   label: 'Fator de zoom (voo)',    default: C.FLY_ZOOM_FACTOR,   min: 1,    max: 10,   step: 1 },
    { key: 'FLY_MIN_ALT',       label: 'Altitude mín voo (m)',   default: C.FLY_MIN_ALT,       min: 500,  max: 10_000, step: 500 },
  ]},
  { section: 'Aeronaves', items: [
    { key: 'FLIGHT_ALT_SCALE',  label: 'Escala de altitude',     default: C.FLIGHT_ALT_SCALE,  min: 1,    max: 15,   step: 0.5 },
    { key: 'DEAD_RECKONING_MS', label: 'Dead reckoning (ms)',    default: C.DEAD_RECKONING_MS, min: 100,  max: 5000, step: 100 },
    { key: 'PLANE_BATCH_SIZE',  label: 'Batch size (billboards)',default: C.PLANE_BATCH_SIZE,  min: 5,    max: 200,  step: 5 },
    { key: 'CALLSIGN_BATCH_SIZE',label:'Batch size (labels)',    default: C.CALLSIGN_BATCH_SIZE, min: 5,  max: 200,  step: 5 },
    { key: 'FETCH_PADDING',     label: 'Padding bbox (°)',       default: C.FETCH_PADDING,     min: 0,    max: 5,    step: 0.1 },
  ]},
  { section: 'Providers', items: [
    { key: 'AL_POLL_MS',        label: 'Polling AL (ms)',        default: C.AL_POLL_MS,        min: 2000, max: 60_000, step: 1000 },
    { key: 'AL_RETRY_MS',       label: 'Retry AL (ms)',          default: C.AL_RETRY_MS,       min: 1000, max: 30_000, step: 1000 },
    { key: 'AL_MIN_GAP_MS',     label: 'Gap mín AL (ms)',        default: C.AL_MIN_GAP_MS,     min: 500,  max: 5000, step: 100 },
  ]},
  { section: 'Labels', items: [
    { key: 'LABEL_NEAR',        label: 'Visível abaixo (m)',     default: C.LABEL_NEAR,        min: 500_000, max: 10_000_000, step: 500_000 },
    { key: 'LABEL_FAR',         label: 'Invisível acima (m)',    default: C.LABEL_FAR,         min: 1_000_000, max: 20_000_000, step: 500_000 },
  ]},
  { section: 'Embarcações', items: [
    { key: 'VESSEL_BATCH_SIZE', label: 'Batch size',             default: C.VESSEL_BATCH_SIZE, min: 5,    max: 200,  step: 5 },
    { key: 'VESSEL_LABEL_BATCH',label: 'Batch labels',           default: C.VESSEL_LABEL_BATCH,min: 5,    max: 200,  step: 5 },
    { key: 'VESSEL_STALE_MS',   label: 'Eviction (ms)',          default: C.VESSEL_STALE_MS,   min: 60_000, max: 3_600_000, step: 60_000 },
    { key: 'VESSEL_FLUSH_MS',   label: 'Flush WS (ms)',          default: C.VESSEL_FLUSH_MS,   min: 500,  max: 10_000, step: 500 },
    { key: 'VESSEL_BBOX_DEBOUNCE',label:'Debounce bbox (ms)',    default: C.VESSEL_BBOX_DEBOUNCE, min: 500, max: 10_000, step: 500 },
    { key: 'VESSEL_MIN_PX',     label: 'Ícone mín (px)',         default: C.VESSEL_MIN_PX,     min: 10,   max: 64,   step: 2 },
    { key: 'VESSEL_MAX_PX',     label: 'Ícone máx (px)',         default: C.VESSEL_MAX_PX,     min: 20,   max: 128,  step: 2 },
  ]},
  { section: 'Satélites', items: [
    { key: 'SAT_ICON_SIZE',     label: 'Ícone (px)',             default: C.SAT_ICON_SIZE,     min: 8,    max: 64,   step: 2 },
    { key: 'SATELLITE_BATCH_SIZE',label:'Batch size',            default: C.SATELLITE_BATCH_SIZE, min: 10, max: 500, step: 10 },
    { key: 'SATELLITE_LABEL_BATCH',label:'Batch labels',         default: C.SATELLITE_LABEL_BATCH,min: 5, max: 200, step: 5 },
    { key: 'TICK_INTERVAL_MS',  label: 'Tick interval (ms)',     default: C.TICK_INTERVAL_MS,  min: 100,  max: 5000, step: 100 },
  ]},
  { section: 'Telecom', items: [
    { key: 'TELECOM_DEBOUNCE_MS',label:'Debounce (ms)',          default: C.TELECOM_DEBOUNCE_MS,min: 100, max: 5000, step: 100 },
    { key: 'TELECOM_MIN_ZOOM',  label: 'Zoom mín',              default: C.TELECOM_MIN_ZOOM,  min: 1,    max: 10,   step: 1 },
    { key: 'TELECOM_MAX_ZOOM',  label: 'Zoom máx',              default: C.TELECOM_MAX_ZOOM,  min: 8,    max: 20,   step: 1 },
    { key: 'TELECOM_MAX_TILES', label: 'Max tiles',              default: C.TELECOM_MAX_TILES, min: 10,   max: 200,  step: 10 },
    { key: 'TELECOM_MAST_SIZE', label: 'Torre (px)',             default: C.TELECOM_MAST_SIZE, min: 8,    max: 64,   step: 2 },
    { key: 'TELECOM_DC_SIZE',   label: 'Data center (px)',       default: C.TELECOM_DC_SIZE,   min: 8,    max: 64,   step: 2 },
    { key: 'TELECOM_MAX_CACHE', label: 'Max cache (tiles)',      default: C.TELECOM_MAX_CACHE, min: 50,   max: 1000, step: 50 },
  ]},
  { section: 'Clima', items: [
    { key: 'WEATHER_ZOOM',      label: 'Tile zoom',              default: C.WEATHER_ZOOM,      min: 1,    max: 6,    step: 1 },
    { key: 'WEATHER_REFRESH_MS',label: 'Refresh (ms)',            default: C.WEATHER_REFRESH_MS,min: 60_000, max: 3_600_000, step: 60_000 },
  ]},
  { section: 'Rotas', items: [
    { key: 'AIR_ROUTE_ALT',     label: 'Altitude aérea (m)',     default: C.AIR_ROUTE_ALT,     min: 1000, max: 50_000, step: 1000 },
    { key: 'ROUTE_LINE_WIDTH',  label: 'Espessura da linha',     default: C.ROUTE_LINE_WIDTH,  min: 1,    max: 10,   step: 0.5 },
    { key: 'ROUTE_BBOX_PADDING',label: 'Padding bbox (°)',       default: C.ROUTE_BBOX_PADDING,min: 0,    max: 20,   step: 1 },
    { key: 'ROUTE_BATCH_SIZE',  label: 'Batch size',             default: C.ROUTE_BATCH_SIZE,  min: 10,   max: 500,  step: 10 },
  ]},
  { section: 'Antenas', items: [
    { key: 'RECEIVER_ICON_SIZE',       label: 'Ícone (px)',             default: C.RECEIVER_ICON_SIZE,       min: 10,   max: 128,  step: 2 },
    { key: 'RECEIVER_MAX_ALT',         label: 'Alt máx visível (m)',    default: C.RECEIVER_MAX_ALT,         min: 1_000_000, max: 200_000_000, step: 10_000_000 },
    { key: 'RECEIVER_VIEWPORT_PAD',    label: 'Padding viewport (°)',   default: C.RECEIVER_VIEWPORT_PAD,    min: 0,    max: 10,   step: 1 },
    { key: 'ADSB_RECEIVERS_POLL_MS',   label: 'Polling ADS-B (ms)',     default: C.ADSB_RECEIVERS_POLL_MS,   min: 60_000, max: 7_200_000, step: 60_000 },
    { key: 'AIS_STATION_FLUSH_MS',     label: 'Flush AIS (ms)',         default: C.AIS_STATION_FLUSH_MS,     min: 500,  max: 30_000, step: 500 },
  ]},
  { section: 'Busca', items: [
    { key: 'SEARCH_LIMIT',      label: 'Resultados máx',         default: C.SEARCH_LIMIT,      min: 1,    max: 20,   step: 1 },
  ]},
];

/* ── Store ───────────────────────────────────────────────────────────────── */

// Build defaults map from schema
const defaults = {};
for (const section of SETTINGS_SCHEMA) {
  for (const item of section.items) {
    defaults[item.key] = item.default;
  }
}

// Load overrides from localStorage
function loadOverrides() {
  try {
    const raw = localStorage.getItem('bb-settings');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

let overrides = loadOverrides();
let snapshot = { ...defaults, ...overrides };
const listeners = new Set();

function notify() {
  snapshot = { ...defaults, ...overrides };
  listeners.forEach(fn => fn());
}

export function getSetting(key) {
  return snapshot[key] ?? defaults[key];
}

export function setSetting(key, value) {
  overrides[key] = value;
  localStorage.setItem('bb-settings', JSON.stringify(overrides));
  notify();
}

export function resetSetting(key) {
  delete overrides[key];
  localStorage.setItem('bb-settings', JSON.stringify(overrides));
  notify();
}

export function resetAll() {
  overrides = {};
  localStorage.removeItem('bb-settings');
  notify();
}

export function isOverridden(key) {
  return key in overrides;
}

/* ── React hook ──────────────────────────────────────────────────────────── */

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export function useSettings() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useSetting(key) {
  const s = useSyncExternalStore(subscribe, getSnapshot);
  return s[key];
}
