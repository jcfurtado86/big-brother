import { Color, NearFarScalar } from 'cesium';

// ── Camera ──────────────────────────────────────────────────────────────────
export const DEFAULT_ALT          = 10_000_000;    // metros
export const DEFAULT_PITCH        = -90;           // graus
export const CAMERA_CHANGE_PCT    = 0.01;          // fração de movimento para disparar camera.changed
// Altitude mínima da câmera em metros (limite de aproximação)
export const ZOOM_MIN             = 100;
// Altitude máxima da câmera em metros (limite de afastamento)
export const ZOOM_MAX             = 70_000_000;
// Multiplicador da velocidade de zoom com a roda do mouse
export const ZOOM_SENSITIVITY     = 0.05;

// ── Double-click fly ────────────────────────────────────────────────────────
// Altitude mínima atingida ao voar com duplo-clique
export const FLY_MIN_ALT          = 2_000;
// Divisor da altitude ao voar com duplo-clique (maior = mais perto)
export const FLY_ZOOM_FACTOR      = 3;
// Duração da animação ao voar até um ponto com duplo-clique
export const FLY_DURATION         = 1.2;           // segundos

// ── Flights ─────────────────────────────────────────────────────────────────
// Fator estético que exagera a altitude dos aviões no globo para melhor visualização
export const FLIGHT_ALT_SCALE     = 3.5;
// Intervalo de interpolação de posição entre atualizações da API (animação suave)
export const DEAD_RECKONING_MS    = 500;
// Quantidade de ícones de avião renderizados por frame (maior = mais rápido, mais CPU)
export const PLANE_BATCH_SIZE     = 20;
// Quantidade de labels de callsign processados por idle slice
export const CALLSIGN_BATCH_SIZE  = 30;
// Expansão proporcional da área de busca além do viewport visível
export const FETCH_PADDING        = 0.5;
export const FLIGHT_RETRY_MS      = Number(import.meta.env.VITE_RETRY_INTERVAL_MS ?? 1_200_000);
export const FLIGHT_CACHE_TTL_MS  = Number(import.meta.env.VITE_FLIGHT_CACHE_TTL_MS ?? 5 * 60_000);

// ── Flight providers ────────────────────────────────────────────────────────
// Intervalo de polling do airplanes.live em milissegundos
export const AL_POLL_MS           = 10_000;
// Tempo de espera antes de tentar novamente após erro no airplanes.live
export const AL_RETRY_MS          = 5_000;
// Intervalo mínimo entre requisições ao airplanes.live (evita rate limiting)
export const AL_MIN_GAP_MS        = 1_500;

// ── Labels ──────────────────────────────────────────────────────────────────
// Altitude da câmera abaixo da qual os labels ficam 100% visíveis
export const LABEL_NEAR           = 2_000_000;
// Altitude da câmera acima da qual os labels ficam invisíveis
export const LABEL_FAR            = 4_000_000;
export const LABEL_VISIBLE        = (near, far) => new NearFarScalar(near ?? LABEL_NEAR, 1.0, far ?? LABEL_FAR, 0.0);
export const LABEL_ALWAYS         = new NearFarScalar(1, 1.0, 1e10, 1.0);

// ── Colors ──────────────────────────────────────────────────────────────────
export const SELECTED_PLANE_COLOR = Color.fromCssColorString('#FF0000');
export const TRACK_COLOR          = Color.fromCssColorString('#A020F0').withAlpha(0.9);

// ── Vessels ─────────────────────────────────────────────────────────────────
export const SELECTED_VESSEL_COLOR = Color.fromCssColorString('#FF0000');
// Quantidade de ícones de embarcação renderizados por frame
export const VESSEL_BATCH_SIZE     = 20;
// Quantidade de labels de embarcação processados por idle slice
export const VESSEL_LABEL_BATCH    = 30;
// Tempo sem atualização após o qual a embarcação é removida do mapa
export const VESSEL_STALE_MS       = 10 * 60 * 1000;
export const VESSEL_CLEANUP_MS     = 60_000;           // intervalo de limpeza
// Intervalo de transferência dos dados do WebSocket para o estado React
export const VESSEL_FLUSH_MS       = 2_000;
// Tempo de espera antes de atualizar a área de busca ao mover o mapa
export const VESSEL_BBOX_DEBOUNCE  = 2_000;
export const VESSEL_MIN_LEN        = 10;               // metros (escala de ícone)
export const VESSEL_MAX_LEN        = 400;
// Tamanho mínimo do ícone de embarcação em pixels
export const VESSEL_MIN_PX         = 28;
// Tamanho máximo do ícone de embarcação em pixels
export const VESSEL_MAX_PX         = 56;

// ── Satellites ──────────────────────────────────────────────────────────────
export const SELECTED_SATELLITE_COLOR = Color.fromCssColorString('#FF0000');
// Quantidade de satélites renderizados por frame
export const SATELLITE_BATCH_SIZE     = 50;
// Quantidade de labels de satélite processados por idle slice
export const SATELLITE_LABEL_BATCH    = 30;
export const SATELLITE_POLL_MS        = 24 * 60 * 60 * 1000;  // 1 fetch por dia
// Tamanho do ícone de satélite em pixels
export const SAT_ICON_SIZE            = 24;

// ── Tick / Follow ───────────────────────────────────────────────────────────
// Intervalo de propagação orbital e atualização de posição dos satélites
export const TICK_INTERVAL_MS         = 500;
export const CELESTRAK_URL            = 'https://celestrak.org/NORAD/elements/gp.php';

// ── Telecom ─────────────────────────────────────────────────────────────────
// Tempo de espera antes de carregar novos tiles de telecom ao mover o mapa
export const TELECOM_DEBOUNCE_MS  = 500;
// Nível de zoom mínimo para carregar dados de telecom (menor = mais distante)
export const TELECOM_MIN_ZOOM     = 5;
// Nível de zoom máximo para tiles de telecom (maior = mais detalhe)
export const TELECOM_MAX_ZOOM     = 14;
// Número máximo de tiles de telecom carregados por viewport
export const TELECOM_MAX_TILES    = 40;
// Tamanho do ícone de torre de telecom em pixels
export const TELECOM_MAST_SIZE    = 10;
// Tamanho do ícone de data center em pixels
export const TELECOM_DC_SIZE      = 12;
export const TELECOM_TTL_MS       = 7 * 24 * 60 * 60 * 1000;  // 7 dias — IDB cache
// Número máximo de tiles mantidos em cache na memória
export const TELECOM_MAX_CACHE    = 200;

// ── Weather ─────────────────────────────────────────────────────────────────
// Nível de zoom dos tiles de clima (maior = mais detalhe, mais requisições)
export const WEATHER_ZOOM         = 2;
// Intervalo de atualização dos tiles de clima em milissegundos
export const WEATHER_REFRESH_MS   = 60 * 60 * 1000;

// ── Routes ────────────────────────────────────────────────────────────────────
// Altitude de renderização das rotas aéreas no globo em metros
export const AIR_ROUTE_ALT        = 10_000;
// Espessura das linhas de rota em pixels
export const ROUTE_LINE_WIDTH     = 3;
// Graus de expansão da área visível para pré-carregar rotas além do viewport
export const ROUTE_BBOX_PADDING   = 5;
// Quantidade de polylines de rota renderizadas por frame
export const ROUTE_BATCH_SIZE     = 100;

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

// ── Receivers (antenas) ───────────────────────────────────────────────────────
// Intervalo de polling das antenas ADS-B em milissegundos
export const ADSB_RECEIVERS_POLL_MS   = 60 * 60 * 1000;
export const RECEIVER_TTL_MS          = 24 * 60 * 60 * 1000; // cache IDB 24h
// Intervalo de transferência dos dados AIS do WebSocket para o estado React
export const AIS_STATION_FLUSH_MS     = 3_000;
// Altitude da câmera acima da qual as antenas ficam ocultas
export const RECEIVER_MAX_ALT         = 100_000_000;
export const RECEIVER_CIRCLE_SEGMENTS = 64;              // vértices por círculo de range
// Graus de expansão do viewport para carregar antenas além da área visível
export const RECEIVER_VIEWPORT_PAD    = 3;
// Tamanho do ícone de antena/receptor em pixels
export const RECEIVER_ICON_SIZE       = 44;

// ── ATC (radares + torres de controle) ───────────────────────────────────
// Tempo de espera antes de buscar novos dados ATC ao mover o mapa
export const ATC_DEBOUNCE_MS      = 1_000;
// Altitude máxima da câmera para exibir dados ATC
export const ATC_MAX_ALT          = 100_000_000;
// Tamanho do ícone de torre de controle em pixels
export const ATC_TOWER_SIZE       = 28;
// Tamanho do ícone de radar em pixels
export const ATC_RADAR_SIZE       = 24;
// TTL do cache IDB de dados ATC (7 dias)
export const ATC_TTL_MS           = 7 * 24 * 60 * 60 * 1000;

// ── Military ─────────────────────────────────────────────────────────────────
export const MILITARY_ICON_SIZE    = 26;
export const MILITARY_DEBOUNCE_MS  = 1_000;
export const MILITARY_MAX_ALT     = 100_000_000;
export const MILITARY_TTL_MS      = 7 * 24 * 60 * 60 * 1000;

// ── Nuclear ──────────────────────────────────────────────────────────────────
export const NUCLEAR_ICON_SIZE     = 28;

// ── Airspace ─────────────────────────────────────────────────────────────────
export const AIRSPACE_DEBOUNCE_MS  = 1_000;
export const AIRSPACE_MAX_ALT     = 100_000_000;

// ── Category heuristics ─────────────────────────────────────────────────────
export const VEL_HEAVY            = 210;           // m/s
export const VEL_REGIONAL         = 130;
export const VEL_LIGHT            = 30;
export const ALT_HEAVY            = 9_000;         // metros

// ── Search ──────────────────────────────────────────────────────────────────
// Número máximo de resultados exibidos na busca
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
