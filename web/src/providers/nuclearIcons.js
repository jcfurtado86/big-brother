import { Color } from 'cesium';
import { svgToBlobUrl } from '../utils/svgUtils';
import plantRaw from '../assets/svg/nuclear/plant.svg?raw';

const NUCLEAR_ICON = svgToBlobUrl(plantRaw);

export function getNuclearIcon() {
  return NUCLEAR_ICON;
}

export const NUCLEAR_STATUS_COLOR = {
  operational:              Color.fromCssColorString('#4CAF50'),
  under_construction:       Color.fromCssColorString('#2196F3'),
  planned:                  Color.fromCssColorString('#FFC107'),
  shutdown:                 Color.fromCssColorString('#9E9E9E'),
  suspended_operation:      Color.fromCssColorString('#FF9800'),
  suspended_construction:   Color.fromCssColorString('#FF5722'),
  cancelled_construction:   Color.fromCssColorString('#795548'),
  decommissioning_completed:Color.fromCssColorString('#607D8B'),
  never_commissioned:       Color.fromCssColorString('#E91E63'),
  unknown:                  Color.fromCssColorString('#BDBDBD'),
};

export const NUCLEAR_CATEGORIES = [
  'operational', 'under_construction', 'planned', 'shutdown', 'suspended_operation',
];

export const NUCLEAR_CATEGORY_META = {
  operational:            { label: 'cat.nuclear.operational',          color: '#4CAF50' },
  under_construction:     { label: 'cat.nuclear.under_construction',  color: '#2196F3' },
  planned:                { label: 'cat.nuclear.planned',             color: '#FFC107' },
  shutdown:               { label: 'cat.nuclear.shutdown',            color: '#9E9E9E' },
  suspended_operation:    { label: 'cat.nuclear.suspended_operation', color: '#FF9800' },
};

export const REACTOR_TYPE_LABELS = {
  PWR:   'Pressurized Water Reactor',
  BWR:   'Boiling Water Reactor',
  PHWR:  'Pressurized Heavy Water Reactor',
  GCR:   'Gas-Cooled Reactor',
  LWGR:  'Light Water Graphite Reactor',
  FBR:   'Fast Breeder Reactor',
  ABWR:  'Advanced Boiling Water Reactor',
  HTGR:  'High-Temperature Gas-Cooled Reactor',
  HWGCR: 'Heavy Water Gas-Cooled Reactor',
  HWLWR: 'Heavy Water Light Water Reactor',
  APWR:  'Advanced Pressurized Water Reactor',
  SGHWR: 'Steam Generating Heavy Water Reactor',
  OCR:   'Organic Cooled Reactor',
};
