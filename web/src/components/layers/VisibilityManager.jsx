import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useVisibilityFilter } from '../../hooks/useVisibilityFilter';

export default function VisibilityManager({ flightStateRef, vesselStateRef, satelliteStateRef, telecomExtRef }) {
  const viewer = useViewer();
  const flightsCfg    = useLayerState('flights');
  const vesselsCfg    = useLayerState('vessels');
  const satellitesCfg = useLayerState('satellites');

  useVisibilityFilter(viewer, [
    { stateRef: flightStateRef.current,                  types: flightsCfg.types,                               labelKey: 'label' },
    { stateRef: vesselStateRef.current,                  types: vesselsCfg.types,                               labelKey: 'label' },
    { stateRef: satelliteStateRef.current,                types: satellitesCfg.types,                            labelKey: 'label' },
    { stateRef: telecomExtRef.current?.stateRef ?? null,  types: telecomExtRef.current?.activeTypes ?? new Set(), labelKey: 'label' },
  ]);

  return null;
}
