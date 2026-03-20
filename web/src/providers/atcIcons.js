import { Color } from 'cesium';
import { svgToBlobUrl } from '../utils/svgUtils';
import controlTowerRaw from '../assets/svg/airports/control_tower.svg?raw';
import radarRaw from '../assets/svg/atc/radar.svg?raw';

const ATC_ICONS = {
  control_tower: svgToBlobUrl(controlTowerRaw, true),
  radar:         svgToBlobUrl(radarRaw, true),
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
  control_tower: { label: 'cat.atc.control_tower', color: '#FFA726' },
  radar:         { label: 'cat.atc.radar',          color: '#42A5F5' },
};
