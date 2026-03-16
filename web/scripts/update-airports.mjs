#!/usr/bin/env node
// Baixa airports.csv do OurAirports e gera public/airports.json
// Inclui todos os tipos exceto 'closed'.
// Uso: node scripts/update-airports.mjs

import https from 'node:https';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'airports.json');
const CSV_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';

const KEEP_TYPES = new Set([
  'large_airport', 'medium_airport', 'small_airport',
  'military', 'heliport', 'seaplane_base', 'balloonport',
]);

// Parser de linha CSV com suporte a campos entre aspas
function parseLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(field); field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302)
        return fetchText(res.headers.location).then(resolve).catch(reject);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

console.log('Baixando airports.csv...');
const csv = await fetchText(CSV_URL);
const lines = csv.split('\n').filter(Boolean);

const header = parseLine(lines[0]);
const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

const airports = [];
for (const line of lines.slice(1)) {
  if (!line.trim()) continue;
  const f = parseLine(line);
  const type = f[idx.type];
  if (!KEEP_TYPES.has(type)) continue;
  const lat = parseFloat(f[idx.latitude_deg]);
  const lon = parseFloat(f[idx.longitude_deg]);
  if (isNaN(lat) || isNaN(lon)) continue;
  airports.push({
    icao:    f[idx.ident]         || '',
    iata:    f[idx.iata_code]     || '',
    type,
    name:    f[idx.name]          || '',
    lat,
    lon,
    country: f[idx.iso_country]   || '',
    city:    f[idx.municipality]  || '',
  });
}

await writeFile(OUT, JSON.stringify(airports));
console.log(`✓ ${airports.length} aeroportos salvos em public/airports.json`);

const byType = {};
for (const ap of airports) byType[ap.type] = (byType[ap.type] ?? 0) + 1;
for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1]))
  console.log(`  ${type.padEnd(20)} ${count}`);
