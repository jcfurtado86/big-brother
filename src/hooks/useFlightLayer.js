import { useEffect, useMemo } from 'react';
import { Cartesian3, Math as CesiumMath } from 'cesium';
import { getCategoryType, getCategoryFromTypeCode, getIconForTypeCode, CATEGORY_SIZE, FLIGHT_CATEGORY_COLOR } from '../providers/planeIcons';
import { lookupAircraft, preloadAircraftDb } from '../providers/aircraftDb';
import { buildCallsignBillboard } from '../utils/callsignCanvas';
import { useDeadReckoning } from './useDeadReckoning';
import { useBillboardLayer } from './useBillboardLayer';
import {
  SELECTED_PLANE_COLOR, PLANE_BATCH_SIZE, CALLSIGN_BATCH_SIZE,
  FLIGHT_ALT_SCALE,
} from '../providers/constants';

function resolveCategory(icao, adsbCat, velocity, altitude, military) {
  const db       = lookupAircraft(icao);
  const typeCode = db?.typeCode ?? null;
  return {
    category: getCategoryFromTypeCode(typeCode) ?? getCategoryType(adsbCat, velocity, altitude, military),
    typeCode,
  };
}

export function useFlightLayer(viewer, flightsMap, visibleTypes) {
  const config = useMemo(() => ({
    batchSize: PLANE_BATCH_SIZE,
    labelBatchSize: CALLSIGN_BATCH_SIZE,
    categoryColors: FLIGHT_CATEGORY_COLOR,
    selectedColor: SELECTED_PLANE_COLOR,

    createBillboard(billboards, icao, flight, typesRef) {
      const { category, typeCode } = resolveCategory(icao, flight.category, flight.velocity, flight.altitude, flight.military);
      const { w, h } = CATEGORY_SIZE[category] ?? CATEGORY_SIZE.unknown;
      const alt = (flight.altitude ?? 0) * FLIGHT_ALT_SCALE;
      const pos = Cartesian3.fromDegrees(flight.lon, flight.lat, alt);

      const show = typesRef.current?.has(category) ?? true;
      const billboard = billboards.add({
        id: icao,
        position: pos,
        image: getIconForTypeCode(typeCode, category),
        width: w,
        height: h,
        show,
        rotation: -CesiumMath.toRadians(flight.heading),
        alignedAxis: Cartesian3.UNIT_Z,
        color: FLIGHT_CATEGORY_COLOR[category] ?? FLIGHT_CATEGORY_COLOR.unknown,
      });

      return {
        billboard,
        entry: {
          billboard,
          label: null,
          lat: flight.lat,
          lon: flight.lon,
          heading: flight.heading,
          velocity: flight.velocity,
          fetchedAt: flight.fetchedAt,
          _h: h,
          _label: flight.callsign || flight.icao24,
          _country: flight.country,
          _pos: pos,
          _adsbCat: flight.category,
          _alt: flight.altitude,
          _military: !!flight.military,
          _category: category,
        },
      };
    },

    updateEntry(entry, flight, billboards, typesRef) {
      entry.lat       = flight.lat;
      entry.lon       = flight.lon;
      entry.heading   = flight.heading;
      entry.velocity  = flight.velocity;
      entry.fetchedAt = flight.fetchedAt;
      entry._alt      = flight.altitude;
      entry.billboard.rotation = -CesiumMath.toRadians(flight.heading);

      // Update callsign label + country flag if enriched by merge
      const newCountry = flight.country || '';
      const newLabel   = flight.callsign || flight.icao24;
      if (newCountry !== entry._country || newLabel !== entry._label) {
        entry._country = newCountry;
        entry._label   = newLabel;
        if (entry.label) {
          billboards.remove(entry.label);
          entry.label = buildCallsignBillboard(
            billboards, entry._pos, entry._h, entry._label, entry._country
          );
          entry.label.show = entry.billboard.show;
        }
      }

      // Update category/military if enriched by merge
      const newMilitary = !!flight.military;
      const newAdsbCat  = flight.category;
      if (newMilitary !== entry._military || newAdsbCat !== entry._adsbCat) {
        entry._military = newMilitary;
        entry._adsbCat  = newAdsbCat;
        const { category, typeCode } = resolveCategory(flight.icao24 || entry.billboard.id, newAdsbCat, entry.velocity, entry._alt, newMilitary);
        const { w, h } = CATEGORY_SIZE[category] ?? CATEGORY_SIZE.unknown;
        entry._category        = category;
        entry.billboard.image  = getIconForTypeCode(typeCode, category);
        entry.billboard.width  = w;
        entry.billboard.height = h;
        entry.billboard.color  = FLIGHT_CATEGORY_COLOR[category] ?? FLIGHT_CATEGORY_COLOR.unknown;
        entry._h = h;
        const show = typesRef.current?.has(category) ?? true;
        entry.billboard.show = show;
        if (entry.label) entry.label.show = show;
      }
    },

    getLabelInfo(entry) {
      return { pos: entry._pos, height: entry._h, label: entry._label, country: entry._country };
    },
  }), []);

  const { billboardsRef, stateRef, setSelected } = useBillboardLayer(
    viewer, flightsMap, visibleTypes, config
  );

  // Dead reckoning
  useDeadReckoning(viewer, billboardsRef, stateRef);

  // Re-evaluate icons once aircraft DB finishes loading
  useEffect(() => {
    preloadAircraftDb().then(() => {
      const billboards = billboardsRef.current;
      if (!billboards || billboards.isDestroyed()) return;
      for (const [icao, entry] of stateRef.current) {
        const { category, typeCode } = resolveCategory(icao, entry._adsbCat, entry.velocity, entry._alt, entry._military);
        const { w, h } = CATEGORY_SIZE[category] ?? CATEGORY_SIZE.unknown;
        entry.billboard.image  = getIconForTypeCode(typeCode, category);
        entry.billboard.width  = w;
        entry.billboard.height = h;
        entry._h = h;
      }
    }).catch(() => {});
  }, [viewer]);

  return { stateRef, setSelected };
}
