import { Color } from 'cesium';
import { svgToBlobUrl } from '../utils/svgUtils';
import militaryRaw from '../assets/svg/military/base.svg?raw';

const MILITARY_ICON = svgToBlobUrl(militaryRaw);

export function getMilitaryIcon() {
  return MILITARY_ICON;
}

export const MILITARY_CATEGORY_COLOR = {
  airfield:                Color.fromCssColorString('#F44336'),
  barracks:                Color.fromCssColorString('#FF9800'),
  base:                    Color.fromCssColorString('#E91E63'),
  checkpoint:              Color.fromCssColorString('#FFEB3B'),
  danger_area:             Color.fromCssColorString('#FF5722'),
  naval_base:              Color.fromCssColorString('#2196F3'),
  nuclear_explosion_site:  Color.fromCssColorString('#FF1744'),
  office:                  Color.fromCssColorString('#9E9E9E'),
  range:                   Color.fromCssColorString('#FF6D00'),
  training_area:           Color.fromCssColorString('#4CAF50'),
};

export const MILITARY_CATEGORIES = [
  'airfield', 'barracks', 'base', 'checkpoint',
  'danger_area', 'naval_base', 'nuclear_explosion_site',
  'office', 'range', 'training_area',
];

export const MILITARY_CATEGORY_META = {
  airfield:                { label: 'Aerodromos',         color: '#F44336' },
  barracks:                { label: 'Quarteis',           color: '#FF9800' },
  base:                    { label: 'Bases',              color: '#E91E63' },
  checkpoint:              { label: 'Checkpoints',        color: '#FFEB3B' },
  danger_area:             { label: 'Areas de perigo',    color: '#FF5722' },
  naval_base:              { label: 'Bases navais',       color: '#2196F3' },
  nuclear_explosion_site:  { label: 'Testes nucleares',   color: '#FF1744' },
  office:                  { label: 'Escritorios',        color: '#9E9E9E' },
  range:                   { label: 'Campos de tiro',     color: '#FF6D00' },
  training_area:           { label: 'Areas de treino',    color: '#4CAF50' },
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
