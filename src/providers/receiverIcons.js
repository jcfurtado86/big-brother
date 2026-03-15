import { Color } from 'cesium';
import adsbRaw from '../assets/svg/receivers/adsb-antenna.svg?raw';
import aisRaw from '../assets/svg/receivers/ais-station.svg?raw';

function svgUrl(raw, fill) {
  const colored = raw.replace(/currentColor/g, fill);
  return URL.createObjectURL(new Blob([colored], { type: 'image/svg+xml' }));
}

const ADSB_ICON = svgUrl(adsbRaw, '#40C4FF');
const AIS_ICON  = svgUrl(aisRaw, '#69F0AE');

export function getReceiverIcon(type) {
  return type === 'adsb' ? ADSB_ICON : AIS_ICON;
}

export const RECEIVER_COLOR = {
  adsb: Color.fromCssColorString('#40C4FF'),
  ais:  Color.fromCssColorString('#69F0AE'),
};

export const RECEIVER_RANGE_COLOR = {
  adsb: Color.fromCssColorString('#40C4FF').withAlpha(0.15),
  ais:  Color.fromCssColorString('#69F0AE').withAlpha(0.15),
};

export const RECEIVER_RANGE_OUTLINE_COLOR = {
  adsb: Color.fromCssColorString('#40C4FF').withAlpha(0.4),
  ais:  Color.fromCssColorString('#69F0AE').withAlpha(0.4),
};

// Typical ranges in meters
export const RECEIVER_RANGE_M = {
  adsb: 370_000,  // ~200 NM
  ais:  85_000,   // ~46 NM
};

export const RECEIVER_ICON_SIZE = 22;
