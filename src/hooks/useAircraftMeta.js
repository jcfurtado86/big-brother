import { useState, useEffect } from 'react';
import { lookupAircraft, isDbReady, preloadAircraftDb } from '../providers/aircraftDb';
import { getProvider } from '../providers/flightProviders';

// Cache persistente entre renders e remontagens do componente
const _cache = new Map();

// Inicia o carregamento do DB assim que o módulo é importado
preloadAircraftDb().catch(() => {
  // DB local indisponível — fallback para API por aeronave
});

export function useAircraftMeta(icao24, providerName = 'opensky', flight = null) {
  const cached = icao24 ? _cache.get(icao24) : undefined;
  const [meta, setMeta] = useState(cached ?? null);

  useEffect(() => {
    if (!icao24) { setMeta(null); return; }

    // Inline metadata from flight data (e.g. Airplanes.live includes it in poll response)
    if (flight?._meta) {
      _cache.set(icao24, flight._meta);
      setMeta(flight._meta);
      return;
    }

    // Sempre tenta o DB local primeiro (pode ter carregado desde o último cache)
    const local = lookupAircraft(icao24);
    if (local) {
      _cache.set(icao24, local);
      setMeta(local);
      return;
    }

    // Se cache existe (de API anterior), usa enquanto aguarda DB
    if (_cache.has(icao24)) { setMeta(_cache.get(icao24)); return; }

    // DB loaded but icao24 not found — no point calling the API
    if (isDbReady()) return;

    // Fallback: API por aeronave (enquanto DB local não carregou)
    let cancelled = false;
    getProvider(providerName).fetchAircraftMeta(icao24).then(data => {
      if (cancelled) return;
      if (data) _cache.set(icao24, data);
      setMeta(data);
    });
    return () => { cancelled = true; };
  }, [icao24]);

  return meta;
}
