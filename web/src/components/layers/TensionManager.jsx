import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useTensionLayer } from '../../hooks/useTensionLayer';

export default function TensionManager() {
  const viewer = useViewer();
  const tension = useLayerState('tension');
  useTensionLayer(viewer, tension.show, tension.opacity, tension.period);
  return null;
}
