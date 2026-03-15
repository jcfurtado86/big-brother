import { useEffect, useRef } from 'react';
import {
  BillboardCollection,
  PolylineCollection,
  Cartesian3,
  NearFarScalar,
  Color,
  Material,
} from 'cesium';
import {
  getReceiverIcon,
  RECEIVER_COLOR,
  RECEIVER_RANGE_OUTLINE_COLOR,
  RECEIVER_RANGE_M,
  RECEIVER_ICON_SIZE,
} from '../providers/receiverIcons';
import { RECEIVER_MAX_ALT, RECEIVER_CIRCLE_SEGMENTS } from '../providers/constants';

const SCALE_BY_DIST = new NearFarScalar(1e5, 1.2, 3e6, 0.3);

/**
 * Gera posições de um círculo na superfície terrestre.
 * @param {number} lat - centro (graus)
 * @param {number} lon - centro (graus)
 * @param {number} radiusM - raio em metros
 * @param {number} segments - número de vértices
 * @returns {Cartesian3[]}
 */
function circlePositions(lat, lon, radiusM, segments) {
  const positions = [];
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;
  const R = 6_371_000; // raio da terra

  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const dLat = (radiusM / R) * Math.cos(angle);
    const dLon = (radiusM / (R * Math.cos(latRad))) * Math.sin(angle);
    positions.push(
      Cartesian3.fromRadians(lonRad + dLon, latRad + dLat)
    );
  }
  return positions;
}

/**
 * Hook que renderiza receptores/antenas no mapa com ícone + círculo de alcance.
 *
 * @param {object} viewer - Cesium viewer
 * @param {Map} receiversMap - Map<id, {lat, lon, ...}>
 * @param {string} type - 'adsb' | 'ais'
 * @param {boolean} enabled
 */
export function useReceiverLayer(viewer, receiversMap, type, enabled) {
  const billboardsRef = useRef(null);
  const polylinesRef  = useRef(null);
  const renderedRef   = useRef(new Set());

  // Cria/destrói collections
  useEffect(() => {
    if (!viewer) return;

    const billboards = new BillboardCollection();
    const polylines  = new PolylineCollection();
    viewer.scene.primitives.add(polylines);
    viewer.scene.primitives.add(billboards);
    billboardsRef.current = billboards;
    polylinesRef.current  = polylines;

    return () => {
      if (!billboards.isDestroyed()) viewer.scene.primitives.remove(billboards);
      if (!polylines.isDestroyed()) viewer.scene.primitives.remove(polylines);
      billboardsRef.current = null;
      polylinesRef.current  = null;
      renderedRef.current.clear();
    };
  }, [viewer]);

  // Sync receiversMap → billboards + circles
  useEffect(() => {
    const bbs  = billboardsRef.current;
    const pls  = polylinesRef.current;
    if (!bbs || !pls || bbs.isDestroyed()) return;

    const rendered = renderedRef.current;
    const rangeM   = RECEIVER_RANGE_M[type];
    const color    = RECEIVER_COLOR[type];
    const outColor = RECEIVER_RANGE_OUTLINE_COLOR[type];
    const icon     = getReceiverIcon(type);

    if (!enabled) {
      // Esconde tudo
      for (let i = 0; i < bbs.length; i++) bbs.get(i).show = false;
      for (let i = 0; i < pls.length; i++) pls.get(i).show = false;
      if (viewer) viewer.scene.requestRender();
      return;
    }

    // Remove velhos que saíram do map
    // (simplificado: rebuild completo quando map muda significativamente)
    if (rendered.size > 0 && receiversMap.size === 0) {
      bbs.removeAll();
      pls.removeAll();
      rendered.clear();
      if (viewer) viewer.scene.requestRender();
      return;
    }

    // Adiciona novos
    let added = 0;
    for (const [id, data] of receiversMap) {
      if (rendered.has(id)) continue;
      rendered.add(id);

      const pos = Cartesian3.fromDegrees(data.lon, data.lat, 0);

      bbs.add({
        position:        pos,
        image:           icon,
        width:           RECEIVER_ICON_SIZE,
        height:          RECEIVER_ICON_SIZE,
        color,
        scaleByDistance:  SCALE_BY_DIST,
        show:            true,
      });

      // Círculo de range como polyline
      const circlePos = circlePositions(data.lat, data.lon, rangeM, RECEIVER_CIRCLE_SEGMENTS);
      pls.add({
        positions: circlePos,
        width:     1.5,
        material:  Material.fromType('Color', { color: outColor }),
        show:      true,
      });

      added++;
    }

    if (added > 0 && viewer) {
      console.log(`[receiver-layer:${type}] added ${added} receivers (total: ${rendered.size})`);
      viewer.scene.requestRender();
    }
  }, [receiversMap, type, enabled, viewer]);

  // Visibility by camera altitude
  useEffect(() => {
    if (!viewer || !enabled) return;

    function onCameraChanged() {
      const bbs = billboardsRef.current;
      const pls = polylinesRef.current;
      if (!bbs || bbs.isDestroyed()) return;

      const alt = viewer.camera.positionCartographic?.height ?? Infinity;
      const show = alt < RECEIVER_MAX_ALT;

      for (let i = 0; i < bbs.length; i++) bbs.get(i).show = show;
      for (let i = 0; i < pls.length; i++) pls.get(i).show = show;
    }

    onCameraChanged();
    const remove = viewer.camera.changed.addEventListener(onCameraChanged);
    return () => remove();
  }, [viewer, enabled]);
}
