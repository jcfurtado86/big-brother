import { Color } from 'cesium';
import { svgToBlobUrl } from '../utils/svgUtils';
import cameraRaw from '../assets/svg/webcams/camera.svg?raw';

const WEBCAM_ICON = svgToBlobUrl(cameraRaw, true);

export function getWebcamIcon() {
  return WEBCAM_ICON;
}

export const WEBCAM_CATEGORY_COLOR = {
  live:      Color.fromCssColorString('#00E676'),
  timelapse: Color.fromCssColorString('#448AFF'),
  inactive:  Color.fromCssColorString('#78909C'),
};

export const WEBCAM_CATEGORIES = ['live', 'timelapse', 'inactive'];

export const WEBCAM_CATEGORY_META = {
  live:      { label: 'cat.webcam.live',      color: '#00E676' },
  timelapse: { label: 'cat.webcam.timelapse', color: '#448AFF' },
  inactive:  { label: 'cat.webcam.inactive',  color: '#78909C' },
};
