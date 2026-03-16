import { useMemo, useRef } from 'react';
import { Cartesian3 } from 'cesium';
import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useVessels } from '../../hooks/useVessels';
import { useVesselLayer } from '../../hooks/useVesselLayer';
import { useSelectionHandler, useSelection } from '../../contexts/SelectionContext';
import { getSetting } from '../../providers/settingsStore';

export default function VesselManager({ bbox, vesselStateRef: externalRef, onVesselSelect, timeline }) {
  const viewer = useViewer();
  const vessels = useLayerState('vessels');
  const { startFollow, updateFollow, setLiveInterval } = useSelection();
  const selectedMmsiRef = useRef(null);

  const liveEnabled = vessels.show && !timeline?.active;
  const liveData = useVessels(viewer, liveEnabled);
  const allVessels = timeline?.active ? (vessels.show ? timeline.vessels : new Map()) : liveData;

  // Filter vessels to viewport bbox (with padding)
  const vesselsData = useMemo(() => {
    if (!bbox || !timeline?.active) return allVessels;
    const pad = 5;
    const s = bbox.south - pad, n = bbox.north + pad;
    const w = bbox.west - pad, e = bbox.east + pad;
    const filtered = new Map();
    for (const [mmsi, v] of allVessels) {
      if ((v.lat >= s && v.lat <= n && v.lon >= w && v.lon <= e) || mmsi === selectedMmsiRef.current) {
        filtered.set(mmsi, v);
      }
    }
    return filtered;
  }, [allVessels, bbox, timeline?.active]);

  const { stateRef, setSelected } = useVesselLayer(viewer, vesselsData, vessels.types);

  externalRef.current = stateRef;

  useSelectionHandler('vessel', {
    match: (id) => id?.startsWith('vessel_'),
    onSelect: (id) => {
      const mmsi = id.slice(7);
      selectedMmsiRef.current = mmsi;
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
      selectedMmsiRef.current = null;
      setSelected(null);
      onVesselSelect?.(null);
    },
  });

  return null;
}
