// Calculos geograficos puros — sem dependencias de framework.

const R = 6371000; // raio medio da Terra em metros

/**
 * Projeta uma posicao geografica para frente usando rumo e velocidade.
 * @param {number} lat      - latitude atual em graus
 * @param {number} lon      - longitude atual em graus
 * @param {number} heading  - rumo em graus (0 = norte, 90 = leste)
 * @param {number} velocity - velocidade em m/s
 * @param {number} dtMs     - delta de tempo em milissegundos
 * @returns {{ lat: number, lon: number }}
 */
export function deadReckon(lat, lon, heading, velocity, dtMs) {
  const dt = dtMs / 1000;
  const d  = velocity * dt;
  if (d === 0) return { lat, lon };

  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const φ1 = toRad(lat);
  const λ1 = toRad(lon);
  const θ  = toRad(heading);
  const δ  = d / R;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );

  return { lat: toDeg(φ2), lon: toDeg(λ2) };
}
