#!/usr/bin/env node
// Baixa logos das companhias aéreas do CDN do Kiwi.com e salva em public/airline-logos/
// Os logos são PNGs 64x64 identificados pelo código IATA de 2 letras.
// Uso: node scripts/download-airline-logos.mjs

import https from 'node:https';
import http  from 'node:http';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '..', 'public', 'aircraft-db.json');
const OUT_DIR   = path.join(__dirname, '..', 'src', 'assets', 'companies');

// CDN público do Kiwi.com — amplamente usado em apps de aviação
const LOGO_URL = (iata) => `https://images.kiwi.com/airlines/64/${iata}.png`;

await mkdir(OUT_DIR, { recursive: true });

console.log('Lendo aircraft-db.json para extrair códigos IATA únicos...');
const db = JSON.parse(await readFile(DB_PATH, 'utf8'));

// Coleta todos os IATA codes únicos (índice 6 do array)
const iataSet = new Set();
for (const row of Object.values(db)) {
  const iata = row[6];
  if (iata && iata.length === 2) iataSet.add(iata);
}

const iatas = [...iataSet].sort();
console.log(`${iatas.length} códigos IATA únicos encontrados.`);

function fetchBinary(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302)
        return fetchBinary(res.headers.location).then(resolve).catch(reject);
      if (res.statusCode !== 200) return resolve(null); // logo não encontrado
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

let ok = 0, skip = 0;
const CONCURRENCY = 8;

async function downloadBatch(batch) {
  await Promise.all(batch.map(async (iata) => {
    const dest = path.join(OUT_DIR, `${iata}.png`);
    const data = await fetchBinary(LOGO_URL(iata));
    if (!data || data.length < 200) { skip++; return; } // imagem vazia/não encontrada
    await writeFile(dest, data);
    ok++;
  }));
}

for (let i = 0; i < iatas.length; i += CONCURRENCY) {
  const batch = iatas.slice(i, i + CONCURRENCY);
  await downloadBatch(batch);
  if ((i + CONCURRENCY) % 80 === 0 || i + CONCURRENCY >= iatas.length) {
    process.stdout.write(`\r  ${Math.min(i + CONCURRENCY, iatas.length)}/${iatas.length} processados (${ok} baixados, ${skip} sem logo)`);
  }
}

console.log(`\n✓ ${ok} logos salvos em public/airline-logos/`);
