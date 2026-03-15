#!/usr/bin/env node
// Baixa dados agregados do ACLED (6 regiões), converte XLSX → CSV,
// e salva em public/data/acled/.
// Uso: node scripts/update-acled.mjs
//
// Credenciais via env: ACLED_USER e ACLED_PASS
// Ou edite os defaults abaixo.

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'data', 'acled');

const ACLED_USER = process.env.ACLED_USER || 'julio.furtado@gmail.com';
const ACLED_PASS = process.env.ACLED_PASS || 'C0mb4t18';
const LOGIN_URL = 'https://acleddata.com/user/login?_format=json';

// Regional page slugs → output CSV filenames
const REGIONS = [
  { slug: 'africa',                    file: 'africa.csv' },
  { slug: 'middle-east',              file: 'middle-east.csv' },
  { slug: 'asia-pacific',             file: 'south-asia.csv' },
  { slug: 'europe-and-central-asia',  file: 'europe.csv' },
  { slug: 'latin-america-caribbean',  file: 'latin-america.csv' },
  { slug: 'united-states-canada',     file: 'united-states-canada.csv' },
];

async function login() {
  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: ACLED_USER, pass: ACLED_PASS }),
    redirect: 'manual',
  });

  if (!res.ok) throw new Error(`Login failed: ${res.status}`);

  // Extract session cookie
  const cookies = res.headers.getSetCookie?.() ?? [];
  const sessionCookie = cookies.find(c => c.startsWith('SSESS') || c.startsWith('SESS'));
  if (!sessionCookie) throw new Error('No session cookie in login response');

  return sessionCookie.split(';')[0]; // "SSESS...=value"
}

async function scrapeXlsxUrl(slug, cookie) {
  const pageUrl = `https://acleddata.com/aggregated/aggregated-data-${slug}`;
  const res = await fetch(pageUrl, {
    headers: { Cookie: cookie },
  });

  if (!res.ok) throw new Error(`Page ${slug}: ${res.status}`);

  const html = await res.text();
  // Find XLSX URL in the page (pattern: system/files/...xlsx)
  const match = html.match(/https:\/\/acleddata\.com\/system\/files\/[^"']*\.xlsx/);
  if (!match) throw new Error(`No XLSX link found on page: ${slug}`);

  return match[0];
}

async function downloadXlsx(url, cookie) {
  const res = await fetch(url, {
    headers: { Cookie: cookie },
  });

  if (!res.ok) throw new Error(`Download failed: ${res.status} — ${url}`);

  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

function xlsxToCsv(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
}

async function main() {
  console.log('[ACLED] Fazendo login...');
  const cookie = await login();
  console.log('[ACLED] Login OK');

  await mkdir(OUT_DIR, { recursive: true });

  const results = await Promise.allSettled(
    REGIONS.map(async ({ slug, file }) => {
      console.log(`[ACLED] Buscando link: ${slug}...`);
      const xlsxUrl = await scrapeXlsxUrl(slug, cookie);
      console.log(`[ACLED] Baixando: ${path.basename(xlsxUrl)}...`);
      const buf = await downloadXlsx(xlsxUrl, cookie);

      console.log(`[ACLED] Convertendo ${slug} → CSV...`);
      const csv = xlsxToCsv(buf);
      const rows = csv.split('\n').length - 1;

      const outPath = path.join(OUT_DIR, file);
      await writeFile(outPath, csv, 'utf-8');
      console.log(`[ACLED] ✓ ${file} (${rows} linhas)`);
      return { file, rows };
    })
  );

  const ok = results.filter(r => r.status === 'fulfilled');
  const fail = results.filter(r => r.status === 'rejected');

  console.log(`\n[ACLED] Concluído: ${ok.length}/${REGIONS.length} regiões`);
  if (fail.length > 0) {
    for (const f of fail) console.error('[ACLED] ERRO:', f.reason.message);
  }
}

main().catch(e => { console.error('[ACLED] Fatal:', e.message); process.exit(1); });
