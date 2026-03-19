import { createReadStream } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { createUnzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import db from '../db.js';
import { updateMeta, safeInterval } from '../utils/scheduler.js';
import { toneLabel } from '../utils/gdelt.js';
import config from '../config.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const LASTUPDATE_URL = 'http://data.gdeltproject.org/gdeltv2/lastupdate.txt';

// CAMEO QuadClass: 3 = Verbal Conflict, 4 = Material Conflict
// We also include selected EventRootCodes for protests (14) and disasters
const CONFLICT_QUAD_CLASSES = new Set([3, 4]);

// Map CAMEO EventRootCode to our event_type categories
function classifyEvent(eventCode, quadClass) {
  const root = eventCode?.substring(0, 2);
  if (root === '18' || root === '19' || root === '20') return 'conflict';  // assault, fight, unconventional violence
  if (root === '14') return 'protest';   // protest
  if (root === '15') return 'protest';   // exhibit force posture (riots)
  if (root === '17') return 'conflict';  // coerce
  if (root === '13') return 'political'; // threaten
  if (root === '16') return 'conflict';  // reduce relations (violent)
  if (quadClass === 4) return 'conflict';
  if (quadClass === 3) return 'political';
  return 'political';
}

// Parse GDELT export CSV line (tab-delimited, no header)
// See: http://data.gdeltproject.org/documentation/GDELT-Event_Codebook-V2.0.pdf
function parseExportLine(line) {
  const f = line.split('\t');
  if (f.length < 61) return null;

  const globalEventId = f[0];
  const eventCode = f[26];        // EventCode (CAMEO)
  const eventRootCode = f[28];    // EventRootCode
  const quadClass = parseInt(f[29], 10);
  const goldstein = parseFloat(f[30]) || 0;
  const numArticles = parseInt(f[33], 10) || 0;
  const avgTone = parseFloat(f[34]) || 0;

  // ActionGeo fields (columns 52-58, 0-indexed)
  const actionGeoName = f[52] || '';
  const actionGeoCC = f[53] || '';
  const actionGeoLat = parseFloat(f[56]);
  const actionGeoLong = parseFloat(f[57]);
  const dateAdded = f[59];        // YYYYMMDDHHMMSS
  const sourceUrl = f[60] || '';

  // Actor names
  const actor1Name = f[6] || '';
  const actor2Name = f[16] || '';

  // Skip events without coordinates
  if (isNaN(actionGeoLat) || isNaN(actionGeoLong)) return null;

  // Only conflict events (QuadClass 3 & 4) + protests (root 14)
  if (!CONFLICT_QUAD_CLASSES.has(quadClass) && eventRootCode !== '14') return null;

  // Parse dateAdded to Date
  let sourceDate;
  if (dateAdded && dateAdded.length >= 14) {
    const y = dateAdded.substring(0, 4);
    const m = dateAdded.substring(4, 6);
    const d = dateAdded.substring(6, 8);
    const h = dateAdded.substring(8, 10);
    const mi = dateAdded.substring(10, 12);
    const s = dateAdded.substring(12, 14);
    sourceDate = new Date(`${y}-${m}-${d}T${h}:${mi}:${s}Z`);
  } else {
    sourceDate = new Date();
  }

  const eventType = classifyEvent(eventCode, quadClass);
  const tone = avgTone;

  // Extract domain from URL
  let domain = '';
  try { domain = new URL(sourceUrl).hostname; } catch { /* skip */ }

  return {
    id: globalEventId,
    title: `${actor1Name}${actor2Name ? ' → ' + actor2Name : ''}: ${actionGeoName}`.substring(0, 500),
    url: sourceUrl.substring(0, 1000),
    domain: domain.substring(0, 200),
    socialimage: '',
    tone,
    tone_label: toneLabel(tone),
    lat: actionGeoLat,
    lng: actionGeoLong,
    geom: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [actionGeoLong, actionGeoLat]),
    country: actionGeoCC.substring(0, 100),
    event_type: eventType,
    source_date: sourceDate,
    seen_at: new Date(),
    goldstein_scale: goldstein,
    quad_class: quadClass,
    event_code: eventCode,
    actor1_name: actor1Name.substring(0, 200),
    actor2_name: actor2Name.substring(0, 200),
    action_geo_name: actionGeoName.substring(0, 300),
    source_url: sourceUrl.substring(0, 1000),
  };
}

async function fetchGdelt() {
  console.log('[gdelt] Fetching GDELT Event Export...');
  try {
    // 1. Get lastupdate.txt to find the latest export CSV URL
    const updateRes = await fetch(LASTUPDATE_URL);
    if (!updateRes.ok) {
      console.error('[gdelt] Failed to fetch lastupdate.txt:', updateRes.status);
      return;
    }

    const updateText = await updateRes.text();
    const lines = updateText.trim().split('\n');
    // First line is the export CSV
    const exportLine = lines.find(l => l.includes('.export.CSV.zip'));
    if (!exportLine) {
      console.error('[gdelt] No export CSV found in lastupdate.txt');
      return;
    }

    const csvUrl = exportLine.split(/\s+/).pop();
    console.log('[gdelt] Downloading:', csvUrl);

    // 2. Download and unzip the CSV
    const csvRes = await fetch(csvUrl);
    if (!csvRes.ok) {
      console.error('[gdelt] Failed to download export CSV:', csvRes.status);
      return;
    }

    const zipPath = join(tmpdir(), 'gdelt_export.zip');
    const csvPath = join(tmpdir(), 'gdelt_export.csv');
    const arrayBuf = await csvRes.arrayBuffer();
    await writeFile(zipPath, Buffer.from(arrayBuf));

    // Unzip
    const { execSync } = await import('node:child_process');
    execSync(`unzip -o -p "${zipPath}" > "${csvPath}"`, { stdio: 'pipe' });

    // 3. Parse CSV line by line
    const rows = [];
    const rl = createInterface({
      input: createReadStream(csvPath, 'utf-8'),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      const row = parseExportLine(line);
      if (row) rows.push(row);
    }

    console.log(`[gdelt] Parsed ${rows.length} conflict events from CSV`);

    // 4. Insert into database
    let totalInserted = 0;
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const inserted = await db('gdelt_events').insert(batch).onConflict('id').ignore();
      totalInserted += inserted.rowCount ?? 0;
    }

    await updateMeta('gdelt', totalInserted);
    console.log('[gdelt] Inserted', totalInserted, 'new events');

    // 5. Cleanup temp files
    await unlink(zipPath).catch(() => {});
    await unlink(csvPath).catch(() => {});
  } catch (e) {
    console.error('[gdelt] error:', e.message);
  }
}

export function startGdeltPoller() {
  fetchGdelt();
  safeInterval(fetchGdelt, config.GDELT_POLL_MS);
}
