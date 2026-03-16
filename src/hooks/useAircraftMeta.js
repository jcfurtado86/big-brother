import { useState, useEffect } from 'react';
import { lookupAircraft, cacheAircraft } from '../providers/aircraftDb';
import { getProvider } from '../providers/flightProviders';

export function useAircraftMeta(icao24, providerName = 'opensky', flight = null) {
  const cached = icao24 ? lookupAircraft(icao24) : null;
  const [meta, setMeta] = useState(cached);

  useEffect(() => {
    if (!icao24) { setMeta(null); return; }

    // Inline metadata from flight data (e.g. Airplanes.live includes it in poll response)
    if (flight?._meta) {
      console.log(`[aircraft-meta] inline meta for ${icao24}`, flight._meta);
      cacheAircraft(icao24, flight._meta);
      setMeta(flight._meta);
      return;
    }

    // Check cache first
    const local = lookupAircraft(icao24);
    if (local) {
      console.log(`[aircraft-meta] cache hit for ${icao24}`);
      setMeta(local);
      return;
    }

    // Fetch from API
    console.log(`[aircraft-meta] fetching from API for ${icao24}`);
    let cancelled = false;
    getProvider(providerName).fetchAircraftMeta(icao24).then(data => {
      if (cancelled) return;
      if (data) cacheAircraft(icao24, data);
      setMeta(data);
    });
    return () => { cancelled = true; };
  }, [icao24]);

  return meta;
}
