import { useEffect, useRef } from 'react';
import { Cartesian3, Color, ColorGeometryInstanceAttribute, GeometryInstance, PolygonGeometry, Primitive, PerInstanceColorAppearance } from 'cesium';
import { AIRSPACE_CATEGORY_META } from '../providers/airspaceIcons';

const SELECTED_COLOR = Color.fromCssColorString('#FF0000').withAlpha(0.3);
const HIDDEN = new Float32Array([0, 0, 0, 0]);
const FT_TO_M = 0.3048;

function convertAltitude(value, unit) {
  const val = value ?? 0;
  const u = unit || 'FT';
  if (u === 'FL') return val * 100 * FT_TO_M;
  if (u === 'FT') return val * FT_TO_M;
  return val;
}

const BASE_COLOR = Object.fromEntries(
  Object.entries(AIRSPACE_CATEGORY_META).map(([k, v]) => [k, Color.fromCssColorString(v.color)])
);

function removePrimitive(viewer, prim) {
  if (prim && viewer && !viewer.isDestroyed()) {
    try { viewer.scene.primitives.remove(prim); } catch (e) { /* already removed */ }
  }
}

export function useAirspaceLayer(viewer, zonesMap, visibleTypes, opacity = 0.12) {
  const stateRef = useRef(new Map());
  const selectedRef = useRef(null);
  const typesRef = useRef(visibleTypes);
  const primitiveRef = useRef(null);
  const oldPrimitiveRef = useRef(null);
  const opacityRef = useRef(opacity);
  const swapRef = useRef(0);

  typesRef.current = visibleTypes;
  opacityRef.current = opacity;

  // Rebuild primitive ONLY when zonesMap changes (new viewport data)
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    // Capture and clear old primitive — cleanup won't touch it
    const oldPrimitive = primitiveRef.current;
    primitiveRef.current = null;
    stateRef.current = new Map();
    swapRef.current++;
    const swapId = swapRef.current;

    // Clean up any lingering old primitive from a previous swap
    removePrimitive(viewer, oldPrimitiveRef.current);
    oldPrimitiveRef.current = null;

    if (zonesMap.size === 0) {
      removePrimitive(viewer, oldPrimitive);
      viewer.scene.requestRender();
      return;
    }

    const instances = [];
    const newState = new Map();

    for (const [id, zone] of zonesMap) {
      const positions = [];
      for (const [lon, lat] of zone.coordinates) {
        positions.push(lon, lat);
      }

      if (positions.length < 6) continue;

      try {
        const visible = typesRef.current?.has(zone.category);
        const base = BASE_COLOR[zone.category] ?? BASE_COLOR.restricted;
        const color = !visible
          ? Color.TRANSPARENT
          : selectedRef.current === id
            ? SELECTED_COLOR
            : base.withAlpha(opacityRef.current);

        const ceiling = convertAltitude(zone.upperLimitValue, zone.upperLimitUnit);
        const floor = convertAltitude(zone.lowerLimitValue, zone.lowerLimitUnit);

        const instance = new GeometryInstance({
          id,
          geometry: new PolygonGeometry({
            polygonHierarchy: {
              positions: Cartesian3.fromDegreesArray(positions),
            },
            extrudedHeight: ceiling,
            height: floor,
          }),
          attributes: {
            color: ColorGeometryInstanceAttribute.fromColor(color),
          },
        });

        instances.push(instance);
        newState.set(id, { zone, instanceIndex: instances.length - 1 });
      } catch (e) {
        // skip malformed polygons
      }
    }

    if (instances.length === 0) {
      removePrimitive(viewer, oldPrimitive);
      viewer.scene.requestRender();
      return;
    }

    const primitive = new Primitive({
      geometryInstances: instances,
      appearance: new PerInstanceColorAppearance({
        translucent: true,
        closed: true,
      }),
      asynchronous: true,
    });

    viewer.scene.primitives.add(primitive);
    primitiveRef.current = primitive;
    stateRef.current = newState;

    // Keep old primitive visible until new one is ready
    if (oldPrimitive) {
      oldPrimitiveRef.current = oldPrimitive;
      const waitForReady = () => {
        if (swapRef.current !== swapId) return;
        if (viewer.isDestroyed()) return;
        if (primitive.ready) {
          removePrimitive(viewer, oldPrimitive);
          if (oldPrimitiveRef.current === oldPrimitive) oldPrimitiveRef.current = null;
          viewer.scene.requestRender();
        } else {
          requestAnimationFrame(waitForReady);
        }
      };
      requestAnimationFrame(waitForReady);
    }

    console.log(`[Airspace] Renderizando ${instances.length} zonas 3D de ${zonesMap.size} no viewport`);

    // NO cleanup here — swap handles old primitive removal
    // Unmount cleanup is handled by the separate effect below
  }, [viewer, zonesMap]);

  // Unmount-only cleanup
  useEffect(() => {
    return () => {
      swapRef.current++;
      removePrimitive(viewer, primitiveRef.current);
      removePrimitive(viewer, oldPrimitiveRef.current);
      primitiveRef.current = null;
      oldPrimitiveRef.current = null;
      if (viewer && !viewer.isDestroyed()) viewer.scene.requestRender();
    };
  }, [viewer]);

  // In-place color update for filter toggles and opacity — no rebuild
  useEffect(() => {
    const prim = primitiveRef.current;
    if (!viewer || viewer.isDestroyed() || !prim || !prim.ready) return;

    for (const [id, { zone }] of stateRef.current) {
      try {
        const attrs = prim.getGeometryInstanceAttributes(id);
        if (!attrs) continue;

        const visible = visibleTypes?.has(zone.category);
        if (!visible) {
          attrs.color = HIDDEN;
        } else {
          const base = BASE_COLOR[zone.category] ?? BASE_COLOR.restricted;
          const color = selectedRef.current === id
            ? SELECTED_COLOR
            : base.withAlpha(opacity);
          attrs.color = ColorGeometryInstanceAttribute.toValue(color);
        }
      } catch (e) {
        // instance not yet ready
      }
    }

    viewer.scene.requestRender();
  }, [visibleTypes, opacity, viewer]);

  function setSelected(id) {
    const prevId = selectedRef.current;
    selectedRef.current = id;
    // Imperative in-place color update for the two affected zones
    const prim = primitiveRef.current;
    if (!prim || !prim.ready || !viewer || viewer.isDestroyed()) return;
    for (const zoneId of [prevId, id]) {
      if (!zoneId) continue;
      const entry = stateRef.current.get(zoneId);
      if (!entry) continue;
      try {
        const attrs = prim.getGeometryInstanceAttributes(zoneId);
        if (!attrs) continue;
        const visible = typesRef.current?.has(entry.zone.category);
        if (!visible) {
          attrs.color = HIDDEN;
        } else {
          const base = BASE_COLOR[entry.zone.category] ?? BASE_COLOR.restricted;
          const color = id === zoneId ? SELECTED_COLOR : base.withAlpha(opacityRef.current);
          attrs.color = ColorGeometryInstanceAttribute.toValue(color);
        }
      } catch (e) { /* not ready */ }
    }
    viewer.scene.requestRender();
  }

  return { stateRef, setSelected };
}
