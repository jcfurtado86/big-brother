import { useSyncExternalStore } from 'react';
import * as C from './constants';

/* ── Schema ──────────────────────────────────────────────────────────────── */

export const SETTINGS_SCHEMA = [
  { section: 'Câmera', items: [
    { key: 'ZOOM_SENSITIVITY',  label: 'Sensibilidade do zoom',  desc: 'Multiplicador da velocidade de zoom com a roda do mouse', default: C.ZOOM_SENSITIVITY,  min: 0.01, max: 0.3,  step: 0.01 },
    { key: 'ZOOM_MIN',          label: 'Zoom mín (m)',           desc: 'Altitude mínima da câmera em metros (limite de aproximação)', default: C.ZOOM_MIN,          min: 10,   max: 1000, step: 10 },
    { key: 'ZOOM_MAX',          label: 'Zoom máx (m)',           desc: 'Altitude máxima da câmera em metros (limite de afastamento)', default: C.ZOOM_MAX,          min: 10_000_000, max: 100_000_000, step: 5_000_000 },
    { key: 'FLY_DURATION',      label: 'Duração do voo (s)',     desc: 'Duração da animação ao voar até um ponto com duplo-clique', default: C.FLY_DURATION,      min: 0.2,  max: 5,    step: 0.1 },
    { key: 'FLY_ZOOM_FACTOR',   label: 'Fator de zoom (voo)',    desc: 'Divisor da altitude ao voar com duplo-clique (maior = mais perto)', default: C.FLY_ZOOM_FACTOR,   min: 1,    max: 10,   step: 1 },
    { key: 'FLY_MIN_ALT',       label: 'Altitude mín voo (m)',   desc: 'Altitude mínima atingida ao voar com duplo-clique', default: C.FLY_MIN_ALT,       min: 500,  max: 10_000, step: 500 },
  ]},
  { section: 'Aeronaves', items: [
    { key: 'FLIGHT_ALT_SCALE',  label: 'Escala de altitude',     desc: 'Fator estético que exagera a altitude dos aviões no globo para melhor visualização', default: C.FLIGHT_ALT_SCALE,  min: 1,    max: 15,   step: 0.5 },
    { key: 'DEAD_RECKONING_MS', label: 'Dead reckoning (ms)',    desc: 'Intervalo de interpolação de posição entre atualizações da API (animação suave)', default: C.DEAD_RECKONING_MS, min: 100,  max: 5000, step: 100 },
    { key: 'PLANE_BATCH_SIZE',  label: 'Batch size (billboards)',desc: 'Quantidade de ícones de avião renderizados por frame (maior = mais rápido, mais CPU)', default: C.PLANE_BATCH_SIZE,  min: 5,    max: 200,  step: 5 },
    { key: 'CALLSIGN_BATCH_SIZE',label:'Batch size (labels)',    desc: 'Quantidade de labels de callsign processados por idle slice', default: C.CALLSIGN_BATCH_SIZE, min: 5,  max: 200,  step: 5 },
    { key: 'FETCH_PADDING',     label: 'Padding bbox (°)',       desc: 'Expansão proporcional da área de busca além do viewport visível', default: C.FETCH_PADDING,     min: 0,    max: 5,    step: 0.1 },
  ]},
  { section: 'Providers', items: [
    { key: 'AL_POLL_MS',        label: 'Polling AL (ms)',        desc: 'Intervalo de polling do airplanes.live em milissegundos', default: C.AL_POLL_MS,        min: 2000, max: 60_000, step: 1000 },
    { key: 'AL_RETRY_MS',       label: 'Retry AL (ms)',          desc: 'Tempo de espera antes de tentar novamente após erro no airplanes.live', default: C.AL_RETRY_MS,       min: 1000, max: 30_000, step: 1000 },
    { key: 'AL_MIN_GAP_MS',     label: 'Gap mín AL (ms)',        desc: 'Intervalo mínimo entre requisições ao airplanes.live (evita rate limiting)', default: C.AL_MIN_GAP_MS,     min: 500,  max: 5000, step: 100 },
  ]},
  { section: 'Labels', items: [
    { key: 'LABEL_NEAR',        label: 'Visível abaixo (m)',     desc: 'Altitude da câmera abaixo da qual os labels ficam 100% visíveis', default: C.LABEL_NEAR,        min: 500_000, max: 10_000_000, step: 500_000 },
    { key: 'LABEL_FAR',         label: 'Invisível acima (m)',    desc: 'Altitude da câmera acima da qual os labels ficam invisíveis', default: C.LABEL_FAR,         min: 1_000_000, max: 20_000_000, step: 500_000 },
  ]},
  { section: 'Embarcações', items: [
    { key: 'VESSEL_BATCH_SIZE', label: 'Batch size',             desc: 'Quantidade de ícones de embarcação renderizados por frame', default: C.VESSEL_BATCH_SIZE, min: 5,    max: 200,  step: 5 },
    { key: 'VESSEL_LABEL_BATCH',label: 'Batch labels',           desc: 'Quantidade de labels de embarcação processados por idle slice', default: C.VESSEL_LABEL_BATCH,min: 5,    max: 200,  step: 5 },
    { key: 'VESSEL_STALE_MS',   label: 'Eviction (ms)',          desc: 'Tempo sem atualização após o qual a embarcação é removida do mapa', default: C.VESSEL_STALE_MS,   min: 60_000, max: 3_600_000, step: 60_000 },
    { key: 'VESSEL_FLUSH_MS',   label: 'Flush WS (ms)',          desc: 'Intervalo de transferência dos dados do WebSocket para o estado React', default: C.VESSEL_FLUSH_MS,   min: 500,  max: 10_000, step: 500 },
    { key: 'VESSEL_BBOX_DEBOUNCE',label:'Debounce bbox (ms)',    desc: 'Tempo de espera antes de atualizar a área de busca ao mover o mapa', default: C.VESSEL_BBOX_DEBOUNCE, min: 500, max: 10_000, step: 500 },
    { key: 'VESSEL_MIN_PX',     label: 'Ícone mín (px)',         desc: 'Tamanho mínimo do ícone de embarcação em pixels', default: C.VESSEL_MIN_PX,     min: 10,   max: 64,   step: 2 },
    { key: 'VESSEL_MAX_PX',     label: 'Ícone máx (px)',         desc: 'Tamanho máximo do ícone de embarcação em pixels', default: C.VESSEL_MAX_PX,     min: 20,   max: 128,  step: 2 },
  ]},
  { section: 'Satélites', items: [
    { key: 'SAT_ICON_SIZE',     label: 'Ícone (px)',             desc: 'Tamanho do ícone de satélite em pixels', default: C.SAT_ICON_SIZE,     min: 8,    max: 64,   step: 2 },
    { key: 'SATELLITE_BATCH_SIZE',label:'Batch size',            desc: 'Quantidade de satélites renderizados por frame', default: C.SATELLITE_BATCH_SIZE, min: 10, max: 500, step: 10 },
    { key: 'SATELLITE_LABEL_BATCH',label:'Batch labels',         desc: 'Quantidade de labels de satélite processados por idle slice', default: C.SATELLITE_LABEL_BATCH,min: 5, max: 200, step: 5 },
    { key: 'TICK_INTERVAL_MS',  label: 'Tick interval (ms)',     desc: 'Intervalo de propagação orbital e atualização de posição dos satélites', default: C.TICK_INTERVAL_MS,  min: 100,  max: 5000, step: 100 },
  ]},
  { section: 'Telecom', items: [
    { key: 'TELECOM_DEBOUNCE_MS',label:'Debounce (ms)',          desc: 'Tempo de espera antes de carregar novos tiles de telecom ao mover o mapa', default: C.TELECOM_DEBOUNCE_MS,min: 100, max: 5000, step: 100 },
    { key: 'TELECOM_MIN_ZOOM',  label: 'Zoom mín',              desc: 'Nível de zoom mínimo para carregar dados de telecom (menor = mais distante)', default: C.TELECOM_MIN_ZOOM,  min: 1,    max: 10,   step: 1 },
    { key: 'TELECOM_MAX_ZOOM',  label: 'Zoom máx',              desc: 'Nível de zoom máximo para tiles de telecom (maior = mais detalhe)', default: C.TELECOM_MAX_ZOOM,  min: 8,    max: 20,   step: 1 },
    { key: 'TELECOM_MAX_TILES', label: 'Max tiles',              desc: 'Número máximo de tiles de telecom carregados por viewport', default: C.TELECOM_MAX_TILES, min: 10,   max: 200,  step: 10 },
    { key: 'TELECOM_MAST_SIZE', label: 'Torre (px)',             desc: 'Tamanho do ícone de torre de telecom em pixels', default: C.TELECOM_MAST_SIZE, min: 8,    max: 64,   step: 2 },
    { key: 'TELECOM_DC_SIZE',   label: 'Data center (px)',       desc: 'Tamanho do ícone de data center em pixels', default: C.TELECOM_DC_SIZE,   min: 8,    max: 64,   step: 2 },
    { key: 'TELECOM_MAX_CACHE', label: 'Max cache (tiles)',      desc: 'Número máximo de tiles mantidos em cache na memória', default: C.TELECOM_MAX_CACHE, min: 50,   max: 1000, step: 50 },
  ]},
  { section: 'Clima', items: [
    { key: 'WEATHER_ZOOM',      label: 'Tile zoom',              desc: 'Nível de zoom dos tiles de clima (maior = mais detalhe, mais requisições)', default: C.WEATHER_ZOOM,      min: 1,    max: 6,    step: 1 },
    { key: 'WEATHER_REFRESH_MS',label: 'Refresh (ms)',            desc: 'Intervalo de atualização dos tiles de clima em milissegundos', default: C.WEATHER_REFRESH_MS,min: 60_000, max: 3_600_000, step: 60_000 },
  ]},
  { section: 'Rotas', items: [
    { key: 'AIR_ROUTE_ALT',     label: 'Altitude aérea (m)',     desc: 'Altitude de renderização das rotas aéreas no globo em metros', default: C.AIR_ROUTE_ALT,     min: 1000, max: 50_000, step: 1000 },
    { key: 'ROUTE_LINE_WIDTH',  label: 'Espessura da linha',     desc: 'Espessura das linhas de rota em pixels', default: C.ROUTE_LINE_WIDTH,  min: 1,    max: 10,   step: 0.5 },
    { key: 'ROUTE_BBOX_PADDING',label: 'Padding bbox (°)',       desc: 'Graus de expansão da área visível para pré-carregar rotas além do viewport', default: C.ROUTE_BBOX_PADDING,min: 0,    max: 20,   step: 1 },
    { key: 'ROUTE_BATCH_SIZE',  label: 'Batch size',             desc: 'Quantidade de polylines de rota renderizadas por frame', default: C.ROUTE_BATCH_SIZE,  min: 10,   max: 500,  step: 10 },
  ]},
  { section: 'Antenas', items: [
    { key: 'RECEIVER_ICON_SIZE',       label: 'Ícone (px)',             desc: 'Tamanho do ícone de antena/receptor em pixels', default: C.RECEIVER_ICON_SIZE,       min: 10,   max: 128,  step: 2 },
    { key: 'RECEIVER_MAX_ALT',         label: 'Alt máx visível (m)',    desc: 'Altitude da câmera acima da qual as antenas ficam ocultas', default: C.RECEIVER_MAX_ALT,         min: 1_000_000, max: 200_000_000, step: 10_000_000 },
    { key: 'RECEIVER_VIEWPORT_PAD',    label: 'Padding viewport (°)',   desc: 'Graus de expansão do viewport para carregar antenas além da área visível', default: C.RECEIVER_VIEWPORT_PAD,    min: 0,    max: 10,   step: 1 },
    { key: 'ADSB_RECEIVERS_POLL_MS',   label: 'Polling ADS-B (ms)',     desc: 'Intervalo de polling das antenas ADS-B em milissegundos', default: C.ADSB_RECEIVERS_POLL_MS,   min: 60_000, max: 7_200_000, step: 60_000 },
    { key: 'AIS_STATION_FLUSH_MS',     label: 'Flush AIS (ms)',         desc: 'Intervalo de transferência dos dados AIS do WebSocket para o estado React', default: C.AIS_STATION_FLUSH_MS,     min: 500,  max: 30_000, step: 500 },
  ]},
  { section: 'Radares / ATC', items: [
    { key: 'ATC_DEBOUNCE_MS',  label: 'Debounce câmera (ms)',   desc: 'Tempo de espera antes de buscar novos dados ATC ao mover o mapa', default: C.ATC_DEBOUNCE_MS,  min: 500,  max: 10_000, step: 500 },
    { key: 'ATC_MAX_ALT',      label: 'Alt máx visível (m)',    desc: 'Altitude máxima da câmera para exibir dados ATC', default: C.ATC_MAX_ALT,      min: 100_000, max: 200_000_000, step: 10_000_000 },
    { key: 'ATC_TOWER_SIZE',   label: 'Ícone torre (px)',       desc: 'Tamanho do ícone de torre de controle em pixels', default: C.ATC_TOWER_SIZE,   min: 10, max: 64, step: 2 },
    { key: 'ATC_RADAR_SIZE',   label: 'Ícone radar (px)',       desc: 'Tamanho do ícone de radar em pixels', default: C.ATC_RADAR_SIZE,   min: 10, max: 64, step: 2 },
  ]},
  { section: 'Militar', items: [
    { key: 'MILITARY_ICON_SIZE',   label: 'Ícone (px)',             desc: 'Tamanho do ícone de instalação militar em pixels', default: C.MILITARY_ICON_SIZE,   min: 10, max: 64, step: 2 },
    { key: 'MILITARY_DEBOUNCE_MS', label: 'Debounce câmera (ms)',   desc: 'Tempo de espera antes de filtrar dados militares ao mover o mapa', default: C.MILITARY_DEBOUNCE_MS, min: 500, max: 10_000, step: 500 },
    { key: 'MILITARY_MAX_ALT',     label: 'Alt máx visível (m)',    desc: 'Altitude máxima da câmera para exibir instalações militares', default: C.MILITARY_MAX_ALT,     min: 100_000, max: 200_000_000, step: 10_000_000 },
  ]},
  { section: 'Nuclear', items: [
    { key: 'NUCLEAR_ICON_SIZE',    label: 'Ícone (px)',             desc: 'Tamanho do ícone de usina nuclear em pixels', default: C.NUCLEAR_ICON_SIZE,    min: 10, max: 64, step: 2 },
  ]},
  { section: 'Busca', items: [
    { key: 'SEARCH_LIMIT',      label: 'Resultados máx',         desc: 'Número máximo de resultados exibidos na busca', default: C.SEARCH_LIMIT,      min: 1,    max: 20,   step: 1 },
  ]},
];

/* ── Store ───────────────────────────────────────────────────────────────── */

// Build defaults map from schema
const defaults = {};
for (const section of SETTINGS_SCHEMA) {
  for (const item of section.items) {
    defaults[item.key] = item.default;
  }
}

// Load overrides from localStorage
function loadOverrides() {
  try {
    const raw = localStorage.getItem('bb-settings');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

let overrides = loadOverrides();
let snapshot = { ...defaults, ...overrides };
const listeners = new Set();

function notify() {
  snapshot = { ...defaults, ...overrides };
  listeners.forEach(fn => fn());
}

export function getSetting(key) {
  return snapshot[key] ?? defaults[key];
}

export function setSetting(key, value) {
  overrides[key] = value;
  localStorage.setItem('bb-settings', JSON.stringify(overrides));
  notify();
}

export function resetSetting(key) {
  delete overrides[key];
  localStorage.setItem('bb-settings', JSON.stringify(overrides));
  notify();
}

export function resetAll() {
  overrides = {};
  localStorage.removeItem('bb-settings');
  notify();
}

export function isOverridden(key) {
  return key in overrides;
}

/* ── React hook ──────────────────────────────────────────────────────────── */

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export function useSettings() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useSetting(key) {
  const s = useSyncExternalStore(subscribe, getSnapshot);
  return s[key];
}
