import { useRef } from 'react';
import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useAirspaceData } from '../../hooks/useAirspaceData';
import { useAirspaceLayer } from '../../hooks/useAirspaceLayer';
import { useSelectionHandler } from '../../contexts/SelectionContext';

const emptySet = new Set();

export default function AirspaceManager({ onAirspaceSelect }) {
  const viewer = useViewer();
  const airspace = useLayerState('airspace');
  const selectedIdRef = useRef(null);

  const activeTypes = airspace.show ? airspace.types : emptySet;
  const zonesMap = useAirspaceData(viewer, airspace.show);
  const { stateRef, setSelected } = useAirspaceLayer(viewer, zonesMap, activeTypes, airspace.opacity);

  useSelectionHandler('airspace', {
    match: (id) => id?.startsWith('asp_'),
    onSelect: (id) => {
      // Toggle: click same polygon again → deselect
      // Note: clearAll() calls onClear before onSelect, but we keep
      // selectedIdRef intact in onClear so we can detect re-click here
      if (id === selectedIdRef.current) {
        selectedIdRef.current = null;
        setSelected(null);
        onAirspaceSelect?.(null);
        return;
      }
      selectedIdRef.current = id;
      setSelected(id);
      const entry = stateRef?.current?.get(id);
      onAirspaceSelect?.(entry?.zone ?? null);
    },
    onClear: () => {
      // Don't reset selectedIdRef here — onSelect needs it for toggle detection
      setSelected(null);
      onAirspaceSelect?.(null);
    },
  });

  return null;
}
