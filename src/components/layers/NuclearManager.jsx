import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useNuclearData } from '../../hooks/useNuclearData';
import { useNuclearLayer } from '../../hooks/useNuclearLayer';
import { useSelectionHandler } from '../../contexts/SelectionContext';

const emptySet = new Set();

export default function NuclearManager({ onNuclearSelect }) {
  const viewer = useViewer();
  const nuclear = useLayerState('nuclear');

  const activeTypes = nuclear.show ? nuclear.types : emptySet;
  const pointsMap = useNuclearData(nuclear.show);
  const { stateRef, setSelected } = useNuclearLayer(viewer, pointsMap, activeTypes);

  useSelectionHandler('nuclear', {
    match: (id) => id?.startsWith('nuc_'),
    onSelect: (id) => {
      setSelected(id);
      const entry = stateRef?.current?.get(id);
      if (entry?._point) {
        onNuclearSelect?.(entry._point);
      }
    },
    onClear: () => {
      setSelected(null);
      onNuclearSelect?.(null);
    },
  });

  return null;
}
