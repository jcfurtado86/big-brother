import React, { useState } from 'react';
import Globe from './components/Globe';
import SearchBox from './components/SearchBox';
import LayerToggle from './components/LayerToggle';
import InfoBar from './components/InfoBar';
import { imageryProviders, layerOptions } from './providers/imagery';

export default function App() {
  const [layerId, setLayerId] = useState('satellite');
  const [flyTarget, setFlyTarget] = useState(null);
  const [coords, setCoords] = useState({ lat: null, lon: null, alt: null });

  function handleLocationSelect(lat, lon) {
    setFlyTarget({ lat, lon, ts: Date.now() });
  }

  return (
    <>
      <Globe
        imageryProvider={imageryProviders[layerId]}
        flyTarget={flyTarget}
        onCameraChange={setCoords}
      />
      <SearchBox onSelect={handleLocationSelect} />
      <LayerToggle options={layerOptions} current={layerId} onChange={setLayerId} />
      <InfoBar coords={coords} />
    </>
  );
}
