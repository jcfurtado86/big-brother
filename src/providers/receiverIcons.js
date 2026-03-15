import { Color } from 'cesium';
import antennaRaw from '../assets/svg/telecom/antenna.svg?raw';

const ANTENNA_ICON = URL.createObjectURL(
  new Blob([antennaRaw], { type: 'image/svg+xml' })
);

export function getReceiverIcon() {
  return ANTENNA_ICON;
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
