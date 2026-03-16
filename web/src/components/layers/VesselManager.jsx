import { Cartesian3 } from 'cesium';
import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useVessels } from '../../hooks/useVessels';
import { useVesselLayer } from '../../hooks/useVesselLayer';
import { useSelectionHandler, useSelection } from '../../contexts/SelectionContext';
import { getSetting } from '../../providers/settingsStore';

export default function VesselManager({ vesselStateRef: externalRef, onVesselSelect, timeline }) {
  const viewer = useViewer();
  const vessels = useLayerState('vessels');
  const { startFollow, updateFollow, setLiveInterval } = useSelection();

  const liveEnabled = vessels.show && !timeline?.active;
  const liveData = useVessels(viewer, liveEnabled);
  const vesselsData = timeline?.active ? timeline.vessels : liveData;
  const { stateRef, setSelected } = useVesselLayer(viewer, vesselsData, vessels.types);

  externalRef.current = stateRef;

  useSelectionHandler('vessel', {
    match: (id) => id?.startsWith('vessel_'),
    onSelect: (id) => {
      const mmsi = id.slice(7);
      const entry = stateRef?.current?.get(mmsi);
      setSelected(mmsi);
      onVesselSelect?.(entry?.vessel ?? null);

      if (entry) {
        startFollow(Cartesian3.fromDegrees(entry.lon, entry.lat, 0));
        setLiveInterval(() => {
          const e = stateRef?.current?.get(mmsi);
          if (!e) return;
          updateFollow(Cartesian3.fromDegrees(e.lon, e.lat, 0));
          onVesselSelect?.(e.vessel ?? null);
        }, getSetting('TICK_INTERVAL_MS'));
      }
    },
    onClear: () => {
      setSelected(null);
      onVesselSelect?.(null);
    },
  });

  return null;
}
