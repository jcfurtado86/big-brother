import { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';

export function useGeoIP() {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/geoip`)
      .then((r) => r.json())
      .then(({ lat, lon }) => {
        if (lat && lon) {
          setLocation({ lat, lon });
        }
      })
      .catch(() => null);
  }, []);

  return location;
}
