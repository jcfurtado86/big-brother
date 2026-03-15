import { useEffect, useRef } from 'react';

/**
 * Filtra visibilidade de billboards por tipo/categoria.
 *
 * O culling espacial (o que está fora da tela) é delegado ao frustum culling
 * nativo do Cesium, que funciona corretamente em qualquer ângulo de câmera.
 * Este hook cuida apenas do filtro de categoria (tipo de entidade).
 *
 * @param {object}  viewer - Cesium Viewer (unused, kept for API stability)
 * @param {Array<{
 *   stateRef:  React.MutableRefObject<Map>,
 *   types:     Set|null,
 *   labelKey:  string,            // 'callsign' | 'label'
 * }>} layers
 */
export function useVisibilityFilter(viewer, layers) {
  const layersRef = useRef(layers);
  layersRef.current = layers;

  // Re-apply when any type set changes.
  // Each Set is a new reference when the user toggles, so we track them directly.
  const typeRefs = layers.map(l => l.types);
  useEffect(() => {
    for (const { stateRef, types, labelKey } of layersRef.current) {
      if (!stateRef?.current) continue;
      for (const [, entry] of stateRef.current) {
        const show = types?.has(entry._category) ?? true;
        entry.billboard.show = show;
        if (entry[labelKey]) entry[labelKey].show = show;
      }
    }
    if (viewer) viewer.scene.requestRender();
  }, typeRefs); // eslint-disable-line react-hooks/exhaustive-deps
}
