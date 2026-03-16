import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useMilitaryData } from '../../hooks/useMilitaryData';
import { useMilitaryLayer } from '../../hooks/useMilitaryLayer';
import { useSelectionHandler } from '../../contexts/SelectionContext';

const emptySet = new Set();

export default function MilitaryManager({ onMilitarySelect }) {
  const viewer = useViewer();
  const military = useLayerState('military');

  const activeTypes = military.show ? military.types : emptySet;
  const pointsMap = useMilitaryData(viewer, military.show);
  const { stateRef, setSelected } = useMilitaryLayer(viewer, pointsMap, activeTypes);

  useSelectionHandler('military', {
    match: (id) => id?.startsWith('mil_'),
    onSelect: (id) => {
      setSelected(id);
      const entry = stateRef?.current?.get(id);
      if (entry?._point) {
        onMilitarySelect?.(entry._point);
      }
    },
    onClear: () => {
      setSelected(null);
      onMilitarySelect?.(null);
    },
  });

  return null;
}
