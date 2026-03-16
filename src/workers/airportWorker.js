// Worker: carrega aeroportos da API, filtra por bbox/tipos e constrói
// os rótulos via OffscreenCanvas — tudo fora do thread principal.

const FONT_SIZE = 14;
const PAD_X = 5, PAD_Y = 4;
const BATCH_SIZE = 100; // aeroportos por mensagem enviada

// Contexto de medição reutilizável (evita criar OffscreenCanvas por rótulo)
const _mCanvas = new OffscreenCanvas(1, 1);
const _mctx    = _mCanvas.getContext('2d');
_mctx.font     = `${FONT_SIZE}px monospace`;

function buildLabelBitmap(text) {
  const textW = Math.ceil(_mctx.measureText(text).width);
  const W = PAD_X + textW + PAD_X;
  const H = PAD_Y + FONT_SIZE + 4 + PAD_Y;

  const canvas = new OffscreenCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  if (typeof ctx.roundRect === 'function') ctx.roundRect(0, 0, W, H, 3);
  else ctx.rect(0, 0, W, H);
  ctx.fill();

  ctx.font         = `${FONT_SIZE}px monospace`;
  ctx.fillStyle    = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, PAD_X, H / 2);

  return { bitmap: canvas.transferToImageBitmap(), W, H };
}

function inBbox(lat, lon, bbox) {
  if (!bbox) return true;
  return lat >= bbox.south && lat <= bbox.north &&
         lon >= bbox.west  && lon <= bbox.east;
}

let _airports    = null;
let _currentGen  = -1;
let _apiUrl      = '';

self.onmessage = async ({ data }) => {
  // ── Carrega aeroportos da API ────────────────────────────────────────────
  if (data.type === 'init') {
    _apiUrl = data.apiUrl || '';
    try {
      const res = await fetch(`${_apiUrl}/api/airports?bbox=-90,-180,90,180`);
      const rows = await res.json();
      // Normalize field names from API (snake_case → camelCase)
      _airports = rows.map(r => ({
        icao: r.icao_code || r.ident || '',
        iata: r.iata_code || '',
        type: r.type || '',
        name: r.name || '',
        city: r.municipality || '',
        country: r.iso_country || '',
        lat: r.lat,
        lon: r.lon,
      }));
      self.postMessage({ type: 'ready', count: _airports.length });
    } catch (e) {
      self.postMessage({ type: 'error', message: String(e) });
    }
    return;
  }

  // ── Novo filtro de viewport ────────────────────────────────────────────────
  if (data.type === 'update') {
    const { bbox, activeTypes, gen } = data;
    _currentGen = gen;
    if (!_airports) return;

    const active   = new Set(activeTypes);
    const filtered = _airports.filter(ap => active.has(ap.type) && inBbox(ap.lat, ap.lon, bbox));

    if (filtered.length === 0) {
      self.postMessage({ type: 'batch', results: [], gen, done: true });
      return;
    }

    for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
      // Cancela se chegou pedido mais novo
      if (_currentGen !== gen) return;

      const batch       = filtered.slice(i, i + BATCH_SIZE);
      const results     = [];
      const transferables = [];

      for (const ap of batch) {
        const text = ap.iata || ap.icao || ap.name.slice(0, 10);
        const { bitmap, W, H } = buildLabelBitmap(text);
        results.push({
          icao:        ap.icao,
          iata:        ap.iata || '',
          type:        ap.type,
          name:        ap.name || '',
          city:        ap.city || '',
          country:     ap.country || '',
          lat:         ap.lat,
          lon:         ap.lon,
          labelBitmap: bitmap,
          labelW:      W,
          labelH:      H,
        });
        transferables.push(bitmap);
      }

      self.postMessage(
        { type: 'batch', results, gen, done: i + BATCH_SIZE >= filtered.length },
        transferables
      );

      // Cede o event loop do Worker para processar possíveis novos 'update'
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
};
