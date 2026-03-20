import { Color } from 'cesium';
import { svgToBlobUrl } from '../utils/svgUtils';
import militaryRaw from '../assets/svg/military/base.svg?raw';

const MILITARY_ICON = svgToBlobUrl(militaryRaw);

export function getMilitaryIcon() {
  return MILITARY_ICON;
}

const CATEGORY_COLORS = {
  airfield:                '#F44336',
  barracks:                '#FF9800',
  base:                    '#E91E63',
  checkpoint:              '#FFEB3B',
  danger_area:             '#FF5722',
  naval_base:              '#2196F3',
  nuclear_explosion_site:  '#FF1744',
  office:                  '#9E9E9E',
  range:                   '#FF6D00',
  training_area:           '#4CAF50',
  bunker:                  '#795548',
  trench:                  '#607D8B',
};

export const MILITARY_CATEGORY_COLOR = Object.fromEntries(
  Object.entries(CATEGORY_COLORS).map(([k, v]) => [k, Color.fromCssColorString(v)])
);

export const MILITARY_CATEGORIES = [
  'airfield', 'barracks', 'base', 'checkpoint',
  'danger_area', 'naval_base', 'nuclear_explosion_site',
  'office', 'range', 'training_area',
  'bunker', 'trench',
];

export const MILITARY_CATEGORY_META = {
  airfield:                { label: 'cat.military.airfield',                color: CATEGORY_COLORS.airfield },
  barracks:                { label: 'cat.military.barracks',                color: CATEGORY_COLORS.barracks },
  base:                    { label: 'cat.military.base',                    color: CATEGORY_COLORS.base },
  checkpoint:              { label: 'cat.military.checkpoint',              color: CATEGORY_COLORS.checkpoint },
  danger_area:             { label: 'cat.military.danger_area',             color: CATEGORY_COLORS.danger_area },
  naval_base:              { label: 'cat.military.naval_base',              color: CATEGORY_COLORS.naval_base },
  nuclear_explosion_site:  { label: 'cat.military.nuclear_explosion_site',  color: CATEGORY_COLORS.nuclear_explosion_site },
  office:                  { label: 'cat.military.office',                  color: CATEGORY_COLORS.office },
  range:                   { label: 'cat.military.range',                   color: CATEGORY_COLORS.range },
  training_area:           { label: 'cat.military.training_area',           color: CATEGORY_COLORS.training_area },
  bunker:                  { label: 'cat.military.bunker',                  color: CATEGORY_COLORS.bunker },
  trench:                  { label: 'cat.military.trench',                  color: CATEGORY_COLORS.trench },
};

export const MILITARY_SERVICE_LABELS = {
  air_force:    'military.serviceLabels.air_force',
  army:         'military.serviceLabels.army',
  navy:         'military.serviceLabels.navy',
  marines:      'military.serviceLabels.marines',
  coast_guard:  'military.serviceLabels.coast_guard',
  border_guard: 'military.serviceLabels.border_guard',
  gendarmerie:  'military.serviceLabels.gendarmerie',
  space_force:  'military.serviceLabels.space_force',
  cyber:        'military.serviceLabels.cyber',
};
