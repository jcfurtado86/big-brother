import React, { useState } from 'react';
import Globe from './components/Globe';
import SearchBox from './components/SearchBox';
import LayerToggle from './components/LayerToggle';
import InfoBar from './components/InfoBar';

export default function App() {
  const [layer, setLayer] = useState('satellite');
  const [flyTarget, setFlyTarget] = useState(null);
  const [coords, setCoords] = useState({ lat: null, lon: null, alt: null });

  function handleLocationSelect(lat, lon) {
    setFlyTarget({ lat, lon, ts: Date.now() });
  }

  return (
    <>
      <Globe
        layer={layer}
        flyTarget={flyTarget}
        onCameraChange={setCoords}
      />
      <SearchBox onSelect={handleLocationSelect} />
      <LayerToggle current={layer} onChange={setLayer} />
      <InfoBar coords={coords} />
    </>
  );
}
