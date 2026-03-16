import { useMemo } from 'react';
import { getAllNuclearPlants } from '../providers/nuclearService';

export function useNuclearData(enabled = false) {
  return useMemo(() => {
    if (!enabled) return new Map();
    return getAllNuclearPlants();
  }, [enabled]);
}
