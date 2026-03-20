import { Color } from 'cesium';
import vesselRaw from '../assets/svg/vessels/vessel2.svg?raw';

// SVG branco único — cor aplicada via Cesium billboard.color
const VESSEL_URL = URL.createObjectURL(
  new Blob([vesselRaw], { type: 'image/svg+xml' })
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
  dark:      { w: 32, h: 32 },
};

export const VESSEL_CATEGORIES = ['cargo', 'tanker', 'passenger', 'fishing', 'sailing', 'tug', 'military', 'sar', 'dark'];

export const VESSEL_CATEGORY_META = {
  cargo:     { label: 'cat.vessel.cargo',      color: '#2196F3' },   // azul
  tanker:    { label: 'cat.vessel.tanker',     color: '#F44336' },   // vermelho
  passenger: { label: 'cat.vessel.passenger', color: '#4CAF50' },   // verde
  fishing:   { label: 'cat.vessel.fishing',      color: '#FF9800' },   // laranja
  sailing:   { label: 'cat.vessel.sailing',    color: '#FFFFFF' },   // branco
  tug:       { label: 'cat.vessel.tug',  color: '#FFEB3B' },   // amarelo
  military:  { label: 'cat.vessel.military',    color: '#2E7D32' },   // verde escuro
  sar:       { label: 'cat.vessel.sar',        color: '#F44336' },   // vermelho
  unknown:   { label: 'cat.vessel.unknown',      color: '#9E9E9E' },   // cinza
  dark:      { label: 'cat.vessel.sanctioned', color: '#9C27B0' },   // roxo
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
  dark:      Color.fromCssColorString('#9C27B0'),
};

export const VESSEL_TYPES = Object.keys(VESSEL_CATEGORY_META);

export function getVesselIcon() {
  return VESSEL_URL;
}
