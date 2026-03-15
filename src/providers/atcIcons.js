import { Color } from 'cesium';
import controlTowerRaw from '../assets/svg/airports/control_tower.svg?raw';
import radarRaw from '../assets/svg/atc/radar.svg?raw';

function svgToBlobUrl(raw) {
  // SVGs must be white so Cesium billboard.color can tint them
  const white = raw.replace(/<svg /,'<svg fill="white" ');
  return URL.createObjectURL(new Blob([white], { type: 'image/svg+xml' }));
}

const ATC_ICONS = {
  control_tower: svgToBlobUrl(controlTowerRaw),
  radar:         svgToBlobUrl(radarRaw),
};

export function getAtcIcon(category) {
  return ATC_ICONS[category] ?? ATC_ICONS.radar;
}

export const ATC_CATEGORY_COLOR = {
  control_tower: Color.fromCssColorString('#FFA726'),
  radar:         Color.fromCssColorString('#42A5F5'),
};

export const ATC_CATEGORIES = ['control_tower', 'radar'];

export const ATC_CATEGORY_META = {
  control_tower: { label: 'Torres de controle', color: '#FFA726' },
  radar:         { label: 'Radares',            color: '#42A5F5' },
};
