import { fetchAllAcled } from '../providers/acledService';
import { useGlobalPointsData } from './useGlobalPointsData';

export function useAcledData(viewer, enabled = false) {
  return useGlobalPointsData(viewer, enabled, {
    fetchFn: fetchAllAcled,
    maxAltKey: 'ACLED_MAX_ALT',
    debounceKey: 'ACLED_DEBOUNCE_MS',
  });
}
