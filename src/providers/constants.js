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
export const FLIGHT_ALT_SCALE     = 3.5;           // fator estético (nuvens 25km render / ~7km real)
export const DEAD_RECKONING_MS    = 500;
export const PLANE_BATCH_SIZE     = 20;            // billboards por frame
export const CALLSIGN_BATCH_SIZE  = 30;            // labels por idle slice
export const FETCH_PADDING        = 0.5;           // expansão do bbox de busca
export const FLIGHT_RETRY_MS      = Number(import.meta.env.VITE_RETRY_INTERVAL_MS ?? 1_200_000);
export const FLIGHT_CACHE_TTL_MS  = Number(import.meta.env.VITE_FLIGHT_CACHE_TTL_MS ?? 5 * 60_000);

// ── Flight providers ────────────────────────────────────────────────────────
export const AL_POLL_MS           = 10_000;        // airplanes.live polling
export const AL_RETRY_MS          = 5_000;         // airplanes.live retry
export const AL_MIN_GAP_MS        = 1_100;         // min gap between AL requests

// ── Labels ──────────────────────────────────────────────────────────────────
export const LABEL_NEAR           = 2_000_000;     // metros (100% visível abaixo)
export const LABEL_FAR            = 4_000_000;     // metros (invisível acima)
export const LABEL_VISIBLE        = () => new NearFarScalar(LABEL_NEAR, 1.0, LABEL_FAR, 0.0);
export const LABEL_ALWAYS         = new NearFarScalar(1, 1.0, 1e10, 1.0);

// ── Colors ──────────────────────────────────────────────────────────────────
export const SELECTED_PLANE_COLOR = Color.fromCssColorString('#FF0000');
export const TRACK_COLOR          = Color.fromCssColorString('#A020F0').withAlpha(0.9);

// ── Vessels ─────────────────────────────────────────────────────────────────
export const SELECTED_VESSEL_COLOR = Color.fromCssColorString('#FF0000');
export const VESSEL_BATCH_SIZE     = 20;
export const VESSEL_LABEL_BATCH    = 30;
export const VESSEL_STALE_MS       = 10 * 60 * 1000;  // 10 min — eviction threshold
export const VESSEL_CLEANUP_MS     = 60_000;           // intervalo de limpeza
export const VESSEL_FLUSH_MS       = 2_000;            // flush WS → React state
export const VESSEL_BBOX_DEBOUNCE  = 2_000;            // debounce da atualização de bbox
export const VESSEL_MIN_LEN        = 10;               // metros (escala de ícone)
export const VESSEL_MAX_LEN        = 400;
export const VESSEL_MIN_PX         = 28;               // pixels (tamanho de ícone)
export const VESSEL_MAX_PX         = 56;

// ── Satellites ──────────────────────────────────────────────────────────────
export const SELECTED_SATELLITE_COLOR = Color.fromCssColorString('#FF0000');
export const SATELLITE_BATCH_SIZE     = 50;
export const SATELLITE_LABEL_BATCH    = 30;
export const SATELLITE_POLL_MS        = 24 * 60 * 60 * 1000;  // 1 fetch por dia
export const SAT_ICON_SIZE            = 24;

// ── Tick / Follow ───────────────────────────────────────────────────────────
export const TICK_INTERVAL_MS         = 500;  // propagação + camera follow
export const CELESTRAK_URL            = 'https://celestrak.org/NORAD/elements/gp.php';

// ── Telecom ─────────────────────────────────────────────────────────────────
export const TELECOM_DEBOUNCE_MS  = 500;
export const TELECOM_MIN_ZOOM     = 5;
export const TELECOM_MAX_ZOOM     = 14;
export const TELECOM_MAX_TILES    = 40;
export const TELECOM_MAST_SIZE    = 20;            // pixels
export const TELECOM_DC_SIZE      = 24;            // pixels
export const TELECOM_TTL_MS       = 7 * 24 * 60 * 60 * 1000;  // 7 dias — IDB cache
export const TELECOM_MAX_CACHE    = 200;           // max in-memory tiles

// ── Weather ─────────────────────────────────────────────────────────────────
export const WEATHER_ZOOM         = 2;             // tile zoom (4×4 = 16 tiles)
export const WEATHER_REFRESH_MS   = 60 * 60 * 1000;  // 60 min

// ── Routes ────────────────────────────────────────────────────────────────────
export const AIR_ROUTE_ALT        = 10_000;         // metros (altitude de cruzeiro)
export const ROUTE_LINE_WIDTH     = 3;

// Sea route categories
export const SEA_ROUTE_CATEGORIES = ['major', 'middle', 'minor'];
export const SEA_ROUTE_CATEGORY_META = {
  major:  { label: 'Principais', color: '#00BCD4' },
  middle: { label: 'Intermediárias', color: '#0097A7' },
  minor:  { label: 'Secundárias', color: '#00796B' },
};

// Air route categories (by distance)
export const AIR_ROUTE_CATEGORIES = ['short', 'medium', 'long'];
export const AIR_ROUTE_CATEGORY_META = {
  short:  { label: 'Curta (<1500km)', color: '#FFD54F' },
  medium: { label: 'Média (1500–5000km)', color: '#F2A800' },
  long:   { label: 'Longa (>5000km)', color: '#E65100' },
};

// ── Category heuristics ─────────────────────────────────────────────────────
export const VEL_HEAVY            = 210;           // m/s
export const VEL_REGIONAL         = 130;
export const VEL_LIGHT            = 30;
export const ALT_HEAVY            = 9_000;         // metros

// ── Search ──────────────────────────────────────────────────────────────────
export const SEARCH_LIMIT         = 6;

// ── External APIs ───────────────────────────────────────────────────────────
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
