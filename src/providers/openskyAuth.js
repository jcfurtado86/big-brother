const CLIENT_ID     = import.meta.env.VITE_OPENSKY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_OPENSKY_CLIENT_SECRET;

export const HAS_AUTH = !!(CLIENT_ID && CLIENT_SECRET);

let cachedToken    = null;
let tokenExpiresAt = 0;

export async function getOpenSkyToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const res = await fetch('/api/skyauth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token error: ${res.status}`);
  const data = await res.json();
  cachedToken    = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

export function invalidateToken() {
  cachedToken = null;
}

export async function openskyHeaders() {
  if (!HAS_AUTH) return {};
  return { Authorization: `Bearer ${await getOpenSkyToken()}` };
}
