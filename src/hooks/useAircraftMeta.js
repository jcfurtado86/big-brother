import { useState, useEffect } from 'react';
import { lookupAircraft, preloadAircraftDb } from '../providers/aircraftDb';
import { fetchAircraftMeta } from '../providers/flightService';

// Cache persistente entre renders e remontagens do componente
const _cache = new Map();

// Inicia o carregamento do DB assim que o módulo é importado
preloadAircraftDb().catch(() => {
  // DB local indisponível — fallback para API por aeronave
});

export function useAircraftMeta(icao24) {
  const cached = icao24 ? _cache.get(icao24) : undefined;
  const [meta, setMeta] = useState(cached ?? null);

  useEffect(() => {
    if (!icao24) { setMeta(null); return; }

    // Sempre tenta o DB local primeiro (pode ter carregado desde o último cache)
    const local = lookupAircraft(icao24);
    if (local) {
      _cache.set(icao24, local);
      setMeta(local);
      return;
    }

    // Se cache existe (de API anterior), usa enquanto aguarda DB
    if (_cache.has(icao24)) { setMeta(_cache.get(icao24)); return; }

    // Fallback: API por aeronave (enquanto DB local não carregou ou icao24 ausente)
    let cancelled = false;
    fetchAircraftMeta(icao24).then(data => {
      if (cancelled) return;
      if (data) _cache.set(icao24, data);
      setMeta(data);
    });
    return () => { cancelled = true; };
  }, [icao24]);

  return meta;
}
