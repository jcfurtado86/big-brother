import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useAirportLayer } from '../../hooks/useAirportLayer';
import { useSelectionHandler } from '../../contexts/SelectionContext';

const emptySet = new Set();

export default function AirportManager({ bbox, onAirportSelect }) {
  const viewer = useViewer();
  const airports = useLayerState('airports');

  const effectiveTypes = airports.show ? airports.types : emptySet;
  const { airportDataRef, setSelectedAirport } = useAirportLayer(viewer, effectiveTypes, bbox);

  useSelectionHandler('airport', {
    match: (id) => id?.startsWith('apt:'),
    onSelect: (id) => {
      const icao = id.slice(4);
      setSelectedAirport(icao);
      onAirportSelect?.(airportDataRef?.current?.get(icao) ?? null);
    },
    onClear: () => {
      setSelectedAirport(null);
      onAirportSelect?.(null);
    },
  });

  return null;
}
