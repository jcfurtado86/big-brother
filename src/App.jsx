import React, { useState, useEffect, useCallback } from 'react';
import Globe from './components/Globe';
import SearchBox from './components/SearchBox';
import LayerToggle from './components/LayerToggle';
import InfoBar from './components/InfoBar';
import ResetView from './components/ResetView';
import NightToggle from './components/NightToggle';
import ClockDisplay from './components/ClockDisplay';
import FlightCard from './components/FlightCard';
import FlightsToggle from './components/FlightsToggle';
import AirportToggle from './components/AirportToggle';
import { useGeoIP } from './hooks/useGeoIP';
import { layers } from './providers/layers';

const layerOptions = layers.map(({ id, label }) => ({ id, label }));

const DEFAULT_ALT   = Number(import.meta.env.VITE_DEFAULT_ALT_M    ?? 10_000_000);
const DEFAULT_PITCH = Number(import.meta.env.VITE_DEFAULT_PITCH_DEG ?? -90);

export default function App() {
  const [layerId, setLayerId] = useState('satellite');
  const [flyTarget, setFlyTarget] = useState(null);
  const [initialView, setInitialView] = useState(null);
  const [coords, setCoords] = useState({ lat: null, lon: null, alt: null });
  const [mouseCoords, setMouseCoords] = useState(null);
  const [lighting, setLighting] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [showFlights, setShowFlights] = useState(true);
  const [airportTypes, setAirportTypes] = useState(new Set(['large_airport', 'medium_airport']));
  const geoIP = useGeoIP();

  useEffect(() => {
    if (geoIP) {
      setInitialView({ lat: geoIP.lat, lon: geoIP.lon, alt: DEFAULT_ALT, pitch: DEFAULT_PITCH });
      setCoords({ lat: Number(geoIP.lat).toFixed(4), lon: Number(geoIP.lon).toFixed(4), alt: '10000' });
    }
  }, [geoIP]);

  function handleLocationSelect(lat, lon) {
    setFlyTarget({ lat, lon, ts: Date.now() });
  }

  function handleResetView() {
    setResetKey((k) => k + 1);
  }

  const handleMouseMove = useCallback((pos) => setMouseCoords(pos), []);

  return (
    <>
      <Globe
        layers={layers}
        activeLayerId={layerId}
        lighting={lighting}
        initialView={initialView}
        flyTarget={flyTarget}
        resetKey={resetKey}
        onCameraChange={setCoords}
        onMouseMove={handleMouseMove}
        onFlightSelect={setSelectedFlight}
        showFlights={showFlights}
        airportTypes={airportTypes}
      />
      <SearchBox onSelect={handleLocationSelect} />
      <LayerToggle options={layerOptions} current={layerId} onChange={setLayerId} />
      <InfoBar coords={coords} mouseCoords={mouseCoords} />
      <ClockDisplay />
      <ResetView onReset={handleResetView} />
      <NightToggle active={lighting} onToggle={() => setLighting((v) => !v)} />
      <FlightsToggle active={showFlights} onToggle={() => setShowFlights((v) => !v)} />
      <AirportToggle activeTypes={airportTypes} onChange={setAirportTypes} />
      <FlightCard flight={selectedFlight} onClose={() => setSelectedFlight(null)} />
    </>
  );
}
