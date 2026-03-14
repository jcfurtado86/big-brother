import React, { useState, useEffect, useCallback } from 'react';
import Globe from './components/Globe';
import SearchBox from './components/SearchBox';
import ControlPanel from './components/ControlPanel';
import InfoBar from './components/InfoBar';
import ResetView from './components/ResetView';
import ClockDisplay from './components/ClockDisplay';
import FlightCard from './components/FlightCard';
import AirportCard from './components/AirportCard';
import VesselCard from './components/VesselCard';
import SatelliteCard from './components/SatelliteCard';
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
  const [showWeather, setShowWeather] = useState(true);
  const [weatherOpacity, setWeatherOpacity] = useState(0);
  const [showVessels, setShowVessels] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [showSatellites, setShowSatellites] = useState(false);
  const [selectedSatellite, setSelectedSatellite] = useState(null);
  const [showAirports, setShowAirports] = useState(false);
  const [airportTypes, setAirportTypes] = useState(new Set(['large_airport', 'medium_airport']));
  const [flightTypes, setFlightTypes] = useState(new Set(['heavy', 'large', 'regional', 'light', 'helicopter', 'uav', 'military']));
  const [vesselTypes, setVesselTypes] = useState(new Set(['cargo', 'tanker', 'passenger', 'fishing', 'sailing', 'tug', 'military', 'sar']));
  const [satelliteTypes, setSatelliteTypes] = useState(new Set(['leo', 'meo', 'geo']));
  const [flightProvider, setFlightProvider] = useState('opensky');
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
        flightTypes={flightTypes}
        showAirports={showAirports}
        showWeather={showWeather}
        weatherOpacity={weatherOpacity}
        showVessels={showVessels}
        vesselTypes={vesselTypes}
        onVesselSelect={setSelectedVessel}
        showSatellites={showSatellites}
        onSatelliteSelect={setSelectedSatellite}
        satelliteTypes={satelliteTypes}
        airportTypes={airportTypes}
        flightProvider={flightProvider}
      />
      <SearchBox onSelect={handleLocationSelect} />
      <InfoBar coords={coords} mouseCoords={mouseCoords} />
      <ClockDisplay />
      <ResetView onReset={handleResetView} />
      <ControlPanel
        layerOptions={layerOptions}
        currentLayer={layerId}
        onLayerChange={setLayerId}
        lighting={lighting}
        onLightingToggle={() => setLighting((v) => !v)}
        showWeather={showWeather}
        onWeatherToggle={() => setShowWeather((v) => !v)}
        weatherOpacity={weatherOpacity}
        onWeatherOpacityChange={setWeatherOpacity}
        showFlights={showFlights}
        onFlightsToggle={() => setShowFlights((v) => !v)}
        flightTypes={flightTypes}
        onFlightTypesChange={setFlightTypes}
        showAirports={showAirports}
        onAirportsToggle={() => setShowAirports((v) => !v)}
        airportTypes={airportTypes}
        onAirportTypesChange={setAirportTypes}
        showVessels={showVessels}
        onVesselsToggle={() => setShowVessels((v) => !v)}
        vesselTypes={vesselTypes}
        onVesselTypesChange={setVesselTypes}
        showSatellites={showSatellites}
        onSatellitesToggle={() => setShowSatellites((v) => !v)}
        satelliteTypes={satelliteTypes}
        onSatelliteTypesChange={setSatelliteTypes}
        flightProvider={flightProvider}
        onFlightProviderChange={setFlightProvider}
      />
      <FlightCard flight={selectedFlight} onClose={() => setSelectedFlight(null)} flightProvider={flightProvider} />
      <AirportCard airport={selectedAirport} onClose={() => setSelectedAirport(null)} />
      <VesselCard vessel={selectedVessel} onClose={() => setSelectedVessel(null)} />
      <SatelliteCard satellite={selectedSatellite} onClose={() => setSelectedSatellite(null)} />
    </>
  );
}
