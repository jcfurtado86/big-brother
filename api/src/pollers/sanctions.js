import db from '../db.js';

const SDN_URL = 'https://www.treasury.gov/ofac/downloads/sdn.csv';
const REFRESH_MS = 24 * 60 * 60 * 1000; // daily

// In-memory lookup sets for fast vessel cache checks
export const sanctionedMMSI = new Set();
export const sanctionedIMO = new Set();

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function extractFromRemarks(remarks) {
  const imo = remarks.match(/IMO\s+(\d{7})/i)?.[1] || null;
  const mmsi = remarks.match(/MMSI\s+(\d{9})/i)?.[1] || null;
  return { imo, mmsi };
}

async function fetchAndParse() {
  console.log('[sanctions] fetching OFAC SDN list...');

  const res = await fetch(SDN_URL, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) {
    console.error('[sanctions] fetch failed:', res.status);
    return;
  }

  const text = await res.text();
  const lines = text.split('\n');
  const vessels = [];

  for (const line of lines) {
    if (!line.includes('"vessel"')) continue;

    const fields = parseCSVLine(line);
    // SDN CSV columns: id, name, sdnType, program, title, callsign, vesselType, tonnage, grossTonnage, flag, owner, remarks
    const sdnType = (fields[2] || '').replace(/"/g, '');
    if (sdnType !== 'vessel') continue;

    const name = (fields[1] || '').replace(/"/g, '');
    const program = (fields[3] || '').replace(/"/g, '');
    const vesselType = (fields[6] || '').replace(/"/g, '');
    const tonnage = (fields[7] || '').replace(/"/g, '');
    const flag = (fields[9] || '').replace(/"/g, '');
    const remarks = fields[11] || '';

    const { imo, mmsi } = extractFromRemarks(remarks);

    const clean = (v) => (!v || v === '-0-') ? null : v;

    vessels.push({
      sdn_name: name,
      vessel_type: clean(vesselType),
      tonnage: clean(tonnage),
      flag: clean(flag),
      imo: imo,
      mmsi: mmsi,
      program: clean(program),
    });
  }

  if (vessels.length === 0) {
    console.warn('[sanctions] no vessels found in SDN list');
    return;
  }

  // Replace all data
  await db.transaction(async (trx) => {
    await trx('sanctioned_vessels').truncate();
    // Insert in batches of 500
    for (let i = 0; i < vessels.length; i += 500) {
      await trx('sanctioned_vessels').insert(vessels.slice(i, i + 500));
    }
  });

  // Update in-memory sets
  sanctionedMMSI.clear();
  sanctionedIMO.clear();
  for (const v of vessels) {
    if (v.mmsi) sanctionedMMSI.add(v.mmsi);
    if (v.imo) sanctionedIMO.add(v.imo);
  }

  console.log(`[sanctions] loaded ${vessels.length} sanctioned vessels (${sanctionedMMSI.size} MMSI, ${sanctionedIMO.size} IMO)`);
}

async function loadFromDb() {
  const rows = await db('sanctioned_vessels').select('mmsi', 'imo');
  sanctionedMMSI.clear();
  sanctionedIMO.clear();
  for (const r of rows) {
    if (r.mmsi) sanctionedMMSI.add(r.mmsi);
    if (r.imo) sanctionedIMO.add(r.imo);
  }
  if (sanctionedMMSI.size > 0 || sanctionedIMO.size > 0) {
    console.log(`[sanctions] loaded from DB: ${sanctionedMMSI.size} MMSI, ${sanctionedIMO.size} IMO`);
  }
}

export async function startSanctionsPoller() {
  // Load from DB first (fast startup)
  try {
    await loadFromDb();
  } catch { /* table may not exist yet */ }

  // Fetch fresh data
  try {
    await fetchAndParse();
  } catch (e) {
    console.error('[sanctions] initial fetch error:', e.message);
  }

  // Refresh daily
  setInterval(async () => {
    try {
      await fetchAndParse();
    } catch (e) {
      console.error('[sanctions] refresh error:', e.message);
    }
  }, REFRESH_MS);
}
