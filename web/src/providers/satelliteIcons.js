import { Color } from 'cesium';
import satRaw from '../assets/svg/satellites/satellite4.svg?raw';

const SAT_URL = URL.createObjectURL(
  new Blob([satRaw], { type: 'image/svg+xml' })
);

export function getSatelliteIcon() {
  return SAT_URL;
}

// Categorização por altitude orbital
export function getSatelliteCategory(altKm) {
  if (altKm < 2_000)  return 'leo';
  if (altKm < 35_000) return 'meo';
  return 'geo';
}

export const SATELLITE_CATEGORY_COLOR = {
  leo: Color.fromCssColorString('#00E5FF'),   // ciano
  meo: Color.fromCssColorString('#FF9800'),   // laranja
  geo: Color.fromCssColorString('#E040FB'),   // roxo
};

export const SATELLITE_CATEGORIES = ['leo', 'meo', 'geo'];

export const SATELLITE_CATEGORY_META = {
  leo: { label: 'cat.satellite.leo',      color: '#00E5FF' },
  meo: { label: 'cat.satellite.meo',   color: '#FF9800' },
  geo: { label: 'cat.satellite.geo',  color: '#E040FB' },
};
