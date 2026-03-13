import { NearFarScalar } from 'cesium';
import { AIRPORT_MAX_ALT } from './constants';

// maxAlt: altitude máxima da câmera (em metros) para exibir este tipo.
export const AIRPORT_TYPE_META = {
  large_airport:  { color: '#4A9EFF', size: 18, label: 'Grandes aeroportos',  scale: new NearFarScalar(1e5, 1.2, 2e7, 0.3), maxAlt: AIRPORT_MAX_ALT.large_airport },
  medium_airport: { color: '#38C5A0', size: 12, label: 'Médios aeroportos',   scale: new NearFarScalar(5e4, 1.0, 5e6, 0.3), maxAlt: AIRPORT_MAX_ALT.medium_airport },
  small_airport:  { color: '#778899', size:  8, label: 'Pequenos aeroportos', scale: new NearFarScalar(1e4, 1.0, 8e5, 0.0), maxAlt: AIRPORT_MAX_ALT.small_airport },
  heliport:       { color: '#FFCC00', size:  8, label: 'Helipads',            scale: new NearFarScalar(5e3, 1.0, 3e5, 0.0), maxAlt: AIRPORT_MAX_ALT.heliport },
  seaplane_base:  { color: '#00CCEE', size:  9, label: 'Bases hidroavião',    scale: new NearFarScalar(5e3, 1.0, 6e5, 0.0), maxAlt: AIRPORT_MAX_ALT.seaplane_base },
  balloonport:    { color: '#CC88FF', size:  7, label: 'Balões',              scale: new NearFarScalar(2e3, 1.0, 1e5, 0.0), maxAlt: AIRPORT_MAX_ALT.balloonport },
};

export const AIRPORT_TYPES = Object.keys(AIRPORT_TYPE_META);

const _iconCache = {};

function buildIcon(type) {
  const { color, size } = AIRPORT_TYPE_META[type];
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  return canvas;
}

export function getAirportIcon(type) {
  if (!_iconCache[type]) _iconCache[type] = buildIcon(type);
  return _iconCache[type];
}
