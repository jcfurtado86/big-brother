import { useEffect, useRef } from 'react';
import { Cartesian3, Color, ColorGeometryInstanceAttribute, GeometryInstance, PolygonGeometry, Primitive, PerInstanceColorAppearance } from 'cesium';

const SELECTED_COLOR = Color.fromCssColorString('#FF0000').withAlpha(0.3);
const FT_TO_M = 0.3048;

function zoneHeight(zone) {
  const val = zone.upperLimitValue ?? 0;
  const unit = zone.upperLimitUnit || 'FT';
  if (unit === 'FL') return val * 100 * FT_TO_M;
  if (unit === 'FT') return val * FT_TO_M;
  return val; // meters
}

function zoneFloor(zone) {
  const val = zone.lowerLimitValue ?? 0;
  const unit = zone.lowerLimitUnit || 'FT';
  if (unit === 'FL') return val * 100 * FT_TO_M;
  if (unit === 'FT') return val * FT_TO_M;
  return val;
}

// Base colors without alpha — alpha comes from slider
const BASE_COLOR = {
  restricted: Color.fromCssColorString('#FF5722'),
  danger:     Color.fromCssColorString('#FFC107'),
  prohibited: Color.fromCssColorString('#F44336'),
};

export function useAirspaceLayer(viewer, zonesMap, visibleTypes, opacity = 0.12) {
  const stateRef = useRef(new Map());
  const selectedRef = useRef(null);
  const typesRef = useRef(visibleTypes);
  const primitiveRef = useRef(null);

  typesRef.current = visibleTypes;

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    if (primitiveRef.current) {
      viewer.scene.primitives.remove(primitiveRef.current);
      primitiveRef.current = null;
    }

    stateRef.current.clear();

    if (zonesMap.size === 0) return;

    const instances = [];

    for (const [id, zone] of zonesMap) {
      if (!typesRef.current?.has(zone.category)) continue;

      const positions = [];
      for (const [lon, lat] of zone.coordinates) {
        positions.push(lon, lat);
      }

      if (positions.length < 6) continue;

      try {
        const base = BASE_COLOR[zone.category] ?? BASE_COLOR.restricted;
        const color = selectedRef.current === id
          ? SELECTED_COLOR
          : base.withAlpha(opacity);

        const ceiling = zoneHeight(zone);
        const floor = zoneFloor(zone);

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
        stateRef.current.set(id, { zone, instanceIndex: instances.length - 1 });
      } catch (e) {
        // skip malformed polygons
      }
    }

    if (instances.length === 0) return;

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
    viewer.scene.requestRender();

    console.log(`[Airspace] Renderizando ${instances.length} zonas 3D de ${zonesMap.size} no viewport`);

    return () => {
      if (primitiveRef.current && viewer && !viewer.isDestroyed()) {
        viewer.scene.primitives.remove(primitiveRef.current);
        primitiveRef.current = null;
      }
    };
  }, [viewer, zonesMap, visibleTypes, opacity]);

  function setSelected(id) {
    selectedRef.current = id;
  }

  return { stateRef, setSelected };
}
