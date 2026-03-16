const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** m/s → knots */
export function toKt(ms) { return Math.round(ms * 1.94384); }

/** meters → feet (formatted) */
export function toFt(m) { return Math.round(m * 3.28084).toLocaleString(); }

/** degrees → compass direction */
export function toCompass(d) { return COMPASS[Math.round(d / 45) % 8]; }

/** ft/min → formatted string with arrow */
export function toVs(ftmin) {
  if (ftmin == null) return null;
  const rounded = Math.round(ftmin / 64) * 64; // standard ATC rounding
  if (Math.abs(rounded) < 64) return 'Level';
  const arrow = rounded > 0 ? '↑' : '↓';
  return `${arrow} ${Math.abs(rounded).toLocaleString()} ft/min`;
}
