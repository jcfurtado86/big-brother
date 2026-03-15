import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useSceneConfig } from '../../hooks/useSceneConfig';
import { useCamera } from '../../hooks/useCamera';
import { useMousePosition } from '../../hooks/useMousePosition';
import { useFlyToMouse } from '../../hooks/useFlyToMouse';

export default function SceneManager({ onCameraChange, onMouseMove }) {
  const viewer = useViewer();
  const env = useLayerState('environment');
  useCamera(viewer, onCameraChange);
  useSceneConfig(viewer, { lighting: env.lighting });
  useMousePosition(viewer, onMouseMove);
  useFlyToMouse(viewer);
  return null;
}
