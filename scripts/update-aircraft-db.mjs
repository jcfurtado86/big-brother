#!/usr/bin/env node
// Baixa aircraftDatabase.csv do OpenSky Network e gera public/aircraft-db.json
// Formato de saída: objeto { [icao24]: [registration, model, manufacturername, operator, built] }
// Os campos nulos/vazios são salvos como "" para manter o array compacto.
// Uso: node scripts/update-aircraft-db.mjs

import https from 'node:https';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'aircraft-db.json');

// Arquivo público, sem autenticação necessária
const CSV_URL = 'https://opensky-network.org/datasets/metadata/aircraftDatabase.csv';

function fetchText(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && redirects > 0)
        return fetchText(res.headers.location, redirects - 1).then(resolve).catch(reject);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} em ${url}`));
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Parser de linha CSV simples com suporte a campos entre aspas
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

console.log('Baixando aircraftDatabase.csv do OpenSky Network...');
console.log('(arquivo ~100MB, pode levar alguns minutos)');

const csv = await fetchText(CSV_URL);
const lines = csv.split('\n');

const header = parseLine(lines[0]);
const idx = Object.fromEntries(header.map((h, i) => [h.trim().replace(/^"|"$/g, ''), i]));

// Campos que vamos extrair (índices robustos ao cabeçalho real)
const F = {
  icao24:       idx['icao24'],
  registration: idx['registration'],
  manufacturer: idx['manufacturername'],
  model:        idx['model'],
  operator:     idx['operator'],
  built:        idx['built'],
  typeCode:     idx['typecode'],
};

console.log('Colunas detectadas:', Object.entries(F).map(([k,v]) => `${k}=${v}`).join(', '));

const db = Object.create(null); // sem prototype para JSON mais limpo
let total = 0;
let kept  = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  total++;

  const f = parseLine(line);
  const icao24 = (f[F.icao24] || '').trim().toLowerCase();
  if (!icao24 || icao24.length !== 6) continue;

  const reg      = (f[F.registration] || '').trim();
  const mfr      = (f[F.manufacturer] || '').trim();
  const model    = (f[F.model]        || '').trim();
  const op       = (f[F.operator]     || '').trim();
  const built    = (f[F.built]        || '').trim().substring(0, 4);
  const typeCode = (f[F.typeCode]     || '').trim().toUpperCase();

  // Só salva se tiver pelo menos um campo útil
  if (!reg && !model && !mfr && !op && !typeCode) continue;

  db[icao24] = [reg, model, mfr, op, built, typeCode];
  kept++;
}

console.log(`\nTotal de linhas: ${total}`);
console.log(`Aeronaves com dados: ${kept}`);

await writeFile(OUT, JSON.stringify(db));

const stats = await import('node:fs').then(m => m.statSync(OUT));
const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
console.log(`✓ Salvo em public/aircraft-db.json (${sizeMB} MB)`);
console.log('\nDica: configure seu servidor web para servir o arquivo com gzip/brotli');
console.log('  para reduzir o tamanho de download em ~5-8x.');
