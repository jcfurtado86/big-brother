import { Color, NearFarScalar } from 'cesium';

// ── Camera ──────────────────────────────────────────────────────────────────
export const DEFAULT_ALT          = 10_000_000;    // metros
export const DEFAULT_PITCH        = -90;           // graus
export const CAMERA_CHANGE_PCT    = 0.01;          // fração de movimento para disparar camera.changed
export const ZOOM_MIN             = 100;           // metros
export const ZOOM_MAX             = 70_000_000;    // metros
export const ZOOM_SENSITIVITY     = 0.05;          // multiplicador da roda do mouse

// ── Double-click fly ────────────────────────────────────────────────────────
export const FLY_MIN_ALT          = 2_000;         // metros
export const FLY_ZOOM_FACTOR      = 3;
export const FLY_DURATION         = 1.2;           // segundos

// ── Flights ─────────────────────────────────────────────────────────────────
export const FLIGHT_ALTITUDE      = 10_000;        // metros (altitude de renderização dos ícones)
export const DEAD_RECKONING_MS    = 1_000;
export const PLANE_BATCH_SIZE     = 20;            // billboards por frame
export const CALLSIGN_BATCH_SIZE  = 30;            // labels por idle slice
export const FETCH_PADDING        = 0.5;           // expansão do bbox de busca

// ── Labels ──────────────────────────────────────────────────────────────────
export const LABEL_NEAR           = 2_000_000;     // metros (100% visível abaixo)
export const LABEL_FAR            = 4_000_000;     // metros (invisível acima)
export const LABEL_VISIBLE        = () => new NearFarScalar(LABEL_NEAR, 1.0, LABEL_FAR, 0.0);
export const LABEL_ALWAYS         = new NearFarScalar(1, 1.0, 1e10, 1.0);

// ── Colors ──────────────────────────────────────────────────────────────────
export const SELECTED_PLANE_COLOR = Color.fromCssColorString('#FF0000');
export const TRACK_COLOR          = Color.fromCssColorString('#A020F0').withAlpha(0.9);

// ── Vessels ───────────────────────────────────────────────────────────────
export const SELECTED_VESSEL_COLOR = Color.fromCssColorString('#FF0000');
export const VESSEL_BATCH_SIZE     = 20;
export const VESSEL_LABEL_BATCH    = 30;

// ── Satellites ─────────────────────────────────────────────────────────────
export const SELECTED_SATELLITE_COLOR = Color.fromCssColorString('#FF0000');
export const SATELLITE_BATCH_SIZE     = 50;
export const SATELLITE_LABEL_BATCH    = 30;
export const SATELLITE_POLL_MS        = 24 * 60 * 60 * 1000;  // 1 fetch por dia

// ── Tick / Follow ─────────────────────────────────────────────────────────
export const TICK_INTERVAL_MS         = 500;  // propagação + camera follow
export const CELESTRAK_URL            = 'https://celestrak.org/NORAD/elements/gp.php';

// ── Category heuristics ─────────────────────────────────────────────────────
export const VEL_HEAVY            = 210;           // m/s
export const VEL_REGIONAL         = 130;
export const VEL_LIGHT            = 30;
export const ALT_HEAVY            = 9_000;         // metros

// ── Search ──────────────────────────────────────────────────────────────────
export const SEARCH_LIMIT         = 6;

// ── External APIs ─────────────────────────────────────────────────────────
export const NOMINATIM_URL     = 'https://nominatim.openstreetmap.org/search';
export const OWM_TILE_URL      = 'https://tile.openweathermap.org/map';
export const AIRLINE_LOGO_CDN  = (iata) => `https://images.kiwi.com/airlines/64/${iata}.png`;

// ── Airport zoom thresholds ─────────────────────────────────────────────────
export const AIRPORT_MAX_ALT = {
  large_airport:  Infinity,
  medium_airport: 2_500_000,
  small_airport:    600_000,
  heliport:         800_000,
  seaplane_base:    300_000,
  balloonport:       80_000,
};
