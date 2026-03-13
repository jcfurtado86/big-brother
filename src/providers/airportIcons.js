import { NearFarScalar } from 'cesium';

const N = (key, fallback) => Number(import.meta.env[key] ?? fallback);

// maxAlt: altitude máxima da câmera (em metros) para exibir este tipo.
export const AIRPORT_TYPE_META = {
  large_airport:  { color: '#4A9EFF', size: 18, label: 'Grandes aeroportos',  scale: new NearFarScalar(1e5, 1.2, 2e7, 0.3), maxAlt: N('VITE_AIRPORT_MAX_ALT_LARGE',   999999999) },
  medium_airport: { color: '#38C5A0', size: 12, label: 'Médios aeroportos',   scale: new NearFarScalar(5e4, 1.0, 5e6, 0.3), maxAlt: N('VITE_AIRPORT_MAX_ALT_MEDIUM',  2_500_000) },
  small_airport:  { color: '#778899', size:  8, label: 'Pequenos aeroportos', scale: new NearFarScalar(1e4, 1.0, 8e5, 0.0), maxAlt: N('VITE_AIRPORT_MAX_ALT_SMALL',    800_000) },
  heliport:       { color: '#FFCC00', size:  8, label: 'Helipads',            scale: new NearFarScalar(5e3, 1.0, 3e5, 0.0), maxAlt: N('VITE_AIRPORT_MAX_ALT_HELIPORT',  800_000) },
  seaplane_base:  { color: '#00CCEE', size:  9, label: 'Bases hidroavião',    scale: new NearFarScalar(5e3, 1.0, 6e5, 0.0), maxAlt: N('VITE_AIRPORT_MAX_ALT_SEAPLANE', 300_000) },
  balloonport:    { color: '#CC88FF', size:  7, label: 'Balões',              scale: new NearFarScalar(2e3, 1.0, 1e5, 0.0), maxAlt: N('VITE_AIRPORT_MAX_ALT_BALLOON',   80_000) },
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
