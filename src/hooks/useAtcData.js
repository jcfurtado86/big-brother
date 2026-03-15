import { fetchAllAtc } from '../providers/atcService';
import { useGlobalPointsData } from './useGlobalPointsData';

export function useAtcData(viewer, enabled = false) {
  return useGlobalPointsData(viewer, enabled, {
    fetchFn: fetchAllAtc,
    maxAltKey: 'ATC_MAX_ALT',
    debounceKey: 'ATC_DEBOUNCE_MS',
  });
}
