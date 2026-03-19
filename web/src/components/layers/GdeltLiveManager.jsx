import { useMemo } from 'react';
import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useGdeltLive } from '../../hooks/useGdeltLive';
import { useGdeltLayer } from '../../hooks/useGdeltLayer';
import { useSelectionHandler } from '../../contexts/SelectionContext';

const emptySet = new Set();

export default function GdeltLiveManager({ onGdeltSelect }) {
  const viewer = useViewer();
  const gdelt = useLayerState('gdelt');

  const activeTypes = gdelt.show ? gdelt.types : emptySet;
  const { points, newIds } = useGdeltLive(gdelt.show);

  // Filter by active types
  const filteredPoints = useMemo(() => {
    if (!gdelt.show) return new Map();
    const filtered = new Map();
    for (const [id, p] of points) {
      if (activeTypes.has(p.category)) {
        filtered.set(id, p);
      }
    }
    return filtered;
  }, [points, activeTypes, gdelt.show]);

  const { stateRef, setSelected } = useGdeltLayer(viewer, filteredPoints, activeTypes);

  useSelectionHandler('gdelt', {
    match: (id) => id?.startsWith('gdelt_'),
    onSelect: (id) => {
      setSelected(id);
      const entry = stateRef?.current?.get(id);
      if (entry?._point) {
        onGdeltSelect?.(entry._point);
      }
    },
    onClear: () => {
      setSelected(null);
      onGdeltSelect?.(null);
    },
  });

  return null;
}
