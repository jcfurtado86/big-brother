// Glob import de todos os logos de companhias em src/assets/companies/
// Vite resolve os paths em build time → funciona com hash em produção.
const logos = import.meta.glob('../assets/companies/*.png', { eager: true, query: '?url', import: 'default' });

// Monta mapa IATA → URL local
const _map = {};
for (const [path, url] of Object.entries(logos)) {
  const iata = path.split('/').pop().replace('.png', '');
  _map[iata] = url;
}

// CDN fallback — Kiwi.com (64×64 PNG)
const CDN_URL = (iata) => `https://images.kiwi.com/airlines/64/${iata}.png`;

// IATAs que já falharam no CDN (evita tentar de novo)
const _failed = new Set();

/**
 * Retorna URL do logo: local se disponível, senão CDN.
 * Retorna null se já sabemos que o CDN não tem.
 */
export function getAirlineLogo(iata) {
  if (!iata) return null;
  const upper = iata.toUpperCase();
  const lower = iata.toLowerCase();

  // Logo local (bundled pelo Vite)
  if (_map[upper]) return _map[upper];
  if (_map[lower]) return _map[lower];

  // Já tentou CDN e falhou
  if (_failed.has(upper)) return null;

  // Fallback CDN
  return CDN_URL(upper);
}

/**
 * Marca um IATA como sem logo no CDN (chamar no onError da <img>).
 */
export function markLogoFailed(iata) {
  if (iata) _failed.add(iata.toUpperCase());
}
