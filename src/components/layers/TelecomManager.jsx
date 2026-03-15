import { useMemo } from 'react';
import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useTelecom } from '../../hooks/useTelecom';
import { useTelecomLayer } from '../../hooks/useTelecomLayer';
import { useSelectionHandler } from '../../contexts/SelectionContext';

const emptySet = new Set();

export default function TelecomManager({ cameraAltitude, telecomStateRef: externalRef, onTelecomSelect }) {
  const viewer = useViewer();
  const telecom = useLayerState('telecom');

  const showDC   = cameraAltitude < 800_000;
  const showMast = cameraAltitude < 100_000;
  const effectiveTelecomTypes = useMemo(() => {
    const types = new Set();
    for (const t of telecom.types) {
      if (t === 'comm_line') types.add(t);
      else if (t === 'data_center' && showDC) types.add(t);
      else if (t === 'mast' && showMast) types.add(t);
    }
    return types;
  }, [telecom.types, showDC, showMast]);

  const activeTelecomTypes = telecom.show ? effectiveTelecomTypes : emptySet;
  const { pointsMap: telecomPoints, lines: telecomLines } = useTelecom(viewer, telecom.show);
  const { stateRef: telecomStateRef, setSelected } = useTelecomLayer(viewer, telecomPoints, telecomLines, activeTelecomTypes);

  externalRef.current = { stateRef: telecomStateRef, activeTypes: activeTelecomTypes };

  useSelectionHandler('telecom', {
    match: (id) => id?.startsWith('telecom_'),
    onSelect: (id) => {
      const telecomId = id.slice(8);
      setSelected(telecomId);
      const entry = telecomStateRef?.current?.get(telecomId);
      if (entry?._point) {
        onTelecomSelect?.({
          ...entry._point,
          category: entry._category,
        });
      }
    },
    onClear: () => {
      setSelected(null);
      onTelecomSelect?.(null);
    },
  });

  return null;
}
