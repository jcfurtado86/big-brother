import { useSyncExternalStore } from 'react';
import * as C from './constants';

/* ── Schema ──────────────────────────────────────────────────────────────── */

export const SETTINGS_SCHEMA = [
  { section: 'settings.section.camera', items: [
    { key: 'ZOOM_SENSITIVITY',  label: 'settings.ZOOM_SENSITIVITY',  desc: 'settings.ZOOM_SENSITIVITY_desc', default: C.ZOOM_SENSITIVITY,  min: 0.01, max: 0.3,  step: 0.01 },
    { key: 'ZOOM_MIN',          label: 'settings.ZOOM_MIN',          desc: 'settings.ZOOM_MIN_desc', default: C.ZOOM_MIN,          min: 10,   max: 1000, step: 10 },
    { key: 'ZOOM_MAX',          label: 'settings.ZOOM_MAX',          desc: 'settings.ZOOM_MAX_desc', default: C.ZOOM_MAX,          min: 10_000_000, max: 100_000_000, step: 5_000_000 },
    { key: 'FLY_DURATION',      label: 'settings.FLY_DURATION',      desc: 'settings.FLY_DURATION_desc', default: C.FLY_DURATION,      min: 0.2,  max: 5,    step: 0.1 },
    { key: 'FLY_ZOOM_FACTOR',   label: 'settings.FLY_ZOOM_FACTOR',   desc: 'settings.FLY_ZOOM_FACTOR_desc', default: C.FLY_ZOOM_FACTOR,   min: 1,    max: 10,   step: 1 },
    { key: 'FLY_MIN_ALT',       label: 'settings.FLY_MIN_ALT',       desc: 'settings.FLY_MIN_ALT_desc', default: C.FLY_MIN_ALT,       min: 500,  max: 10_000, step: 500 },
  ]},
  { section: 'settings.section.aircraft', items: [
    { key: 'FLIGHT_ALT_SCALE',  label: 'settings.FLIGHT_ALT_SCALE',  desc: 'settings.FLIGHT_ALT_SCALE_desc', default: C.FLIGHT_ALT_SCALE,  min: 1,    max: 15,   step: 0.5 },
    { key: 'DEAD_RECKONING_MS', label: 'settings.DEAD_RECKONING_MS', desc: 'settings.DEAD_RECKONING_MS_desc', default: C.DEAD_RECKONING_MS, min: 100,  max: 5000, step: 100 },
    { key: 'PLANE_BATCH_SIZE',  label: 'settings.PLANE_BATCH_SIZE',  desc: 'settings.PLANE_BATCH_SIZE_desc', default: C.PLANE_BATCH_SIZE,  min: 5,    max: 200,  step: 5 },
    { key: 'CALLSIGN_BATCH_SIZE',label:'settings.CALLSIGN_BATCH_SIZE',desc: 'settings.CALLSIGN_BATCH_SIZE_desc', default: C.CALLSIGN_BATCH_SIZE, min: 5,  max: 200,  step: 5 },
    { key: 'FETCH_PADDING',     label: 'settings.FETCH_PADDING',     desc: 'settings.FETCH_PADDING_desc', default: C.FETCH_PADDING,     min: 0,    max: 5,    step: 0.1 },
  ]},
  { section: 'settings.section.providers', items: [
    { key: 'AL_POLL_MS',        label: 'settings.AL_POLL_MS',        desc: 'settings.AL_POLL_MS_desc', default: C.AL_POLL_MS,        min: 2000, max: 300_000, step: 1000 },
    { key: 'AL_RETRY_MS',       label: 'settings.AL_RETRY_MS',       desc: 'settings.AL_RETRY_MS_desc', default: C.AL_RETRY_MS,       min: 1000, max: 30_000, step: 1000 },
    { key: 'AL_MIN_GAP_MS',     label: 'settings.AL_MIN_GAP_MS',     desc: 'settings.AL_MIN_GAP_MS_desc', default: C.AL_MIN_GAP_MS,     min: 500,  max: 5000, step: 100 },
  ]},
  { section: 'settings.section.labels', items: [
    { key: 'LABEL_NEAR',        label: 'settings.LABEL_NEAR',        desc: 'settings.LABEL_NEAR_desc', default: C.LABEL_NEAR,        min: 500_000, max: 10_000_000, step: 500_000 },
    { key: 'LABEL_FAR',         label: 'settings.LABEL_FAR',         desc: 'settings.LABEL_FAR_desc', default: C.LABEL_FAR,         min: 1_000_000, max: 20_000_000, step: 500_000 },
  ]},
  { section: 'settings.section.vessels', items: [
    { key: 'VESSEL_BATCH_SIZE', label: 'settings.VESSEL_BATCH_SIZE', desc: 'settings.VESSEL_BATCH_SIZE_desc', default: C.VESSEL_BATCH_SIZE, min: 5,    max: 200,  step: 5 },
    { key: 'VESSEL_LABEL_BATCH',label: 'settings.VESSEL_LABEL_BATCH',desc: 'settings.VESSEL_LABEL_BATCH_desc', default: C.VESSEL_LABEL_BATCH,min: 5,    max: 200,  step: 5 },
    { key: 'VESSEL_STALE_MS',   label: 'settings.VESSEL_STALE_MS',   desc: 'settings.VESSEL_STALE_MS_desc', default: C.VESSEL_STALE_MS,   min: 60_000, max: 3_600_000, step: 60_000 },
    { key: 'VESSEL_FLUSH_MS',   label: 'settings.VESSEL_FLUSH_MS',   desc: 'settings.VESSEL_FLUSH_MS_desc', default: C.VESSEL_FLUSH_MS,   min: 500,  max: 10_000, step: 500 },
    { key: 'VESSEL_BBOX_DEBOUNCE',label:'settings.VESSEL_BBOX_DEBOUNCE',desc: 'settings.VESSEL_BBOX_DEBOUNCE_desc', default: C.VESSEL_BBOX_DEBOUNCE, min: 500, max: 10_000, step: 500 },
    { key: 'VESSEL_MIN_PX',     label: 'settings.VESSEL_MIN_PX',     desc: 'settings.VESSEL_MIN_PX_desc', default: C.VESSEL_MIN_PX,     min: 10,   max: 64,   step: 2 },
    { key: 'VESSEL_MAX_PX',     label: 'settings.VESSEL_MAX_PX',     desc: 'settings.VESSEL_MAX_PX_desc', default: C.VESSEL_MAX_PX,     min: 20,   max: 128,  step: 2 },
  ]},
  { section: 'settings.section.satellites', items: [
    { key: 'SAT_ICON_SIZE',     label: 'settings.SAT_ICON_SIZE',     desc: 'settings.SAT_ICON_SIZE_desc', default: C.SAT_ICON_SIZE,     min: 8,    max: 64,   step: 2 },
    { key: 'SATELLITE_BATCH_SIZE',label:'settings.SATELLITE_BATCH_SIZE',desc: 'settings.SATELLITE_BATCH_SIZE_desc', default: C.SATELLITE_BATCH_SIZE, min: 10, max: 500, step: 10 },
    { key: 'SATELLITE_LABEL_BATCH',label:'settings.SATELLITE_LABEL_BATCH',desc: 'settings.SATELLITE_LABEL_BATCH_desc', default: C.SATELLITE_LABEL_BATCH,min: 5, max: 200, step: 5 },
    { key: 'TICK_INTERVAL_MS',  label: 'settings.TICK_INTERVAL_MS',  desc: 'settings.TICK_INTERVAL_MS_desc', default: C.TICK_INTERVAL_MS,  min: 100,  max: 5000, step: 100 },
  ]},
  { section: 'settings.section.telecom', items: [
    { key: 'TELECOM_DEBOUNCE_MS',label:'settings.TELECOM_DEBOUNCE_MS',desc: 'settings.TELECOM_DEBOUNCE_MS_desc', default: C.TELECOM_DEBOUNCE_MS,min: 100, max: 5000, step: 100 },
    { key: 'TELECOM_MIN_ZOOM',  label: 'settings.TELECOM_MIN_ZOOM',  desc: 'settings.TELECOM_MIN_ZOOM_desc', default: C.TELECOM_MIN_ZOOM,  min: 1,    max: 10,   step: 1 },
    { key: 'TELECOM_MAX_ZOOM',  label: 'settings.TELECOM_MAX_ZOOM',  desc: 'settings.TELECOM_MAX_ZOOM_desc', default: C.TELECOM_MAX_ZOOM,  min: 8,    max: 20,   step: 1 },
    { key: 'TELECOM_MAX_TILES', label: 'settings.TELECOM_MAX_TILES', desc: 'settings.TELECOM_MAX_TILES_desc', default: C.TELECOM_MAX_TILES, min: 10,   max: 200,  step: 10 },
    { key: 'TELECOM_MAST_SIZE', label: 'settings.TELECOM_MAST_SIZE', desc: 'settings.TELECOM_MAST_SIZE_desc', default: C.TELECOM_MAST_SIZE, min: 8,    max: 64,   step: 2 },
    { key: 'TELECOM_DC_SIZE',   label: 'settings.TELECOM_DC_SIZE',   desc: 'settings.TELECOM_DC_SIZE_desc', default: C.TELECOM_DC_SIZE,   min: 8,    max: 64,   step: 2 },
    { key: 'TELECOM_MAX_CACHE', label: 'settings.TELECOM_MAX_CACHE', desc: 'settings.TELECOM_MAX_CACHE_desc', default: C.TELECOM_MAX_CACHE, min: 50,   max: 1000, step: 50 },
  ]},
  { section: 'settings.section.weather', items: [
    { key: 'WEATHER_ZOOM',      label: 'settings.WEATHER_ZOOM',      desc: 'settings.WEATHER_ZOOM_desc', default: C.WEATHER_ZOOM,      min: 1,    max: 6,    step: 1 },
    { key: 'WEATHER_REFRESH_MS',label: 'settings.WEATHER_REFRESH_MS',desc: 'settings.WEATHER_REFRESH_MS_desc', default: C.WEATHER_REFRESH_MS,min: 60_000, max: 3_600_000, step: 60_000 },
  ]},
  { section: 'settings.section.routes', items: [
    { key: 'AIR_ROUTE_ALT',     label: 'settings.AIR_ROUTE_ALT',     desc: 'settings.AIR_ROUTE_ALT_desc', default: C.AIR_ROUTE_ALT,     min: 1000, max: 50_000, step: 1000 },
    { key: 'ROUTE_LINE_WIDTH',  label: 'settings.ROUTE_LINE_WIDTH',  desc: 'settings.ROUTE_LINE_WIDTH_desc', default: C.ROUTE_LINE_WIDTH,  min: 1,    max: 10,   step: 0.5 },
    { key: 'ROUTE_BBOX_PADDING',label: 'settings.ROUTE_BBOX_PADDING',desc: 'settings.ROUTE_BBOX_PADDING_desc', default: C.ROUTE_BBOX_PADDING,min: 0,    max: 20,   step: 1 },
    { key: 'ROUTE_BATCH_SIZE',  label: 'settings.ROUTE_BATCH_SIZE',  desc: 'settings.ROUTE_BATCH_SIZE_desc', default: C.ROUTE_BATCH_SIZE,  min: 10,   max: 500,  step: 10 },
  ]},
  { section: 'settings.section.antennas', items: [
    { key: 'RECEIVER_ICON_SIZE',       label: 'settings.RECEIVER_ICON_SIZE',       desc: 'settings.RECEIVER_ICON_SIZE_desc', default: C.RECEIVER_ICON_SIZE,       min: 10,   max: 128,  step: 2 },
    { key: 'RECEIVER_MAX_ALT',         label: 'settings.RECEIVER_MAX_ALT',         desc: 'settings.RECEIVER_MAX_ALT_desc', default: C.RECEIVER_MAX_ALT,         min: 1_000_000, max: 200_000_000, step: 10_000_000 },
    { key: 'RECEIVER_VIEWPORT_PAD',    label: 'settings.RECEIVER_VIEWPORT_PAD',    desc: 'settings.RECEIVER_VIEWPORT_PAD_desc', default: C.RECEIVER_VIEWPORT_PAD,    min: 0,    max: 10,   step: 1 },
    { key: 'ADSB_RECEIVERS_POLL_MS',   label: 'settings.ADSB_RECEIVERS_POLL_MS',   desc: 'settings.ADSB_RECEIVERS_POLL_MS_desc', default: C.ADSB_RECEIVERS_POLL_MS,   min: 60_000, max: 7_200_000, step: 60_000 },
    { key: 'AIS_STATION_FLUSH_MS',     label: 'settings.AIS_STATION_FLUSH_MS',     desc: 'settings.AIS_STATION_FLUSH_MS_desc', default: C.AIS_STATION_FLUSH_MS,     min: 500,  max: 30_000, step: 500 },
  ]},
  { section: 'settings.section.radarAtc', items: [
    { key: 'ATC_DEBOUNCE_MS',  label: 'settings.ATC_DEBOUNCE_MS',  desc: 'settings.ATC_DEBOUNCE_MS_desc', default: C.ATC_DEBOUNCE_MS,  min: 500,  max: 10_000, step: 500 },
    { key: 'ATC_MAX_ALT',      label: 'settings.ATC_MAX_ALT',      desc: 'settings.ATC_MAX_ALT_desc', default: C.ATC_MAX_ALT,      min: 100_000, max: 200_000_000, step: 10_000_000 },
    { key: 'ATC_TOWER_SIZE',   label: 'settings.ATC_TOWER_SIZE',   desc: 'settings.ATC_TOWER_SIZE_desc', default: C.ATC_TOWER_SIZE,   min: 10, max: 64, step: 2 },
    { key: 'ATC_RADAR_SIZE',   label: 'settings.ATC_RADAR_SIZE',   desc: 'settings.ATC_RADAR_SIZE_desc', default: C.ATC_RADAR_SIZE,   min: 10, max: 64, step: 2 },
  ]},
  { section: 'settings.section.military', items: [
    { key: 'MILITARY_ICON_SIZE',   label: 'settings.MILITARY_ICON_SIZE',   desc: 'settings.MILITARY_ICON_SIZE_desc', default: C.MILITARY_ICON_SIZE,   min: 10, max: 64, step: 2 },
    { key: 'MILITARY_DEBOUNCE_MS', label: 'settings.MILITARY_DEBOUNCE_MS', desc: 'settings.MILITARY_DEBOUNCE_MS_desc', default: C.MILITARY_DEBOUNCE_MS, min: 500, max: 10_000, step: 500 },
    { key: 'MILITARY_MAX_ALT',     label: 'settings.MILITARY_MAX_ALT',     desc: 'settings.MILITARY_MAX_ALT_desc', default: C.MILITARY_MAX_ALT,     min: 100_000, max: 200_000_000, step: 10_000_000 },
  ]},
  { section: 'settings.section.conflictsAcled', items: [
    { key: 'ACLED_ICON_SIZE',     label: 'settings.ACLED_ICON_SIZE',     desc: 'settings.ACLED_ICON_SIZE_desc', default: C.ACLED_ICON_SIZE,     min: 10, max: 64, step: 2 },
    { key: 'ACLED_DEBOUNCE_MS',   label: 'settings.ACLED_DEBOUNCE_MS',   desc: 'settings.ACLED_DEBOUNCE_MS_desc', default: C.ACLED_DEBOUNCE_MS, min: 500, max: 10_000, step: 500 },
    { key: 'ACLED_MAX_ALT',       label: 'settings.ACLED_MAX_ALT',       desc: 'settings.ACLED_MAX_ALT_desc', default: C.ACLED_MAX_ALT,     min: 100_000, max: 200_000_000, step: 10_000_000 },
  ]},
  { section: 'settings.section.webcams', items: [
    { key: 'WEBCAM_ICON_SIZE',     label: 'settings.WEBCAM_ICON_SIZE',     desc: 'settings.WEBCAM_ICON_SIZE_desc', default: C.WEBCAM_ICON_SIZE,     min: 10, max: 64, step: 2 },
    { key: 'WEBCAM_DEBOUNCE_MS',   label: 'settings.WEBCAM_DEBOUNCE_MS',   desc: 'settings.WEBCAM_DEBOUNCE_MS_desc', default: C.WEBCAM_DEBOUNCE_MS, min: 500, max: 10_000, step: 500 },
    { key: 'WEBCAM_MAX_ALT',       label: 'settings.WEBCAM_MAX_ALT',       desc: 'settings.WEBCAM_MAX_ALT_desc', default: C.WEBCAM_MAX_ALT,     min: 10_000, max: 200_000, step: 10_000 },
  ]},
  { section: 'settings.section.nuclear', items: [
    { key: 'NUCLEAR_ICON_SIZE',    label: 'settings.NUCLEAR_ICON_SIZE',    desc: 'settings.NUCLEAR_ICON_SIZE_desc', default: C.NUCLEAR_ICON_SIZE,    min: 10, max: 64, step: 2 },
  ]},
  { section: 'settings.section.airspace', items: [
    { key: 'AIRSPACE_DEBOUNCE_MS', label: 'settings.AIRSPACE_DEBOUNCE_MS', desc: 'settings.AIRSPACE_DEBOUNCE_MS_desc', default: C.AIRSPACE_DEBOUNCE_MS, min: 500, max: 10_000, step: 500 },
    { key: 'AIRSPACE_MAX_ALT',     label: 'settings.AIRSPACE_MAX_ALT',     desc: 'settings.AIRSPACE_MAX_ALT_desc', default: C.AIRSPACE_MAX_ALT,     min: 100_000, max: 200_000_000, step: 10_000_000 },
  ]},
  { section: 'settings.section.search', items: [
    { key: 'SEARCH_LIMIT',      label: 'settings.SEARCH_LIMIT',      desc: 'settings.SEARCH_LIMIT_desc', default: C.SEARCH_LIMIT,      min: 1,    max: 20,   step: 1 },
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
