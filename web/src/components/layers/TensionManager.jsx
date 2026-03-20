import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useTimeline } from '../../contexts/TimelineContext';
import { useTensionLayer } from '../../hooks/useTensionLayer';

export default function TensionManager() {
  const viewer = useViewer();
  const tension = useLayerState('tension');
  const tl = useTimeline();

  // When timeline is active, use playback date; otherwise null (API defaults to now)
  const refDate = tl.active ? new Date(tl.currentTime).toISOString() : null;

  useTensionLayer(viewer, tension.show, tension.opacity, tension.period, refDate);
  return null;
}
