import plants from '../data/nuclearPlants.json';

let cachedMap = null;

export function getAllNuclearPlants() {
  if (!cachedMap) {
    cachedMap = new Map();
    for (const p of plants) {
      cachedMap.set(p.id, p);
    }
  }
  return cachedMap;
}
