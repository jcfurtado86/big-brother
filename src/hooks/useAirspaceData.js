import { useGlobalPointsData } from './useGlobalPointsData';
import { fetchAllAirspaces } from '../providers/airspaceService';

export function useAirspaceData(viewer, enabled = false) {
  return useGlobalPointsData(viewer, enabled, {
    fetchFn: fetchAllAirspaces,
    maxAltKey: 'AIRSPACE_MAX_ALT',
    debounceKey: 'AIRSPACE_DEBOUNCE_MS',
  });
}
