import a320Raw    from '../assets/svg/planes/a320.svg?raw';
import a330Raw    from '../assets/svg/planes/a330.svg?raw';
import a340Raw    from '../assets/svg/planes/a340.svg?raw';
import a380Raw    from '../assets/svg/planes/a380.svg?raw';
import b737Raw    from '../assets/svg/planes/b737.svg?raw';
import b747Raw    from '../assets/svg/planes/b747.svg?raw';
import b767Raw    from '../assets/svg/planes/b767.svg?raw';
import b777Raw    from '../assets/svg/planes/b777.svg?raw';
import b787Raw    from '../assets/svg/planes/b787.svg?raw';
import c130Raw    from '../assets/svg/planes/c130.svg?raw';
import cessnaRaw  from '../assets/svg/planes/cessna.svg?raw';
import crjxRaw    from '../assets/svg/planes/crjx.svg?raw';
import dh8aRaw    from '../assets/svg/planes/dh8a.svg?raw';
import e195Raw    from '../assets/svg/planes/e195.svg?raw';
import erjRaw     from '../assets/svg/planes/erj.svg?raw';
import f100Raw    from '../assets/svg/planes/f100.svg?raw';
import f5Raw      from '../assets/svg/planes/f5.svg?raw';
import f11Raw     from '../assets/svg/planes/f11.svg?raw';
import f15Raw     from '../assets/svg/planes/f15.svg?raw';
import fa7xRaw    from '../assets/svg/planes/fa7x.svg?raw';
import glf5Raw    from '../assets/svg/planes/glf5.svg?raw';
import learjetRaw from '../assets/svg/planes/learjet.svg?raw';
import md11Raw    from '../assets/svg/planes/md11.svg?raw';
// Generic category silhouettes
import a0Raw      from '../assets/svg/planes/a0.svg?raw';
import a6Raw      from '../assets/svg/planes/a6.svg?raw';
import a7Raw      from '../assets/svg/planes/a7.svg?raw';
import b0Raw      from '../assets/svg/planes/b0.svg?raw';

import { Color } from 'cesium';
import { TYPE_CATEGORY, TYPE_SVG } from './modelCategories';
import { VEL_HEAVY, VEL_REGIONAL, VEL_LIGHT, ALT_HEAVY } from './constants';

// Strip all fill attributes and set fill="white" on the root <svg> element so
// Cesium can tint the icon via billboard.color (mustard normally, red when selected).
function svgToUrl(raw) {
  const svg = raw
    .replace(/\sfill="[^"]*"/g, '')
    .replace('<svg', '<svg fill="white"');
  return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
}

// Specific model SVGs
const SPECIFIC_SVG_URLS = {
  a320:    svgToUrl(a320Raw),
  a330:    svgToUrl(a330Raw),
  a340:    svgToUrl(a340Raw),
  a380:    svgToUrl(a380Raw),
  b737:    svgToUrl(b737Raw),
  b747:    svgToUrl(b747Raw),
  b767:    svgToUrl(b767Raw),
  b777:    svgToUrl(b777Raw),
  b787:    svgToUrl(b787Raw),
  c130:    svgToUrl(c130Raw),
  cessna:  svgToUrl(cessnaRaw),
  crjx:    svgToUrl(crjxRaw),
  dh8a:    svgToUrl(dh8aRaw),
  e195:    svgToUrl(e195Raw),
  erj:     svgToUrl(erjRaw),
  f100:    svgToUrl(f100Raw),
  f5:      svgToUrl(f5Raw),
  f11:     svgToUrl(f11Raw),
  f15:     svgToUrl(f15Raw),
  fa7x:    svgToUrl(fa7xRaw),
  glf5:    svgToUrl(glf5Raw),
  learjet: svgToUrl(learjetRaw),
  md11:    svgToUrl(md11Raw),
};

// Generic category SVGs (fallback)
const CATEGORY_SVG_URLS = {
  heavy:      svgToUrl(b747Raw),
  large:      svgToUrl(a320Raw),
  regional:   svgToUrl(crjxRaw),
  light:      svgToUrl(cessnaRaw),
  helicopter: svgToUrl(a7Raw),
  uav:        svgToUrl(b0Raw),
  military:   svgToUrl(a6Raw),
  unknown:    svgToUrl(a0Raw),
};

// ── Public API ────────────────────────────────────────────────────────────────

// Velocity thresholds (m/s):
//  > 210  → large jet (B737/A320 class)
//  > 130  → regional (CRJ/E-jet/turboprop)
//  > 30   → light (GA props)
//  ≤ 30   → helicopter
// Altitude (m): > 9000 + fast → heavy wide-body
export function getCategoryType(cat, velocity = 0, altitude = 0, military = false) {
  if (military)   return 'military';
  if (cat === 8)  return 'helicopter';
  if (cat === 14) return 'uav';
  if (cat === 6)  return 'heavy';
  if (cat === 4 || cat === 5) return 'large';
  if (cat === 3)  return 'regional';
  if (cat === 2)  return 'light';

  if (velocity > VEL_HEAVY)    return altitude > ALT_HEAVY ? 'heavy' : 'large';
  if (velocity > VEL_REGIONAL) return 'regional';
  if (velocity > VEL_LIGHT)    return 'light';
  return 'helicopter';
}

/**
 * Returns the category for a given ICAO type code (from aircraft DB).
 * Falls back to null if not found (caller should use getCategoryType heuristic).
 */
export function getCategoryFromTypeCode(typeCode) {
  if (!typeCode) return null;
  return TYPE_CATEGORY[typeCode.toUpperCase()] ?? null;
}

export const FLIGHT_CATEGORIES = ['heavy', 'large', 'regional', 'light', 'helicopter', 'uav', 'military'];

export const FLIGHT_CATEGORY_META = {
  heavy:      { label: 'Heavy (wide-body)', color: '#F2A800' },
  large:      { label: 'Large jet',         color: '#E08600' },
  regional:   { label: 'Regional',          color: '#FF6F61' },
  light:      { label: 'Light / GA',        color: '#90C040' },
  helicopter: { label: 'Helicóptero',       color: '#40C0E0' },
  uav:        { label: 'UAV / drone',       color: '#A080FF' },
  military:   { label: 'Militar',           color: '#2E7D32' },
};

// Cesium Color por categoria (para billboard.color)
export const FLIGHT_CATEGORY_COLOR = {
  heavy:      Color.fromCssColorString('#F2A800'),
  large:      Color.fromCssColorString('#E08600'),
  regional:   Color.fromCssColorString('#FF6F61'),
  light:      Color.fromCssColorString('#90C040'),
  helicopter: Color.fromCssColorString('#40C0E0'),
  uav:        Color.fromCssColorString('#A080FF'),
  military:   Color.fromCssColorString('#2E7D32'),
  unknown:    Color.fromCssColorString('#F2A800'),
};

export const CATEGORY_SIZE = {
  heavy:      { w: 48, h: 48 },
  large:      { w: 40, h: 40 },
  regional:   { w: 32, h: 32 },
  light:      { w: 24, h: 24 },
  helicopter: { w: 30, h: 30 },
  uav:        { w: 28, h: 28 },
  military:   { w: 36, h: 36 },
  unknown:    { w: 26, h: 26 },
};

export function getIconForTypeCode(typeCode, fallbackCategory = 'unknown') {
  if (typeCode) {
    const svgKey = TYPE_SVG[typeCode.toUpperCase()];
    if (svgKey) return SPECIFIC_SVG_URLS[svgKey] ?? CATEGORY_SVG_URLS[fallbackCategory];
  }
  return CATEGORY_SVG_URLS[fallbackCategory] ?? CATEGORY_SVG_URLS.unknown;
}
