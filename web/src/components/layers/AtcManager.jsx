import { useMemo } from 'react';
import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useAtcData } from '../../hooks/useAtcData';
import { useAtcLayer } from '../../hooks/useAtcLayer';
import { useSelectionHandler } from '../../contexts/SelectionContext';

const emptySet = new Set();

export default function AtcManager({ onAtcSelect }) {
  const viewer = useViewer();
  const atc = useLayerState('atc');

  const activeTypes = atc.show ? atc.types : emptySet;
  const pointsMap = useAtcData(viewer, atc.show);
  const { stateRef, setSelected } = useAtcLayer(viewer, pointsMap, activeTypes);

  useSelectionHandler('atc', {
    match: (id) => id?.startsWith('atc_'),
    onSelect: (id) => {
      setSelected(id);
      const entry = stateRef?.current?.get(id);
      if (entry?._point) {
        onAtcSelect?.(entry._point);
      }
    },
    onClear: () => {
      setSelected(null);
      onAtcSelect?.(null);
    },
  });

  return null;
}
