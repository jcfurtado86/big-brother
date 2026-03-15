import { Color } from 'cesium';

export const AIRSPACE_TYPE_COLOR = {
  restricted: Color.fromCssColorString('#FF5722').withAlpha(0.12),
  danger:     Color.fromCssColorString('#FFC107').withAlpha(0.12),
  prohibited: Color.fromCssColorString('#F44336').withAlpha(0.15),
};

export const AIRSPACE_OUTLINE_COLOR = {
  restricted: Color.fromCssColorString('#FF5722').withAlpha(0.7),
  danger:     Color.fromCssColorString('#FFC107').withAlpha(0.7),
  prohibited: Color.fromCssColorString('#F44336').withAlpha(0.7),
};

export const AIRSPACE_CATEGORIES = ['restricted', 'danger', 'prohibited'];

export const AIRSPACE_CATEGORY_META = {
  restricted: { label: 'Restrita',  color: '#FF5722' },
  danger:     { label: 'Perigo',    color: '#FFC107' },
  prohibited: { label: 'Proibida',  color: '#F44336' },
};
