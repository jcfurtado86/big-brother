import WebSocket from 'ws';
import config from '../config.js';
import db from '../db.js';
import { upsertVessel, getVessels } from '../cache/vesselCache.js';

const UPSTREAM_URL = 'wss://stream.aisstream.io/v0/stream';
const FULL_GLOBE = [[-90, -180], [90, 180]];
const HISTORY_SNAPSHOT_MS = 5 * 60_000; // snapshot to history every 5min
const HISTORY_RETENTION_DAYS = 30;
const STATION_FLUSH_MS = 30_000; // flush base stations to DB every 30s
const BATCH = 200;

let upstream = null;
let reconnectTimer = null;
const stationBuffer = new Map(); // mmsi → station data

// MID (Maritime Identification Digits) → country
function mmsiCountry(mmsi) {
  const mid = String(mmsi).substring(0, 3);
  const MAP = {
    '201': 'AL', '202': 'AD', '203': 'AT', '204': 'PT', '205': 'BE',
    '209': 'BG', '210': 'CY', '211': 'DE', '212': 'CY', '213': 'GE',
    '214': 'MD', '215': 'MT', '216': 'AM', '218': 'DE', '219': 'DK',
    '220': 'DK', '224': 'ES', '225': 'ES', '226': 'FR', '227': 'FR',
    '228': 'FR', '229': 'MT', '230': 'FI', '231': 'FO', '232': 'GB',
    '233': 'GB', '234': 'GB', '235': 'GB', '236': 'GI', '237': 'GR',
    '238': 'HR', '239': 'GR', '240': 'GR', '241': 'GR', '242': 'MA',
    '243': 'HU', '244': 'NL', '245': 'NL', '246': 'NL', '247': 'IT',
    '248': 'MT', '249': 'MT', '250': 'IE', '251': 'IS', '252': 'LI',
    '253': 'LU', '254': 'MC', '255': 'PT', '256': 'MT', '257': 'NO',
    '258': 'NO', '259': 'NO', '261': 'PL', '263': 'PT', '264': 'RO',
    '265': 'SE', '266': 'SE', '267': 'SK', '268': 'SM', '269': 'CH',
    '270': 'CZ', '271': 'TR', '272': 'UA', '273': 'RU', '274': 'MK',
    '275': 'LV', '276': 'EE', '277': 'LT', '278': 'SI', '279': 'ME',
    '301': 'AI', '303': 'US', '304': 'AG', '305': 'AG', '306': 'CW',
    '307': 'AW', '308': 'BS', '309': 'BS', '310': 'BM', '311': 'BS',
    '312': 'BZ', '314': 'BB', '316': 'CA', '319': 'KY', '321': 'CR',
    '323': 'CU', '325': 'DM', '327': 'DO', '329': 'GP', '330': 'GD',
    '331': 'GL', '332': 'GT', '334': 'HN', '336': 'HT', '338': 'US',
    '339': 'JM', '341': 'KN', '343': 'LC', '345': 'MX', '347': 'MQ',
    '348': 'MS', '350': 'NI', '351': 'PA', '352': 'PA', '353': 'PA',
    '354': 'PA', '355': 'PA', '356': 'PA', '357': 'PA', '358': 'PR',
    '359': 'SV', '361': 'PM', '362': 'TT', '364': 'TC', '366': 'US',
    '367': 'US', '368': 'US', '369': 'US', '370': 'PA', '371': 'PA',
    '372': 'PA', '373': 'PA', '374': 'PA', '375': 'VC', '376': 'VC',
    '377': 'VC', '378': 'VG', '379': 'VI',
    '401': 'AF', '403': 'SA', '405': 'BD', '408': 'BH', '410': 'BT',
    '412': 'CN', '413': 'CN', '414': 'CN', '416': 'TW', '417': 'LK',
    '419': 'IN', '422': 'IR', '423': 'AZ', '425': 'IQ', '428': 'IL',
    '431': 'JP', '432': 'JP', '434': 'TM', '436': 'KZ', '437': 'UZ',
    '438': 'JO', '440': 'KR', '441': 'KR', '443': 'PS', '445': 'KP',
    '447': 'KW', '450': 'LB', '451': 'KG', '453': 'MO', '455': 'MV',
    '457': 'MN', '459': 'NP', '461': 'OM', '463': 'PK', '466': 'QA',
    '468': 'SY', '470': 'AE', '472': 'TJ', '473': 'YE', '475': 'YE',
    '477': 'HK', '478': 'BA',
    '501': 'AQ', '503': 'AU', '506': 'MM', '508': 'BN', '510': 'FM',
    '511': 'PW', '512': 'NZ', '514': 'KH', '515': 'KH', '516': 'CX',
    '518': 'CK', '520': 'FJ', '523': 'CC', '525': 'ID', '529': 'KI',
    '531': 'LA', '533': 'MY', '536': 'MP', '538': 'MH', '540': 'NC',
    '542': 'NU', '544': 'NR', '546': 'PF', '548': 'PH', '553': 'PG',
    '555': 'PN', '557': 'SB', '559': 'AS', '561': 'WS', '563': 'SG',
    '564': 'SG', '565': 'SG', '566': 'SG', '567': 'TH', '570': 'TO',
    '572': 'TV', '574': 'VN', '576': 'VU', '577': 'VU', '578': 'WF',
    '601': 'ZA', '603': 'AO', '605': 'DZ', '607': 'TF', '608': 'IO',
    '609': 'BI', '610': 'BJ', '611': 'BW', '612': 'CF', '613': 'CM',
    '615': 'CG', '616': 'KM', '617': 'CV', '618': 'AQ', '619': 'CI',
    '620': 'KM', '621': 'DJ', '622': 'EG', '624': 'ET', '625': 'ER',
    '626': 'GA', '627': 'GH', '629': 'GM', '630': 'GW', '631': 'GQ',
    '632': 'GN', '633': 'BF', '634': 'KE', '635': 'AQ', '636': 'LR',
    '637': 'LR', '638': 'SS', '642': 'LY', '644': 'LS', '645': 'MU',
    '647': 'MG', '649': 'ML', '650': 'MZ', '654': 'MR', '655': 'MW',
    '656': 'NE', '657': 'NG', '659': 'NA', '660': 'RE', '661': 'RW',
    '662': 'SD', '663': 'SN', '664': 'SC', '665': 'SH', '666': 'SO',
    '667': 'SL', '668': 'ST', '669': 'SZ', '670': 'TD', '671': 'TG',
    '672': 'TN', '674': 'TZ', '675': 'UG', '676': 'CD', '677': 'TZ',
    '678': 'ZM', '679': 'ZW',
  };
  return MAP[mid] || '';
}

function parseAISMessage(msg) {
  const { MessageType, Message, MetaData } = msg;
  if (!MetaData) return null;

  const mmsi = String(MetaData.MMSI);
  const base = {
    mmsi,
    lat: MetaData.latitude,
    lon: MetaData.longitude,
    timeUtc: MetaData.time_utc,
    country: mmsiCountry(mmsi),
    fetchedAt: Date.now(),
  };

  if (MessageType === 'PositionReport' && Message?.PositionReport) {
    const p = Message.PositionReport;
    return {
      ...base,
      cog: p.Cog ?? 0,
      sog: p.Sog ?? 0,
      heading: p.TrueHeading !== 511 ? p.TrueHeading : (p.Cog ?? 0),
      navStatus: p.NavigationalStatus ?? -1,
      rateOfTurn: p.RateOfTurn ?? null,
    };
  }

  if (MessageType === 'ShipStaticData' && Message?.ShipStaticData) {
    const s = Message.ShipStaticData;
    return {
      ...base,
      name: s.Name?.trim() || mmsi,
      shipType: s.Type ?? 0,
      destination: s.Destination?.trim() || '',
      callsign: s.CallSign?.trim() || '',
      imo: s.ImoNumber || 0,
      draught: s.MaximumStaticDraught ?? 0,
      length: (s.Dimension?.A ?? 0) + (s.Dimension?.B ?? 0),
      beam: (s.Dimension?.C ?? 0) + (s.Dimension?.D ?? 0),
      eta: s.Eta ? {
        month: s.Eta.Month,
        day: s.Eta.Day,
        hour: s.Eta.Hour,
        minute: s.Eta.Minute,
      } : null,
    };
  }

  return null;
}

function parseBaseStation(msg) {
  const { MessageType, MetaData } = msg;
  if (MessageType !== 'BaseStationReport') return null;
  if (!MetaData) return null;

  const mmsi = String(MetaData.MMSI);
  const lat = MetaData.latitude;
  const lon = MetaData.longitude;
  if (lat == null || lon == null) return null;
  if (lat === 0 && lon === 0) return null;

  return {
    mmsi,
    lat,
    lon,
    name: (MetaData.ShipName || '').trim() || `AIS ${mmsi}`,
    country: mmsiCountry(mmsi),
  };
}

// Flush base station buffer to DB
async function flushStations() {
  if (stationBuffer.size === 0) return;

  const rows = [];
  for (const s of stationBuffer.values()) {
    rows.push({
      mmsi: s.mmsi,
      lat: s.lat,
      lon: s.lon,
      geom: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [s.lon, s.lat]),
      name: (s.name || '').substring(0, 100),
      country: (s.country || '').substring(0, 50),
      updated_at: new Date(),
    });
  }
  stationBuffer.clear();

  try {
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      await db('ais_stations').insert(batch).onConflict('mmsi').merge();
    }
    console.log(`[aisstream] Flushed ${rows.length} AIS base stations to DB`);
  } catch (e) {
    console.error('[aisstream] Station flush error:', e.message);
  }
}

// ── DB persistence ─────────────────────────────────────────────────────────

// Snapshot in-memory cache to vessel_history (for timeline replay)
async function takeHistorySnapshot() {
  const vessels = getVessels(null);
  if (vessels.length === 0) return;

  const now = new Date();
  let inserted = 0;

  try {
    for (let i = 0; i < vessels.length; i += BATCH) {
      const batch = vessels.slice(i, i + BATCH)
        .filter(v => v.lat != null && v.lon != null)
        .map(v => ({
          mmsi: v.mmsi,
          name: (v.name || '').substring(0, 100) || null,
          lat: v.lat,
          lon: v.lon,
          cog: v.cog ?? null,
          sog: v.sog ?? null,
          heading: v.heading ?? null,
          nav_status: v.navStatus ?? -1,
          ship_type: v.shipType ?? 0,
          recorded_at: now,
        }));

      await db('vessel_history').insert(batch);
      inserted += batch.length;
    }

    console.log(`[aisstream] History snapshot: ${inserted} vessels recorded`);
  } catch (e) {
    console.error('[aisstream] History snapshot error:', e.message);
  }
}

// Clean old history records
async function cleanupHistory() {
  try {
    const cutoff = new Date(Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await db('vessel_history')
      .where('recorded_at', '<', cutoff)
      .del();

    if (result > 0) {
      console.log(`[aisstream] History cleanup: removed ${result} old records`);
    }
  } catch (e) {
    console.error('[aisstream] History cleanup error:', e.message);
  }
}

// ── WebSocket connection ───────────────────────────────────────────────────

function connectUpstream() {
  if (!config.AISSTREAM_API_KEY) {
    console.warn('[aisstream] No API key configured, skipping');
    return;
  }

  if (upstream && (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING)) {
    return;
  }

  console.log('[aisstream] Connecting to upstream (full globe)...');
  upstream = new WebSocket(UPSTREAM_URL);

  upstream.on('open', () => {
    console.log('[aisstream] Upstream connected');
    const sub = {
      APIKey: config.AISSTREAM_API_KEY,
      BoundingBoxes: [FULL_GLOBE],
      FilterMessageTypes: ['PositionReport', 'ShipStaticData', 'BaseStationReport'],
    };
    upstream.send(JSON.stringify(sub));
  });

  upstream.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      const vessel = parseAISMessage(msg);
      if (vessel) {
        upsertVessel(vessel);
      }

      // Capture AIS base stations (Message Type 4)
      const station = parseBaseStation(msg);
      if (station) {
        stationBuffer.set(station.mmsi, station);
      }
    } catch {
      // ignore malformed messages
    }
  });

  upstream.on('close', () => {
    console.log('[aisstream] Upstream disconnected, reconnecting in 5s...');
    upstream = null;
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectUpstream, 5000);
  });

  upstream.on('error', (err) => {
    console.error('[aisstream] Upstream error:', err.message);
    upstream?.close();
  });
}

// Start AIS stream: always connected, full globe, persist to DB
export function startAisStream() {
  connectUpstream();

  // Flush AIS base stations to DB every 30s
  setInterval(flushStations, STATION_FLUSH_MS);

  // Snapshot to history every 5min (after 2min warm-up)
  setTimeout(() => {
    takeHistorySnapshot();
    setInterval(takeHistorySnapshot, HISTORY_SNAPSHOT_MS);
  }, 2 * 60_000);

  // Daily cleanup
  cleanupHistory();
  setInterval(cleanupHistory, 24 * 60 * 60 * 1000);

  console.log('[aisstream] Stream started (full globe, DB persistence)');
}
