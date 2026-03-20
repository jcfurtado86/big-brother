import { NearFarScalar, Color } from 'cesium';
import { svgToBlobUrl } from '../utils/svgUtils';
import { AIRPORT_MAX_ALT } from './constants';
import airportRaw from '../assets/svg/airports/airport2.svg?raw';
import helipadRaw from '../assets/svg/airports/helipad2.svg?raw';

const AIRPORT_ICONS = {
  airport: svgToBlobUrl(airportRaw),
  helipad: svgToBlobUrl(helipadRaw),
};

// ── Cores por tipo (aplicadas via Cesium Color) ──────────────────────────────

export const AIRPORT_TYPE_COLOR = {
  large_airport:  Color.fromCssColorString('#C2185B'),   // rosa escuro
  medium_airport: Color.fromCssColorString('#00838F'),   // azul ciano
  small_airport:  Color.fromCssColorString('#9C27B0'),   // roxo vivo
  heliport:       Color.fromCssColorString('#8B0000'),   // vermelho vinho
  seaplane_base:  Color.fromCssColorString('#00CCEE'),   // cyan
  balloonport:    Color.fromCssColorString('#CC88FF'),   // roxo claro
};

export const SELECTED_AIRPORT_COLOR = Color.fromCssColorString('#FF0000');

// maxAlt: altitude máxima da câmera (em metros) para exibir este tipo.
export const AIRPORT_TYPE_META = {
  large_airport:  { size: 34, label: 'cat.airport.large_airport',  color: '#C2185B', scale: new NearFarScalar(1e5, 1.2, 2e7, 0.3), maxAlt: AIRPORT_MAX_ALT.large_airport },
  medium_airport: { size: 40, label: 'cat.airport.medium_airport', color: '#00838F', scale: new NearFarScalar(5e4, 1.0, 5e6, 0.3), maxAlt: AIRPORT_MAX_ALT.medium_airport },
  small_airport:  { size: 38, label: 'cat.airport.small_airport',  color: '#9C27B0', scale: new NearFarScalar(1e4, 1.0, 8e5, 0.0), maxAlt: AIRPORT_MAX_ALT.small_airport },
  heliport:       { size: 38, label: 'cat.airport.heliport',       color: '#8B0000', scale: new NearFarScalar(1e4, 1.0, 8e5, 0.0), maxAlt: AIRPORT_MAX_ALT.heliport },
  seaplane_base:  { size: 19, label: 'cat.airport.seaplane_base',  color: '#00CCEE', scale: new NearFarScalar(5e3, 1.0, 6e5, 0.0), maxAlt: AIRPORT_MAX_ALT.seaplane_base },
  balloonport:    { size: 17, label: 'cat.airport.balloonport',    color: '#CC88FF', scale: new NearFarScalar(2e3, 1.0, 1e5, 0.0), maxAlt: AIRPORT_MAX_ALT.balloonport },
};

export const AIRPORT_TYPES = Object.keys(AIRPORT_TYPE_META);

export function getAirportIcon(type) {
  return type === 'heliport' ? AIRPORT_ICONS.helipad : AIRPORT_ICONS.airport;
}
