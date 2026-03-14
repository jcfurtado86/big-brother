import { Color } from 'cesium';
import towerRaw from '../assets/svg/telecom/tower.svg?raw';

const TOWER_URL = URL.createObjectURL(
  new Blob([towerRaw], { type: 'image/svg+xml' })
);

export function getTelecomIcon() {
  return TOWER_URL;
}

// Mapeia layer name do OpenInfraMap → categoria interna
export function getTelecomCategory(layerName) {
  if (layerName === 'telecoms_mast') return 'mast';
  if (layerName === 'telecoms_data_center') return 'data_center';
  if (layerName === 'telecoms_communication_line') return 'comm_line';
  return 'mast';
}

export const TELECOM_CATEGORY_COLOR = {
  mast:        Color.fromCssColorString('#FF5252'),
  data_center: Color.fromCssColorString('#69F0AE'),
  comm_line:   Color.fromCssColorString('#448AFF'),
};

export const TELECOM_CATEGORIES = ['mast', 'comm_line', 'data_center'];

export const TELECOM_CATEGORY_META = {
  mast:        { label: 'Torres',          color: '#FF5252' },
  comm_line:   { label: 'Cabos de Comunicação',      color: '#448AFF' },
  data_center: { label: 'Data Centers',   color: '#69F0AE' },
};
