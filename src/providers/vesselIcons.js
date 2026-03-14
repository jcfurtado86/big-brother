import { Color } from 'cesium';
import hullRaw from '../assets/svg/vessels/hull.svg?raw';

// SVG branco único — cor aplicada via Cesium billboard.color
const HULL_URL = URL.createObjectURL(
  new Blob([hullRaw], { type: 'image/svg+xml' })
);

// AIS ship type ranges → category
export function getVesselCategory(shipType) {
  if (shipType >= 70 && shipType <= 79) return 'cargo';
  if (shipType >= 80 && shipType <= 89) return 'tanker';
  if (shipType >= 60 && shipType <= 69) return 'passenger';
  if (shipType === 30)                  return 'fishing';
  if (shipType === 36)                  return 'sailing';
  if (shipType === 35)                  return 'military';
  if (shipType === 55)                  return 'military';
  if (shipType === 51)                  return 'sar';
  if (shipType >= 31 && shipType <= 32) return 'tug';
  if (shipType >= 50 && shipType <= 57) return 'tug'; // pilot, tug, port tender
  return 'unknown';
}

export const VESSEL_CATEGORY_SIZE = {
  cargo:     { w: 36, h: 36 },
  tanker:    { w: 38, h: 38 },
  passenger: { w: 34, h: 34 },
  fishing:   { w: 24, h: 24 },
  sailing:   { w: 26, h: 26 },
  tug:       { w: 22, h: 22 },
  military:  { w: 30, h: 30 },
  sar:       { w: 28, h: 28 },
  unknown:   { w: 26, h: 26 },
};

export const VESSEL_CATEGORY_META = {
  cargo:     { label: 'Carga',      color: '#2196F3' },   // azul
  tanker:    { label: 'Tanque',     color: '#F44336' },   // vermelho
  passenger: { label: 'Passageiro', color: '#4CAF50' },   // verde
  fishing:   { label: 'Pesca',      color: '#FF9800' },   // laranja
  sailing:   { label: 'Veleiro',    color: '#FFFFFF' },   // branco
  tug:       { label: 'Rebocador',  color: '#FFEB3B' },   // amarelo
  military:  { label: 'Militar',    color: '#2E7D32' },   // verde escuro
  sar:       { label: 'SAR',        color: '#F44336' },   // vermelho
  unknown:   { label: 'Outro',      color: '#9E9E9E' },   // cinza
};

// Cesium Color por categoria (para billboard.color)
export const VESSEL_CATEGORY_COLOR = {
  cargo:     Color.fromCssColorString('#2196F3'),
  tanker:    Color.fromCssColorString('#F44336'),
  passenger: Color.fromCssColorString('#4CAF50'),
  fishing:   Color.fromCssColorString('#FF9800'),
  sailing:   Color.WHITE,
  tug:       Color.fromCssColorString('#FFEB3B'),
  military:  Color.fromCssColorString('#2E7D32'),
  sar:       Color.fromCssColorString('#F44336'),
  unknown:   Color.fromCssColorString('#9E9E9E'),
};

export const VESSEL_TYPES = Object.keys(VESSEL_CATEGORY_META);

export function getVesselIcon() {
  return HULL_URL;
}
