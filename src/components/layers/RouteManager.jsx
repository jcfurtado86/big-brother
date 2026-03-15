import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useSeaRouteLayer } from '../../hooks/useSeaRouteLayer';
import { useAirRouteLayer } from '../../hooks/useAirRouteLayer';

export default function RouteManager({ bbox }) {
  const viewer = useViewer();
  const airRoutes = useLayerState('airRoutes');
  const seaRoutes = useLayerState('seaRoutes');
  useSeaRouteLayer(viewer, seaRoutes.show, seaRoutes.types);
  useAirRouteLayer(viewer, airRoutes.show, bbox, airRoutes.types);
  return null;
}
