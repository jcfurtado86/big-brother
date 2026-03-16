import { Cartesian3 } from 'cesium';
import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useSatellites } from '../../hooks/useSatellites';
import { useSatelliteLayer } from '../../hooks/useSatelliteLayer';
import { useSelectionHandler, useSelection } from '../../contexts/SelectionContext';
import { getSetting } from '../../providers/settingsStore';
import { parseTLEOrbitalElements } from '../../providers/satelliteService';

export default function SatelliteManager({ satelliteStateRef: externalRef, onSatelliteSelect }) {
  const viewer = useViewer();
  const satellites = useLayerState('satellites');
  const { startFollow, updateFollow, setLiveInterval } = useSelection();

  const satellitesMap = useSatellites(satellites.show);
  const { stateRef, setSelected } = useSatelliteLayer(viewer, satellitesMap, satellites.types);

  externalRef.current = stateRef;

  useSelectionHandler('satellite', {
    match: (id) => id?.startsWith('sat_'),
    onSelect: (id) => {
      const noradId = id.slice(4);
      const entry = stateRef?.current?.get(noradId);
      const orbital = entry?.tle ? parseTLEOrbitalElements(entry.tle) : null;
      const satData = entry ? {
        name: entry._name, noradId,
        lat: entry.lat, lon: entry.lon,
        alt: entry.alt, velocity: entry.velocity,
        ...orbital,
      } : null;

      setSelected(noradId);
      onSatelliteSelect?.(satData);

      if (entry) {
        const altM = (entry.alt ?? 400) * 1000;
        startFollow(Cartesian3.fromDegrees(entry.lon, entry.lat, altM));
        setLiveInterval(() => {
          const e = stateRef?.current?.get(noradId);
          if (!e) return;
          updateFollow(Cartesian3.fromDegrees(e.lon, e.lat, (e.alt ?? 400) * 1000));
          onSatelliteSelect?.({
            name: e._name, noradId,
            lat: e.lat, lon: e.lon,
            alt: e.alt, velocity: e.velocity,
            ...orbital,
          });
        }, getSetting('TICK_INTERVAL_MS'));
      }
    },
    onClear: () => {
      setSelected(null);
      onSatelliteSelect?.(null);
    },
  });

  return null;
}
