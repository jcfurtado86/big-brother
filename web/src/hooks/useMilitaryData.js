import { fetchAllMilitary } from '../providers/militaryService';
import { useGlobalPointsData } from './useGlobalPointsData';

export function useMilitaryData(viewer, enabled = false) {
  return useGlobalPointsData(viewer, enabled, {
    fetchFn: fetchAllMilitary,
    maxAltKey: 'MILITARY_MAX_ALT',
    debounceKey: 'MILITARY_DEBOUNCE_MS',
  });
}
