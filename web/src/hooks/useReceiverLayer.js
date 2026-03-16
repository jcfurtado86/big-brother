import { useEffect, useRef } from 'react';
import {
  BillboardCollection,
  Cartesian2,
  Cartesian3,
  NearFarScalar,
  Math as CesiumMath,
  CustomDataSource,
  ColorMaterialProperty,
} from 'cesium';
import {
  getReceiverIcon,
  RECEIVER_COLOR,
  RECEIVER_RANGE_M,
} from '../providers/receiverIcons';
import { LABEL_VISIBLE } from '../providers/constants';
import { getSetting } from '../providers/settingsStore';
import { inBbox } from '../utils/bboxUtils';

const SCALE_BY_DIST = new NearFarScalar(1e5, 1.2, 1.5e7, 0.15);

const LABEL_FONT = '12px monospace';
const LABEL_PAD_X = 4, LABEL_PAD_Y = 3;
const _ctx = document.createElement('canvas').getContext('2d');

function buildLabelCanvas(text) {
  _ctx.font = LABEL_FONT;
  const tw = Math.ceil(_ctx.measureText(text).width);
  const W = tw + LABEL_PAD_X * 2;
  const H = 12 + LABEL_PAD_Y * 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, W, H, 3);
  else ctx.rect(0, 0, W, H);
  ctx.fill();
  ctx.font = LABEL_FONT;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, LABEL_PAD_X, H / 2);
  return { canvas: c, W, H };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getViewportBbox(viewer) {
  const rect = viewer.camera.computeViewRectangle();
  if (!rect) return null;
  const pad = getSetting('RECEIVER_VIEWPORT_PAD');
  return {
    west:  CesiumMath.toDegrees(rect.west)  - pad,
    south: CesiumMath.toDegrees(rect.south) - pad,
    east:  CesiumMath.toDegrees(rect.east)  + pad,
    north: CesiumMath.toDegrees(rect.north) + pad,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Renderiza receptores/antenas no mapa com ícone + círculo de alcance preenchido.
 * - Viewport culling: só cria primitivos para receivers visíveis
 * - collection.show / dataSource.show para toggle O(1)
 * - Remoção granular
 */
export function useReceiverLayer(viewer, receiversMap, type, enabled, opacity = 0.15) {
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
    const fillColor = RECEIVER_COLOR[type].withAlpha(opacity);
    const icon      = getReceiverIcon();

    // Remove receivers que sumiram do receiversMap entre polls
    for (const [id, entry] of rendered) {
      if (!receiversMap.has(id)) {
        bbs.remove(entry.billboard);
        if (entry.label) bbs.remove(entry.label);
        ds.entities.remove(entry.entity);
        rendered.delete(id);
      } else {
        entry.entity.ellipsoid.material = new ColorMaterialProperty(fillColor);
      }
    }

    function syncViewport() {
      if (bbs.isDestroyed()) return;

      const maxAlt  = getSetting('RECEIVER_MAX_ALT');
      const iconSize = getSetting('RECEIVER_ICON_SIZE');
      const labelScale = LABEL_VISIBLE(getSetting('LABEL_NEAR'), getSetting('LABEL_FAR'));

      const alt = viewer.camera.positionCartographic?.height ?? Infinity;
      const visible = alt < maxAlt;
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
          if (entry.label) bbs.remove(entry.label);
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
          width:          iconSize,
          height:         iconSize,
          color,
          scaleByDistance: SCALE_BY_DIST,
        });

        const labelText = data.user || data.name || String(id);
        const { canvas: labelImg, W: lW, H: lH } = buildLabelCanvas(labelText);
        const label = bbs.add({
          position:                pos,
          image:                   labelImg,
          width:                   lW,
          height:                  lH,
          pixelOffset:             new Cartesian2(0, iconSize / 2 + lH / 2 + 4),
          scaleByDistance:         labelScale,
          translucencyByDistance:  labelScale,
        });

        const entity = ds.entities.add({
          position: pos,
          ellipsoid: {
            radii: new Cartesian3(rangeM, rangeM, rangeM * 0.15),
            material: new ColorMaterialProperty(fillColor),
            minimumCone: 0,
            maximumCone: CesiumMath.PI_OVER_TWO,
            outline: false,
            slicePartitions: 24,
            stackPartitions: 8,
          },
        });

        rendered.set(id, { billboard, label, entity });
        added++;
      }

      if (added > 0) viewer.scene.requestRender();
    }

    syncViewport();
    const remove = viewer.camera.changed.addEventListener(syncViewport);
    return () => remove();
  }, [receiversMap, type, enabled, viewer, opacity]);

  return { receiversRef };
}
