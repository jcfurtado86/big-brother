import { Color } from 'cesium';
import towerRaw from '../assets/svg/telecom/tower2.svg?raw';
import dataCenterRaw from '../assets/svg/telecom/data_center.svg?raw';

function svgToBlobUrl(raw) {
  return URL.createObjectURL(new Blob([raw], { type: 'image/svg+xml' }));
}

const TELECOM_ICONS = {
  mast:        svgToBlobUrl(towerRaw),
  data_center: svgToBlobUrl(dataCenterRaw),
};

export function getTelecomIcon(category) {
  return TELECOM_ICONS[category] ?? TELECOM_ICONS.mast;
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
