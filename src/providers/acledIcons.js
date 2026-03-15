import { Color } from 'cesium';
import { svgToBlobUrl } from '../utils/svgUtils';
import eventRaw from '../assets/svg/acled/event.svg?raw';

const ACLED_ICON = svgToBlobUrl(eventRaw);

export function getAcledIcon() {
  return ACLED_ICON;
}

export const ACLED_CATEGORY_COLOR = {
  battles:                    Color.fromCssColorString('#F44336'),
  explosions_remote_violence: Color.fromCssColorString('#FF5722'),
  violence_against_civilians: Color.fromCssColorString('#E91E63'),
  protests:                   Color.fromCssColorString('#FFC107'),
  riots:                      Color.fromCssColorString('#FF9800'),
  strategic_developments:     Color.fromCssColorString('#2196F3'),
};

export const ACLED_CATEGORIES = [
  'battles',
  'explosions_remote_violence',
  'violence_against_civilians',
  'protests',
  'riots',
  'strategic_developments',
];

export const ACLED_CATEGORY_META = {
  battles:                    { label: 'Batalhas',               color: '#F44336' },
  explosions_remote_violence: { label: 'Explosoes / Violencia remota', color: '#FF5722' },
  violence_against_civilians: { label: 'Violencia contra civis', color: '#E91E63' },
  protests:                   { label: 'Protestos',              color: '#FFC107' },
  riots:                      { label: 'Tumultos',               color: '#FF9800' },
  strategic_developments:     { label: 'Desenvolvimentos estrategicos', color: '#2196F3' },
};
