import { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';

export function useGeoIP() {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    console.log('[geoip] Fetching location from API...');
    fetch(`${API_URL}/api/geoip`)
      .then((r) => r.json())
      .then(({ lat, lon }) => {
        if (lat && lon) {
          console.log(`[geoip] Location: ${lat.toFixed(2)}, ${lon.toFixed(2)}`);
          setLocation({ lat, lon });
        }
      })
      .catch(() => null);
  }, []);

  return location;
}
