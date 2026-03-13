import { useState, useEffect } from 'react';

export function useGeoIP() {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    fetch('/api/geoip')
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
