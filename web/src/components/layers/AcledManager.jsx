import { useMemo } from 'react';
import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useTimeline } from '../../contexts/TimelineContext';
import { useAcledData } from '../../hooks/useAcledData';
import { useAcledLayer } from '../../hooks/useAcledLayer';
import { useSelectionHandler } from '../../contexts/SelectionContext';

const emptySet = new Set();

export default function AcledManager({ onAcledSelect }) {
  const viewer = useViewer();
  const acled = useLayerState('acled');
  const tl = useTimeline();

  const activeTypes = acled.show ? acled.types : emptySet;
  const periodDays = parseInt(acled.period, 10) || 7;

  // When timeline active, compute absolute 'from' date = timeline start - period
  const fetchOpts = useMemo(() => {
    if (!tl.active || !tl.timeRange) return { period: acled.period };
    const d = new Date(tl.timeRange.start);
    d.setUTCDate(d.getUTCDate() - periodDays);
    return { from: d.toISOString().slice(0, 10) };
  }, [tl.active, tl.timeRange, acled.period, periodDays]);

  const allPoints = useAcledData(viewer, acled.show, fetchOpts);

  // During timeline, filter events by period relative to the current playback date
  const tlDay = tl.active ? new Date(tl.currentTime).toISOString().slice(0, 10) : null;
  const pointsMap = useMemo(() => {
    if (!tlDay) return allPoints;
    // Compute lower bound: tlDay minus period days
    const d = new Date(tlDay + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - periodDays);
    const minDay = d.toISOString().slice(0, 10);
    const filtered = new Map();
    for (const [id, p] of allPoints) {
      const pDay = p.date?.slice(0, 10) || '';
      if (pDay >= minDay && pDay <= tlDay) filtered.set(id, p);
    }
    return filtered;
  }, [allPoints, tlDay, periodDays]);

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
