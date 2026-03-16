import { useCallback } from 'react';
import { fetchAllAcled } from '../providers/acledService';
import { useGlobalPointsData } from './useGlobalPointsData';

export function useAcledData(viewer, enabled = false, { period = '7d', from } = {}) {
  const fetchFn = useCallback(
    (bbox, signal) => fetchAllAcled(bbox, signal, { period, from }),
    [period, from],
  );

  return useGlobalPointsData(viewer, enabled, {
    fetchFn,
    maxAltKey: 'ACLED_MAX_ALT',
    debounceKey: 'ACLED_DEBOUNCE_MS',
  });
}
