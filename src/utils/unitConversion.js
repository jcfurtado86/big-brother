const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** m/s → knots */
export function toKt(ms) { return Math.round(ms * 1.94384); }

/** meters → feet (formatted) */
export function toFt(m) { return Math.round(m * 3.28084).toLocaleString(); }

/** degrees → compass direction */
export function toCompass(d) { return COMPASS[Math.round(d / 45) % 8]; }
