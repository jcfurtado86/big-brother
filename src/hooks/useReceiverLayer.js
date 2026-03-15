import { useEffect, useRef } from 'react';
import {
  BillboardCollection,
  Cartesian3,
  NearFarScalar,
  Math as CesiumMath,
  CustomDataSource,
  ColorMaterialProperty,
} from 'cesium';
import {
  getReceiverIcon,
  RECEIVER_COLOR,
  RECEIVER_RANGE_COLOR,
  RECEIVER_RANGE_OUTLINE_COLOR,
  RECEIVER_RANGE_M,
  RECEIVER_ICON_SIZE,
} from '../providers/receiverIcons';
import { RECEIVER_MAX_ALT, RECEIVER_VIEWPORT_PAD } from '../providers/constants';

const SCALE_BY_DIST = new NearFarScalar(1e5, 1.2, 1.5e7, 0.15);

// ── Helpers ───────────────────────────────────────────────────────────────────

function getViewportBbox(viewer) {
  const rect = viewer.camera.computeViewRectangle();
  if (!rect) return null;
  return {
    west:  CesiumMath.toDegrees(rect.west)  - RECEIVER_VIEWPORT_PAD,
    south: CesiumMath.toDegrees(rect.south) - RECEIVER_VIEWPORT_PAD,
    east:  CesiumMath.toDegrees(rect.east)  + RECEIVER_VIEWPORT_PAD,
    north: CesiumMath.toDegrees(rect.north) + RECEIVER_VIEWPORT_PAD,
  };
}

function inBbox(lat, lon, bbox) {
  return lat >= bbox.south && lat <= bbox.north &&
         lon >= bbox.west  && lon <= bbox.east;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Renderiza receptores/antenas no mapa com ícone + círculo de alcance preenchido.
 * - Viewport culling: só cria primitivos para receivers visíveis
 * - collection.show / dataSource.show para toggle O(1)
 * - Remoção granular
 */
export function useReceiverLayer(viewer, receiversMap, type, enabled) {
  const billboardsRef  = useRef(null);
  const dataSourceRef  = useRef(null);
  // Map<id, { billboard, entity }> — referências para remoção granular
  const renderedRef    = useRef(new Map());
  const receiversRef   = useRef(receiversMap);
  receiversRef.current = receiversMap;

  // Cria/destrói collections
  useEffect(() => {
    if (!viewer) return;

    const billboards = new BillboardCollection();
    viewer.scene.primitives.add(billboards);
    billboardsRef.current = billboards;

    const ds = new CustomDataSource(`receiver-range-${type}`);
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    return () => {
      if (!billboards.isDestroyed()) viewer.scene.primitives.remove(billboards);
      viewer.dataSources.remove(ds, true);
      billboardsRef.current = null;
      dataSourceRef.current = null;
      renderedRef.current.clear();
    };
  }, [viewer, type]);

  // Sync viewport
  useEffect(() => {
    if (!viewer) return;

    const bbs = billboardsRef.current;
    const ds  = dataSourceRef.current;
    if (!bbs || bbs.isDestroyed() || !ds) return;

    if (!enabled) {
      bbs.show = false;
      ds.show  = false;
      viewer.scene.requestRender();
      return;
    }

    bbs.show = true;
    ds.show  = true;

    const rendered  = renderedRef.current;
    const rangeM    = RECEIVER_RANGE_M[type];
    const color     = RECEIVER_COLOR[type];
    const fillColor = RECEIVER_RANGE_COLOR[type];
    const outColor  = RECEIVER_RANGE_OUTLINE_COLOR[type];
    const icon      = getReceiverIcon();

    // Remove receivers que sumiram do receiversMap entre polls
    for (const [id, entry] of rendered) {
      if (!receiversMap.has(id)) {
        bbs.remove(entry.billboard);
        ds.entities.remove(entry.entity);
        rendered.delete(id);
      }
    }

    function syncViewport() {
      if (bbs.isDestroyed()) return;

      const alt = viewer.camera.positionCartographic?.height ?? Infinity;
      const visible = alt < RECEIVER_MAX_ALT;
      bbs.show = visible;
      ds.show  = visible;
      if (!visible) return;

      const bbox = getViewportBbox(viewer);
      if (!bbox) return;

      // Remove receivers fora do viewport
      for (const [id, entry] of rendered) {
        const data = receiversMap.get(id);
        if (!data || !inBbox(data.lat, data.lon, bbox)) {
          bbs.remove(entry.billboard);
          ds.entities.remove(entry.entity);
          rendered.delete(id);
        }
      }

      // Adiciona receivers dentro do viewport
      let added = 0;
      for (const [id, data] of receiversMap) {
        if (rendered.has(id)) continue;
        if (!inBbox(data.lat, data.lon, bbox)) continue;

        const pos = Cartesian3.fromDegrees(data.lon, data.lat, 0);

        const billboard = bbs.add({
          id:             `receiver_${type}_${id}`,
          position:       pos,
          image:          icon,
          width:          RECEIVER_ICON_SIZE,
          height:         RECEIVER_ICON_SIZE,
          color,
          scaleByDistance: SCALE_BY_DIST,
        });

        const entity = ds.entities.add({
          position: pos,
          ellipse: {
            semiMajorAxis: rangeM,
            semiMinorAxis: rangeM,
            material: new ColorMaterialProperty(fillColor),
            outline:      true,
            outlineColor: outColor,
            outlineWidth: 1.5,
            height:       0,
          },
        });

        rendered.set(id, { billboard, entity });
        added++;
      }

      if (added > 0) viewer.scene.requestRender();
    }

    syncViewport();
    const remove = viewer.camera.changed.addEventListener(syncViewport);
    return () => remove();
  }, [receiversMap, type, enabled, viewer]);

  return { receiversRef };
}
