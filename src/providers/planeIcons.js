// Top-view aircraft silhouettes, all pointing north (up).
// billboard.rotation handles actual heading.

const MUSTARD = import.meta.env.VITE_PLANE_COLOR || '#F2A800';

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  // Explicitly clear all pixels so WebGL gets a fully-initialized texture
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  return c;
}

// ── Heavy (B747 / A380) — wide-body, 4 engines, 48px ─────────────────────────
function drawHeavy() {
  const c = makeCanvas(48);
  const ctx = c.getContext('2d');
  const cx = 24;
  ctx.fillStyle = MUSTARD;

  // Fuselage
  ctx.beginPath();
  ctx.moveTo(cx, 2);
  ctx.bezierCurveTo(cx + 5, 2, cx + 6, 7, cx + 6, 13);
  ctx.lineTo(cx + 6, 36);
  ctx.bezierCurveTo(cx + 6, 42, cx + 4, 46, cx, 46);
  ctx.bezierCurveTo(cx - 4, 46, cx - 6, 42, cx - 6, 36);
  ctx.lineTo(cx - 6, 13);
  ctx.bezierCurveTo(cx - 6, 7, cx - 5, 2, cx, 2);
  ctx.fill();

  // Left wing — very swept, wide span
  ctx.beginPath();
  ctx.moveTo(cx - 5, 14);
  ctx.lineTo(cx - 23, 28);
  ctx.lineTo(cx - 21, 33);
  ctx.lineTo(cx - 13, 29);  // inner engine bump
  ctx.lineTo(cx - 11, 30);
  ctx.lineTo(cx - 5, 28);
  ctx.fill();

  // Right wing (mirror)
  ctx.beginPath();
  ctx.moveTo(cx + 5, 14);
  ctx.lineTo(cx + 23, 28);
  ctx.lineTo(cx + 21, 33);
  ctx.lineTo(cx + 13, 29);
  ctx.lineTo(cx + 11, 30);
  ctx.lineTo(cx + 5, 28);
  ctx.fill();

  // Engine pods L outer
  ctx.beginPath(); ctx.ellipse(cx - 18, 28, 2.2, 3.8, 0.35, 0, Math.PI * 2); ctx.fill();
  // Engine pods L inner
  ctx.beginPath(); ctx.ellipse(cx - 11, 26, 2.0, 3.4, 0.25, 0, Math.PI * 2); ctx.fill();
  // Engine pods R inner
  ctx.beginPath(); ctx.ellipse(cx + 11, 26, 2.0, 3.4, -0.25, 0, Math.PI * 2); ctx.fill();
  // Engine pods R outer
  ctx.beginPath(); ctx.ellipse(cx + 18, 28, 2.2, 3.8, -0.35, 0, Math.PI * 2); ctx.fill();

  // Horizontal tail stabilizers
  ctx.beginPath();
  ctx.moveTo(cx - 5, 39); ctx.lineTo(cx - 15, 45); ctx.lineTo(cx - 13, 47); ctx.lineTo(cx - 5, 42);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 5, 39); ctx.lineTo(cx + 15, 45); ctx.lineTo(cx + 13, 47); ctx.lineTo(cx + 5, 42);
  ctx.fill();

  return c;
}

// ── Large commercial (B737 / A320 / B777) — 40px ─────────────────────────────
function drawLarge() {
  const c = makeCanvas(40);
  const ctx = c.getContext('2d');
  const cx = 20;
  ctx.fillStyle = MUSTARD;

  // Fuselage
  ctx.beginPath();
  ctx.moveTo(cx, 2);
  ctx.bezierCurveTo(cx + 4, 2, cx + 4.5, 6, cx + 4.5, 11);
  ctx.lineTo(cx + 4.5, 30);
  ctx.bezierCurveTo(cx + 4.5, 36, cx + 3, 39, cx, 39);
  ctx.bezierCurveTo(cx - 3, 39, cx - 4.5, 36, cx - 4.5, 30);
  ctx.lineTo(cx - 4.5, 11);
  ctx.bezierCurveTo(cx - 4.5, 6, cx - 4, 2, cx, 2);
  ctx.fill();

  // Left wing — swept
  ctx.beginPath();
  ctx.moveTo(cx - 4, 13);
  ctx.lineTo(cx - 19, 24);
  ctx.lineTo(cx - 18, 29);
  ctx.lineTo(cx - 4, 22);
  ctx.fill();

  // Right wing
  ctx.beginPath();
  ctx.moveTo(cx + 4, 13);
  ctx.lineTo(cx + 19, 24);
  ctx.lineTo(cx + 18, 29);
  ctx.lineTo(cx + 4, 22);
  ctx.fill();

  // Engine pods
  ctx.beginPath(); ctx.ellipse(cx - 12, 22, 1.8, 3.2, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 12, 22, 1.8, 3.2, -0.3, 0, Math.PI * 2); ctx.fill();

  // Tail stabilizers
  ctx.beginPath();
  ctx.moveTo(cx - 4, 32); ctx.lineTo(cx - 11, 37); ctx.lineTo(cx - 9, 39); ctx.lineTo(cx - 4, 35);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 4, 32); ctx.lineTo(cx + 11, 37); ctx.lineTo(cx + 9, 39); ctx.lineTo(cx + 4, 35);
  ctx.fill();

  return c;
}

// ── Regional jet (Embraer E-jet / CRJ) — rear engines, 32px ─────────────────
function drawRegional() {
  const c = makeCanvas(32);
  const ctx = c.getContext('2d');
  const cx = 16;
  ctx.fillStyle = MUSTARD;

  // Fuselage (slender)
  ctx.beginPath();
  ctx.moveTo(cx, 2);
  ctx.bezierCurveTo(cx + 3, 2, cx + 3.5, 5, cx + 3.5, 9);
  ctx.lineTo(cx + 3.5, 26);
  ctx.bezierCurveTo(cx + 3.5, 30, cx + 2, 31, cx, 31);
  ctx.bezierCurveTo(cx - 2, 31, cx - 3.5, 30, cx - 3.5, 26);
  ctx.lineTo(cx - 3.5, 9);
  ctx.bezierCurveTo(cx - 3.5, 5, cx - 3, 2, cx, 2);
  ctx.fill();

  // Wings (shorter, less swept)
  ctx.beginPath();
  ctx.moveTo(cx - 3, 12); ctx.lineTo(cx - 15, 19); ctx.lineTo(cx - 14, 23); ctx.lineTo(cx - 3, 18);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 3, 12); ctx.lineTo(cx + 15, 19); ctx.lineTo(cx + 14, 23); ctx.lineTo(cx + 3, 18);
  ctx.fill();

  // Rear-mounted engine pods (flanking tail)
  ctx.beginPath(); ctx.ellipse(cx - 5, 24, 1.6, 3.0, 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 5, 24, 1.6, 3.0, -0.1, 0, Math.PI * 2); ctx.fill();

  // T-tail horizontal stabilizer
  ctx.beginPath();
  ctx.moveTo(cx - 3, 27); ctx.lineTo(cx - 10, 31); ctx.lineTo(cx - 8, 32); ctx.lineTo(cx - 3, 29);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 3, 27); ctx.lineTo(cx + 10, 31); ctx.lineTo(cx + 8, 32); ctx.lineTo(cx + 3, 29);
  ctx.fill();

  return c;
}

// ── Light aircraft (Cessna / Piper) — single engine, straight wings, 24px ───
function drawLight() {
  const c = makeCanvas(24);
  const ctx = c.getContext('2d');
  const cx = 12;
  ctx.fillStyle = MUSTARD;

  // Fuselage
  ctx.beginPath();
  ctx.moveTo(cx, 2);
  ctx.bezierCurveTo(cx + 2.5, 2, cx + 2.5, 5, cx + 2.5, 8);
  ctx.lineTo(cx + 2.5, 19);
  ctx.bezierCurveTo(cx + 2.5, 22, cx + 1.5, 23, cx, 23);
  ctx.bezierCurveTo(cx - 1.5, 23, cx - 2.5, 22, cx - 2.5, 19);
  ctx.lineTo(cx - 2.5, 8);
  ctx.bezierCurveTo(cx - 2.5, 5, cx - 2.5, 2, cx, 2);
  ctx.fill();

  // Straight high wings
  ctx.beginPath();
  ctx.moveTo(cx - 2.5, 8); ctx.lineTo(cx - 11, 11); ctx.lineTo(cx - 11, 13); ctx.lineTo(cx - 2.5, 12);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 2.5, 8); ctx.lineTo(cx + 11, 11); ctx.lineTo(cx + 11, 13); ctx.lineTo(cx + 2.5, 12);
  ctx.fill();

  // Propeller disc at nose
  ctx.beginPath();
  ctx.ellipse(cx, 2, 4, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail stabilizer
  ctx.beginPath();
  ctx.moveTo(cx - 2.5, 18); ctx.lineTo(cx - 7, 22); ctx.lineTo(cx - 6, 23); ctx.lineTo(cx - 2.5, 20);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 2.5, 18); ctx.lineTo(cx + 7, 22); ctx.lineTo(cx + 6, 23); ctx.lineTo(cx + 2.5, 20);
  ctx.fill();

  return c;
}

// ── Helicopter — top view, 30px ───────────────────────────────────────────────
function drawHelicopter() {
  const c = makeCanvas(30);
  const ctx = c.getContext('2d');
  const cx = 15;
  ctx.fillStyle = MUSTARD;

  // Main rotor disc (faint outline only)
  ctx.strokeStyle = MUSTARD;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(cx, 13, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Rotor blades
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = MUSTARD;
  ctx.beginPath();
  ctx.moveTo(cx - 13, 13); ctx.lineTo(cx + 13, 13);
  ctx.moveTo(cx, 0); ctx.lineTo(cx, 26);
  ctx.stroke();

  // Fuselage body (round bubble)
  ctx.beginPath();
  ctx.ellipse(cx, 13, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail boom (thin rectangle going down)
  ctx.beginPath();
  ctx.moveTo(cx - 1.5, 19);
  ctx.lineTo(cx - 1.5, 28);
  ctx.lineTo(cx + 1.5, 28);
  ctx.lineTo(cx + 1.5, 19);
  ctx.fill();

  // Tail rotor
  ctx.lineWidth = 2;
  ctx.strokeStyle = MUSTARD;
  ctx.beginPath();
  ctx.moveTo(cx, 28); ctx.lineTo(cx, 22);  // vertical blade
  ctx.moveTo(cx - 4, 25); ctx.lineTo(cx + 4, 25);  // horizontal blade
  ctx.stroke();

  return c;
}

// ── UAV / Drone — flying wing silhouette, 28px ───────────────────────────────
function drawUAV() {
  const c = makeCanvas(28);
  const ctx = c.getContext('2d');
  const cx = 14;
  ctx.fillStyle = MUSTARD;

  // Flying wing (delta/blended wing body) — no fuselage protrusion
  ctx.beginPath();
  ctx.moveTo(cx, 5);           // nose
  ctx.lineTo(cx + 13, 22);     // right wingtip front
  ctx.lineTo(cx + 11, 24);     // right wingtip back
  ctx.bezierCurveTo(cx + 6, 23, cx + 2, 21, cx, 20);  // right trailing edge
  ctx.bezierCurveTo(cx - 2, 21, cx - 6, 23, cx - 11, 24);  // left trailing edge
  ctx.lineTo(cx - 13, 22);     // left wingtip back
  ctx.closePath();
  ctx.fill();

  // Small center body bump
  ctx.beginPath();
  ctx.ellipse(cx, 14, 2.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

// ── Unknown / fallback — generic swept silhouette, 26px ──────────────────────
function drawUnknown() {
  const c = makeCanvas(26);
  const ctx = c.getContext('2d');
  const cx = 13;
  ctx.fillStyle = MUSTARD;

  // Fuselage
  ctx.beginPath();
  ctx.moveTo(cx, 2);
  ctx.bezierCurveTo(cx + 3, 2, cx + 3.5, 5, cx + 3.5, 9);
  ctx.lineTo(cx + 3.5, 22);
  ctx.bezierCurveTo(cx + 3.5, 25, cx + 2, 26, cx, 26);
  ctx.bezierCurveTo(cx - 2, 26, cx - 3.5, 25, cx - 3.5, 22);
  ctx.lineTo(cx - 3.5, 9);
  ctx.bezierCurveTo(cx - 3.5, 5, cx - 3, 2, cx, 2);
  ctx.fill();

  // Swept wings
  ctx.beginPath();
  ctx.moveTo(cx - 3, 11); ctx.lineTo(cx - 13, 19); ctx.lineTo(cx - 12, 22); ctx.lineTo(cx - 3, 16);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 3, 11); ctx.lineTo(cx + 13, 19); ctx.lineTo(cx + 12, 22); ctx.lineTo(cx + 3, 16);
  ctx.fill();

  // Tail
  ctx.beginPath();
  ctx.moveTo(cx - 3, 20); ctx.lineTo(cx - 8, 24); ctx.lineTo(cx - 7, 26); ctx.lineTo(cx - 3, 23);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 3, 20); ctx.lineTo(cx + 8, 24); ctx.lineTo(cx + 7, 26); ctx.lineTo(cx + 3, 23);
  ctx.fill();

  return c;
}

// ── Public API ────────────────────────────────────────────────────────────────

// Velocity thresholds (m/s):
//  > 210  → large jet (B737/A320 class)
//  > 130  → regional (CRJ/E-jet/turboprop)
//  > 30   → light (GA props)
//  ≤ 30   → helicopter
// Altitude (m): > 9000 + fast → heavy wide-body
export function getCategoryType(cat, velocity = 0, altitude = 0) {
  // Honour explicit ADS-B category when available
  if (cat === 8)  return 'helicopter';
  if (cat === 14) return 'uav';
  if (cat === 6)  return 'heavy';
  if (cat === 4 || cat === 5) return 'large';
  if (cat === 3)  return 'regional';
  if (cat === 2)  return 'light';

  // Velocity + altitude heuristic (covers the vast majority with cat === 0/1)
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

const _cache = {};

export function getPlaneImage(type) {
  if (_cache[type]) return _cache[type];
  const fn = { heavy: drawHeavy, large: drawLarge, regional: drawRegional, light: drawLight, helicopter: drawHelicopter, uav: drawUAV, unknown: drawUnknown }[type] ?? drawUnknown;
  _cache[type] = fn();
  return _cache[type];
}
