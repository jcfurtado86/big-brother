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
import TelecomCard from './components/TelecomCard';
import ReceiverCard from './components/ReceiverCard';
import AtcCard from './components/AtcCard';
import MilitaryCard from './components/MilitaryCard';
import NuclearCard from './components/NuclearCard';
import AirspaceCard from './components/AirspaceCard';
import AcledCard from './components/AcledCard';
import WebcamCard from './components/WebcamCard';
import SettingsPanel from './components/SettingsPanel';
import TimelineBar from './components/TimelineBar';
import TimelineActivator from './components/TimelineActivator';
import LoadingSpinner from './components/LoadingSpinner';
import { LayerProvider } from './contexts/LayerContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { TimelineProvider } from './contexts/TimelineContext';
import { useGeoIP } from './hooks/useGeoIP';
import { DEFAULT_ALT, DEFAULT_PITCH } from './providers/constants';

export default function App() {
  const [flyTarget, setFlyTarget] = useState(null);
  const [initialView, setInitialView] = useState(null);
  const [coords, setCoords] = useState({ lat: null, lon: null, alt: null });
  const [mouseCoords, setMouseCoords] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [selectedSatellite, setSelectedSatellite] = useState(null);
  const [selectedTelecom, setSelectedTelecom] = useState(null);
  const [selectedReceiver, setSelectedReceiver] = useState(null);
  const [selectedAtc, setSelectedAtc] = useState(null);
  const [selectedMilitary, setSelectedMilitary] = useState(null);
  const [selectedNuclear, setSelectedNuclear] = useState(null);
  const [selectedAirspace, setSelectedAirspace] = useState(null);
  const [selectedAcled, setSelectedAcled] = useState(null);
  const [selectedWebcam, setSelectedWebcam] = useState(null);
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
    <LoadingProvider>
    <TimelineProvider>
    <LayerProvider>
      <Globe
        initialView={initialView}
        flyTarget={flyTarget}
        resetKey={resetKey}
        onCameraChange={setCoords}
        onMouseMove={handleMouseMove}
        onFlightSelect={setSelectedFlight}
        onAirportSelect={setSelectedAirport}
        onVesselSelect={setSelectedVessel}
        onSatelliteSelect={setSelectedSatellite}
        onTelecomSelect={setSelectedTelecom}
        onReceiverSelect={setSelectedReceiver}
        onAtcSelect={setSelectedAtc}
        onMilitarySelect={setSelectedMilitary}
        onNuclearSelect={setSelectedNuclear}
        onAirspaceSelect={setSelectedAirspace}
        onAcledSelect={setSelectedAcled}
        onWebcamSelect={setSelectedWebcam}
      />
      <SearchBox onSelect={handleLocationSelect} />
      <InfoBar coords={coords} mouseCoords={mouseCoords} />
      <ClockDisplay />
      <ResetView onReset={handleResetView} />
      <ControlPanel />
      <FlightCard flight={selectedFlight} onClose={() => setSelectedFlight(null)} />
      <AirportCard airport={selectedAirport} onClose={() => setSelectedAirport(null)} />
      <VesselCard vessel={selectedVessel} onClose={() => setSelectedVessel(null)} />
      <SatelliteCard satellite={selectedSatellite} onClose={() => setSelectedSatellite(null)} />
      <TelecomCard telecom={selectedTelecom} onClose={() => setSelectedTelecom(null)} />
      <ReceiverCard receiver={selectedReceiver} onClose={() => setSelectedReceiver(null)} />
      <AtcCard atc={selectedAtc} onClose={() => setSelectedAtc(null)} />
      <MilitaryCard military={selectedMilitary} onClose={() => setSelectedMilitary(null)} />
      <NuclearCard nuclear={selectedNuclear} onClose={() => setSelectedNuclear(null)} />
      <AirspaceCard airspace={selectedAirspace} onClose={() => setSelectedAirspace(null)} />
      <AcledCard acled={selectedAcled} onClose={() => setSelectedAcled(null)} />
      <WebcamCard key={selectedWebcam?.id} webcam={selectedWebcam} onClose={() => setSelectedWebcam(null)} />
      <SettingsPanel />
      <TimelineActivator />
      <TimelineBar />
      <LoadingSpinner />
    </LayerProvider>
    </TimelineProvider>
    </LoadingProvider>
  );
}
