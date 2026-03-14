import React, { useState, useEffect, useCallback } from 'react';
import Globe from './components/Globe';
import SearchBox from './components/SearchBox';
import LayerToggle from './components/LayerToggle';
import InfoBar from './components/InfoBar';
import ResetView from './components/ResetView';
import NightToggle from './components/NightToggle';
import ClockDisplay from './components/ClockDisplay';
import FlightCard from './components/FlightCard';
import AirportCard from './components/AirportCard';
import FlightsToggle from './components/FlightsToggle';
import AirportToggle from './components/AirportToggle';
import WeatherToggle from './components/WeatherToggle';
import VesselToggle from './components/VesselToggle';
import VesselCard from './components/VesselCard';
import { useGeoIP } from './hooks/useGeoIP';
import { layers } from './providers/layers';
import { DEFAULT_ALT, DEFAULT_PITCH } from './providers/constants';

const layerOptions = layers.map(({ id, label }) => ({ id, label }));

export default function App() {
  const [layerId, setLayerId] = useState('satellite');
  const [flyTarget, setFlyTarget] = useState(null);
  const [initialView, setInitialView] = useState(null);
  const [coords, setCoords] = useState({ lat: null, lon: null, alt: null });
  const [mouseCoords, setMouseCoords] = useState(null);
  const [lighting, setLighting] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [showFlights, setShowFlights] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showVessels, setShowVessels] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [airportTypes, setAirportTypes] = useState(new Set());
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
        onAirportSelect={setSelectedAirport}
        showFlights={showFlights}
        showWeather={showWeather}
        showVessels={showVessels}
        onVesselSelect={setSelectedVessel}
        airportTypes={airportTypes}
      />
      <SearchBox onSelect={handleLocationSelect} />
      <LayerToggle options={layerOptions} current={layerId} onChange={setLayerId} />
      <InfoBar coords={coords} mouseCoords={mouseCoords} />
      <ClockDisplay />
      <ResetView onReset={handleResetView} />
      <NightToggle active={lighting} onToggle={() => setLighting((v) => !v)} />
      <FlightsToggle active={showFlights} onToggle={() => setShowFlights((v) => !v)} />
      <WeatherToggle active={showWeather} onToggle={() => setShowWeather((v) => !v)} />
      <AirportToggle activeTypes={airportTypes} onChange={setAirportTypes} />
      <VesselToggle active={showVessels} onToggle={() => setShowVessels((v) => !v)} />
      <FlightCard flight={selectedFlight} onClose={() => setSelectedFlight(null)} />
      <AirportCard airport={selectedAirport} onClose={() => setSelectedAirport(null)} />
      <VesselCard vessel={selectedVessel} onClose={() => setSelectedVessel(null)} />
    </>
  );
}
