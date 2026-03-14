import { useState, useEffect, useRef } from 'react';
import { connectVesselStream } from '../providers/vesselService';
import { computeBboxFromViewer } from '../utils/bboxUtils';

const STALE_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL = 60_000;
const FLUSH_INTERVAL   = 2_000;
const BBOX_DEBOUNCE_MS = 2_000;

const USE_MOCK = import.meta.env.VITE_MOCK_VESSELS === 'true';

const GLOBAL_BBOX = { south: -90, west: -180, north: 90, east: 180 };

// ── Mock vessels ──────────────────────────────────────────────────────────────

function buildMockVessels() {
  const now = Date.now();
  const mock = [
    // Porto de Santos — carga
    { mmsi: '710000001', name: 'SANTOS EXPRESS',   lat: -23.98, lon: -46.30, cog: 180, sog: 8.5,  heading: 178, navStatus: 0, rateOfTurn: 2,    shipType: 70, destination: 'BUENOS AIRES',  callsign: 'PPSA',  imo: 9100001, draught: 11.2, length: 294, beam: 32, eta: { month: 3, day: 18, hour: 14, minute: 0 }, country: 'Brazil' },
    // Porto de Santos — tanque
    { mmsi: '710000002', name: 'PETROBRAS VII',    lat: -24.02, lon: -46.25, cog: 90,  sog: 0,    heading: 92,  navStatus: 1, rateOfTurn: 0,    shipType: 80, destination: 'SANTOS',         callsign: 'PPVII', imo: 9100002, draught: 14.8, length: 332, beam: 58, eta: null, country: 'Brazil' },
    // Costa do RJ — passageiro
    { mmsi: '710000003', name: 'MSC SEAVIEW',      lat: -22.88, lon: -43.10, cog: 45,  sog: 18.2, heading: 44,  navStatus: 0, rateOfTurn: -3,   shipType: 60, destination: 'SALVADOR',        callsign: 'MSCV',  imo: 9100003, draught: 8.5,  length: 323, beam: 41, eta: { month: 3, day: 15, hour: 8, minute: 30 }, country: 'Brazil' },
    // Baia de Guanabara — pesca
    { mmsi: '710000004', name: 'MARIA DO MAR',     lat: -22.92, lon: -43.15, cog: 270, sog: 3.1,  heading: 268, navStatus: 7, rateOfTurn: null,  shipType: 30, destination: '',                callsign: '',       imo: 0,       draught: 3.2,  length: 18,  beam: 5,  eta: null, country: 'Brazil' },
    // Canal de São Sebastião — rebocador
    { mmsi: '710000005', name: 'SMIT REBOCADOR',   lat: -23.80, lon: -45.40, cog: 150, sog: 6.0,  heading: 148, navStatus: 0, rateOfTurn: 5,    shipType: 52, destination: 'SAO SEBASTIAO',   callsign: 'PPSR',  imo: 9100005, draught: 5.0,  length: 32,  beam: 12, eta: null, country: 'Brazil' },
    // Mediterrâneo — carga (Panama flag)
    { mmsi: '351000001', name: 'MAERSK SEALAND',   lat: 36.50,  lon: 12.80,  cog: 95,  sog: 14.0, heading: 94,  navStatus: 0, rateOfTurn: 0,    shipType: 71, destination: 'PIRAEUS',         callsign: 'H3MS',  imo: 9200001, draught: 12.0, length: 366, beam: 48, eta: { month: 3, day: 16, hour: 6, minute: 0 }, country: 'Panama' },
    // Canal da Mancha — tanque
    { mmsi: '235000001', name: 'NORTH SEA TANKER', lat: 50.90,  lon:  1.20,  cog: 220, sog: 11.5, heading: 218, navStatus: 0, rateOfTurn: -1,   shipType: 84, destination: 'ROTTERDAM',       callsign: 'GBNT',  imo: 9200002, draught: 16.5, length: 274, beam: 46, eta: { month: 3, day: 14, hour: 18, minute: 30 }, country: 'United Kingdom' },
    // Costa dos EUA — passageiro
    { mmsi: '366000001', name: 'CARNIVAL DREAM',   lat: 25.78,  lon: -80.10, cog: 135, sog: 20.0, heading: 133, navStatus: 0, rateOfTurn: 1,    shipType: 69, destination: 'COZUMEL',         callsign: 'WDH9',  imo: 9200003, draught: 8.2,  length: 306, beam: 37, eta: { month: 3, day: 14, hour: 10, minute: 0 }, country: 'United States' },
    // Costa da China — carga
    { mmsi: '412000001', name: 'COSCO SHIPPING',   lat: 31.30,  lon: 122.00, cog: 350, sog: 12.3, heading: 348, navStatus: 0, rateOfTurn: 0,    shipType: 79, destination: 'SHANGHAI',        callsign: 'BCOS',  imo: 9200004, draught: 13.5, length: 400, beam: 59, eta: { month: 3, day: 13, hour: 22, minute: 0 }, country: 'China' },
    // Singapura — rebocador
    { mmsi: '563000001', name: 'PSA TUG 12',       lat:  1.26,  lon: 103.85, cog: 60,  sog: 4.0,  heading: 58,  navStatus: 0, rateOfTurn: 10,   shipType: 52, destination: '',                callsign: '9VST',  imo: 0,       draught: 4.0,  length: 28,  beam: 10, eta: null, country: 'Singapore' },
    // Noruega — pesca
    { mmsi: '257000001', name: 'NORDKAPP FISHER',  lat: 70.50,  lon: 24.00,  cog: 30,  sog: 5.5,  heading: 28,  navStatus: 7, rateOfTurn: null,  shipType: 30, destination: '',                callsign: 'LANF',  imo: 0,       draught: 4.5,  length: 24,  beam: 7,  eta: null, country: 'Norway' },
    // Atracado em Salvador
    { mmsi: '710000006', name: 'ALIANÇA BRASIL',   lat: -12.97, lon: -38.51, cog: 0,   sog: 0,    heading: 0,   navStatus: 5, rateOfTurn: 0,    shipType: 70, destination: 'VITORIA',         callsign: 'PPAB',  imo: 9100006, draught: 10.0, length: 200, beam: 30, eta: { month: 3, day: 20, hour: 12, minute: 0 }, country: 'Brazil' },
    // Veleiro — Costa do RJ
    { mmsi: '710000007', name: 'VENTO SUL',        lat: -23.05, lon: -43.20, cog: 160, sog: 6.2,  heading: 158, navStatus: 0, rateOfTurn: 0,    shipType: 36, destination: 'PARATY',          callsign: 'PPVS',  imo: 0,       draught: 2.5,  length: 14,  beam: 4,  eta: null, country: 'Brazil' },
    // Militar — Baía de Guanabara
    { mmsi: '710000008', name: 'FRAGATA LIBERAL',  lat: -22.90, lon: -43.12, cog: 0,   sog: 12.0, heading: 358, navStatus: 0, rateOfTurn: 0,    shipType: 35, destination: '',                callsign: '',       imo: 0,       draught: 5.5,  length: 130, beam: 14, eta: null, country: 'Brazil' },
    // SAR — Costa de Vitória
    { mmsi: '710000009', name: 'SALVAMAR LESTE',   lat: -20.30, lon: -40.28, cog: 90,  sog: 15.0, heading: 88,  navStatus: 0, rateOfTurn: 0,    shipType: 51, destination: '',                callsign: 'PPSL',  imo: 0,       draught: 3.0,  length: 22,  beam: 6,  eta: null, country: 'Brazil' },
    // Militar — Mediterrâneo
    { mmsi: '247000001', name: 'ITS CAVOUR',       lat: 40.85,  lon: 14.20,  cog: 270, sog: 18.0, heading: 268, navStatus: 0, rateOfTurn: -2,   shipType: 55, destination: '',                callsign: 'ICAV',  imo: 0,       draught: 8.5,  length: 244, beam: 39, eta: null, country: 'Italy' },
    // Veleiro — Caribe
    { mmsi: '366000002', name: 'WIND SPIRIT',      lat: 18.45,  lon: -64.95, cog: 120, sog: 7.5,  heading: 118, navStatus: 0, rateOfTurn: 0,    shipType: 36, destination: 'ST THOMAS',       callsign: 'WSPR',  imo: 0,       draught: 2.0,  length: 12,  beam: 4,  eta: null, country: 'United States' },
  ];
  const map = new Map();
  for (const v of mock) map.set(v.mmsi, { ...v, timeUtc: new Date(now - Math.random() * 300_000).toISOString(), fetchedAt: now });
  return map;
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function useVessels(viewer, enabled = false) {
  const [vessels, setVessels] = useState(new Map());
  const vesselsMapRef = useRef(new Map());
  const streamRef = useRef(null);

  // Conexão WebSocket — abre/fecha com enabled + viewer
  useEffect(() => {
    if (!enabled) {
      vesselsMapRef.current.clear();
      setVessels(new Map());
      return;
    }

    if (USE_MOCK) {
      console.log('[vessels] using mock data');
      setVessels(buildMockVessels());
      return;
    }

    // Espera viewer estar pronto para usar bbox da viewport
    if (!viewer) return;

    const vesselsMap = vesselsMapRef.current;

    const initialBbox = computeBboxFromViewer(viewer);
    console.log('[vessels] connecting — bbox:', initialBbox);

    const stream = connectVesselStream(
      initialBbox,
      (vessel) => { vesselsMap.set(vessel.mmsi, vessel); },
      (err) => console.warn('[vessels]', err),
    );
    streamRef.current = stream;

    // Flush accumulated updates to React state
    const flushId = setInterval(() => {
      if (vesselsMap.size > 0) {
        console.log('[vessels] total:', vesselsMap.size);
        setVessels(new Map(vesselsMap));
      }
    }, FLUSH_INTERVAL);

    // Evict stale vessels
    const cleanupId = setInterval(() => {
      const now = Date.now();
      let removed = 0;
      for (const [mmsi, v] of vesselsMap) {
        if (now - v.fetchedAt > STALE_MS) {
          vesselsMap.delete(mmsi);
          removed++;
        }
      }
      if (removed > 0) {
        console.log('[vessels] evicted', removed, '| remaining:', vesselsMap.size);
        setVessels(new Map(vesselsMap));
      }
    }, CLEANUP_INTERVAL);

    return () => {
      stream.close();
      streamRef.current = null;
      clearInterval(flushId);
      clearInterval(cleanupId);
    };
  }, [viewer, enabled]);

  // Atualiza bbox do WebSocket quando a câmera move (debounced)
  useEffect(() => {
    if (!viewer || !enabled || USE_MOCK) return;

    let debounceId = null;
    let lastKey = null;

    const onCameraChanged = () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        const stream = streamRef.current;
        if (!stream) return;
        if (viewer.isDestroyed()) return;

        const bbox = computeBboxFromViewer(viewer);
        const key = `${bbox.south.toFixed(1)},${bbox.west.toFixed(1)},${bbox.north.toFixed(1)},${bbox.east.toFixed(1)}`;
        if (key === lastKey) return;
        lastKey = key;

        console.log('[vessels] updating bbox:', bbox);
        stream.updateBbox(bbox);
      }, BBOX_DEBOUNCE_MS);
    };

    const removeListener = viewer.camera.changed.addEventListener(onCameraChanged);
    return () => {
      removeListener();
      clearTimeout(debounceId);
    };
  }, [viewer, enabled]);

  return vessels;
}
