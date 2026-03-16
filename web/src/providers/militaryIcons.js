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
  airfield:                { label: 'Aerodromos',         color: CATEGORY_COLORS.airfield },
  barracks:                { label: 'Quarteis',           color: CATEGORY_COLORS.barracks },
  base:                    { label: 'Bases',              color: CATEGORY_COLORS.base },
  checkpoint:              { label: 'Checkpoints',        color: CATEGORY_COLORS.checkpoint },
  danger_area:             { label: 'Areas de perigo',    color: CATEGORY_COLORS.danger_area },
  naval_base:              { label: 'Bases navais',       color: CATEGORY_COLORS.naval_base },
  nuclear_explosion_site:  { label: 'Testes nucleares',   color: CATEGORY_COLORS.nuclear_explosion_site },
  office:                  { label: 'Escritorios',        color: CATEGORY_COLORS.office },
  range:                   { label: 'Campos de tiro',     color: CATEGORY_COLORS.range },
  training_area:           { label: 'Areas de treino',    color: CATEGORY_COLORS.training_area },
  bunker:                  { label: 'Bunkers',            color: CATEGORY_COLORS.bunker },
  trench:                  { label: 'Trincheiras',        color: CATEGORY_COLORS.trench },
};

export const MILITARY_SERVICE_LABELS = {
  air_force:    'Forca Aerea',
  army:         'Exercito',
  navy:         'Marinha',
  marines:      'Fuzileiros',
  coast_guard:  'Guarda Costeira',
  border_guard: 'Guarda de Fronteira',
  gendarmerie:  'Gendarmaria',
  space_force:  'Forca Espacial',
  cyber:        'Cibernetica',
};
