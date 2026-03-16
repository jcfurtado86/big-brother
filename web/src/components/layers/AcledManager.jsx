import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useAcledData } from '../../hooks/useAcledData';
import { useAcledLayer } from '../../hooks/useAcledLayer';
import { useSelectionHandler } from '../../contexts/SelectionContext';

const emptySet = new Set();

export default function AcledManager({ onAcledSelect }) {
  const viewer = useViewer();
  const acled = useLayerState('acled');

  const activeTypes = acled.show ? acled.types : emptySet;
  const pointsMap = useAcledData(viewer, acled.show);
  const { stateRef, setSelected } = useAcledLayer(viewer, pointsMap, activeTypes);

  useSelectionHandler('acled', {
    match: (id) => id?.startsWith('acled_'),
    onSelect: (id) => {
      setSelected(id);
      const entry = stateRef?.current?.get(id);
      if (entry?._point) {
        onAcledSelect?.(entry._point);
      }
    },
    onClear: () => {
      setSelected(null);
      onAcledSelect?.(null);
    },
  });

  return null;
}
