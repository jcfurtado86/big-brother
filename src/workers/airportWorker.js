// Worker: carrega airports.json, filtra por bbox/tipos e constrói
// os rótulos via OffscreenCanvas — tudo fora do thread principal.

const FONT_SIZE = 11;
const PAD_X = 4, PAD_Y = 3;
const BATCH_SIZE = 100; // aeroportos por mensagem enviada

// Contexto de medição reutilizável (evita criar OffscreenCanvas por rótulo)
const _mCanvas = new OffscreenCanvas(1, 1);
const _mctx    = _mCanvas.getContext('2d');
_mctx.font     = `${FONT_SIZE}px monospace`;

function buildLabelBitmap(text) {
  const textW = Math.ceil(_mctx.measureText(text).width);
  const W = PAD_X + textW + PAD_X;
  const H = PAD_Y + FONT_SIZE + PAD_Y;

  const canvas = new OffscreenCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  if (typeof ctx.roundRect === 'function') ctx.roundRect(0, 0, W, H, 3);
  else ctx.rect(0, 0, W, H);
  ctx.fill();

  ctx.font          = `${FONT_SIZE}px monospace`;
  ctx.fillStyle     = '#fff';
  ctx.textBaseline  = 'middle';
  ctx.fillText(text, PAD_X, H / 2);

  return { bitmap: canvas.transferToImageBitmap(), W, H };
}

function inBbox(ap, bbox) {
  if (!bbox) return true;
  return ap.lat >= bbox.south && ap.lat <= bbox.north &&
         ap.lon >= bbox.west  && ap.lon <= bbox.east;
}

let _airports    = null;
let _currentGen  = -1;

self.onmessage = async ({ data }) => {
  // ── Carrega airports.json ──────────────────────────────────────────────────
  if (data.type === 'init') {
    try {
      const res = await fetch('/airports.json');
      _airports = await res.json();
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
    const filtered = _airports.filter(ap => active.has(ap.type) && inBbox(ap, bbox));

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
        const text = ap.icao || ap.iata || ap.name.slice(0, 10);
        const { bitmap, W, H } = buildLabelBitmap(text);
        results.push({
          icao:        ap.icao,
          type:        ap.type,
          lat:         ap.lat,
          lon:         ap.lon,
          text,
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
