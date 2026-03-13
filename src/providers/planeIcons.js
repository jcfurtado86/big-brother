import b747Raw   from '../assets/svg/planes/b747.svg?raw';
import a320Raw   from '../assets/svg/planes/a320.svg?raw';
import b777Raw   from '../assets/svg/planes/b777.svg?raw';
import cessnaRaw from '../assets/svg/planes/cessna.svg?raw';
import a7Raw     from '../assets/svg/planes/a7.svg?raw';
import b0Raw     from '../assets/svg/planes/b0.svg?raw';
import a0Raw     from '../assets/svg/planes/a0.svg?raw';

// Strip all fill attributes and set fill="white" on the root <svg> element so
// Cesium can tint the icon via billboard.color (mustard normally, red when selected).
function svgToUrl(raw) {
  const svg = raw
    .replace(/\sfill="[^"]*"/g, '')
    .replace('<svg', '<svg fill="white"');
  return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
}

const SVG_URLS = {
  heavy:      svgToUrl(b747Raw),
  large:      svgToUrl(a320Raw),
  regional:   svgToUrl(b777Raw),
  light:      svgToUrl(cessnaRaw),
  helicopter: svgToUrl(a7Raw),
  uav:        svgToUrl(b0Raw),
  unknown:    svgToUrl(a0Raw),
};

// ── Public API ────────────────────────────────────────────────────────────────

// Velocity thresholds (m/s):
//  > 210  → large jet (B737/A320 class)
//  > 130  → regional (CRJ/E-jet/turboprop)
//  > 30   → light (GA props)
//  ≤ 30   → helicopter
// Altitude (m): > 9000 + fast → heavy wide-body
export function getCategoryType(cat, velocity = 0, altitude = 0) {
  if (cat === 8)  return 'helicopter';
  if (cat === 14) return 'uav';
  if (cat === 6)  return 'heavy';
  if (cat === 4 || cat === 5) return 'large';
  if (cat === 3)  return 'regional';
  if (cat === 2)  return 'light';

  const velHeavy    = Number(import.meta.env.VITE_VEL_HEAVY_MS    ?? 210);
  const velRegional = Number(import.meta.env.VITE_VEL_REGIONAL_MS ?? 130);
  const velLight    = Number(import.meta.env.VITE_VEL_LIGHT_MS    ?? 30);
  const altHeavy    = Number(import.meta.env.VITE_ALT_HEAVY_M     ?? 9000);
  if (velocity > velHeavy)    return altitude > altHeavy ? 'heavy' : 'large';
  if (velocity > velRegional) return 'regional';
  if (velocity > velLight)    return 'light';
  return 'helicopter';
}

export const CATEGORY_SIZE = {
  heavy:      { w: 48, h: 48 },
  large:      { w: 40, h: 40 },
  regional:   { w: 32, h: 32 },
  light:      { w: 24, h: 24 },
  helicopter: { w: 30, h: 30 },
  uav:        { w: 28, h: 28 },
  unknown:    { w: 26, h: 26 },
};

export function getPlaneImage(type) {
  return SVG_URLS[type] ?? SVG_URLS.unknown;
}
