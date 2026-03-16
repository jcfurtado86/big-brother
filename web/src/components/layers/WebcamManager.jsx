import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useWebcamData } from '../../hooks/useWebcamData';
import { useWebcamLayer } from '../../hooks/useWebcamLayer';
import { useSelectionHandler } from '../../contexts/SelectionContext';

const emptySet = new Set();

export default function WebcamManager({ onWebcamSelect }) {
  const viewer = useViewer();
  const webcams = useLayerState('webcams');

  const activeTypes = webcams.show ? webcams.types : emptySet;
  const pointsMap = useWebcamData(viewer, webcams.show, webcams.provider);
  const { stateRef, setSelected } = useWebcamLayer(viewer, pointsMap, activeTypes);

  useSelectionHandler('webcams', {
    match: (id) => id?.startsWith('webcam_'),
    onSelect: (id) => {
      setSelected(id);
      const entry = stateRef?.current?.get(id);
      if (entry?._point) {
        onWebcamSelect?.(entry._point);
      }
    },
    onClear: () => {
      setSelected(null);
      onWebcamSelect?.(null);
    },
  });

  return null;
}
