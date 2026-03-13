import { useEffect, useRef } from 'react';
import { BillboardCollection, Cartesian3, Cartesian2, NearFarScalar, Cartographic } from 'cesium';
import { getAirportIcon, AIRPORT_TYPE_META } from '../providers/airportIcons';
import AirportWorker from '../workers/airportWorker.js?worker';

const LABEL_SCALE = {
  large_airport:  () => new NearFarScalar(5e4, 1.0, 5e5, 0.0),
  medium_airport: () => new NearFarScalar(2e4, 1.0, 2e5, 0.0),
  small_airport:  () => new NearFarScalar(5e3, 1.0, 5e4, 0.0),
  heliport:       () => new NearFarScalar(2e3, 1.0, 2e4, 0.0),
  seaplane_base:  () => new NearFarScalar(2e3, 1.0, 3e4, 0.0),
  balloonport:    () => new NearFarScalar(1e3, 1.0, 1e4, 0.0),
};

function inBbox(lat, lon, bbox) {
  if (!bbox) return true;
  return lat >= bbox.south && lat <= bbox.north && lon >= bbox.west && lon <= bbox.east;
}

function getCameraAlt(viewer) {
  if (!viewer) return Infinity;
  return Cartographic.fromCartesian(viewer.camera.position).height;
}

export function useAirportLayer(viewer, activeTypes, bbox) {
  const billboardsRef  = useRef(null);
  const renderedRef    = useRef(new Map()); // icao → {icon, label, lat, lon, _type}
  const workerRef      = useRef(null);
  const workerReadyRef = useRef(false);
  const genRef         = useRef(0);
  const activeTypesRef = useRef(activeTypes);
  const bboxRef        = useRef(bbox);
  const viewerRef      = useRef(viewer);
  activeTypesRef.current = activeTypes;
  bboxRef.current = bbox;
  viewerRef.current = viewer;

  // ── Billboard collection lifecycle ──────────────────────────────────────────

  useEffect(() => {
    if (!viewer) return;
    const billboards = new BillboardCollection();
    viewer.scene.primitives.add(billboards);
    billboardsRef.current = billboards;
    return () => {
      if (!billboards.isDestroyed()) viewer.scene.primitives.remove(billboards);
      billboardsRef.current = null;
      renderedRef.current.clear();
    };
  }, [viewer]);

  // ── Worker lifecycle ─────────────────────────────────────────────────────────

  useEffect(() => {
    const worker = new AirportWorker();
    workerRef.current = worker;

    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        workerReadyRef.current = true;
        sendUpdate();
        return;
      }
      if (data.type === 'batch') {
        if (data.gen !== genRef.current) {
          // Batch obsoleto: libera bitmaps recebidos
          for (const r of data.results) r.labelBitmap?.close();
          return;
        }
        processBatch(data.results);
      }
    };

    worker.postMessage({ type: 'init' });

    return () => {
      worker.terminate();
      workerRef.current = null;
      workerReadyRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Envia novo pedido ao Worker ───────────────────────────────────────────────

  function sendUpdate() {
    if (!workerRef.current || !workerReadyRef.current) return;

    const active = activeTypesRef.current;
    const b      = bboxRef.current;

    const alt = getCameraAlt(viewerRef.current);

    // Atualiza show/hide dos billboards já renderizados
    for (const [, entry] of renderedRef.current) {
      const meta = AIRPORT_TYPE_META[entry._type];
      const visible = active.has(entry._type)
        && inBbox(entry.lat, entry.lon, b)
        && alt <= (meta?.maxAlt ?? Infinity);
      entry.icon.show = visible;
      if (entry.label) entry.label.show = visible;
    }

    genRef.current++;
    workerRef.current.postMessage({
      type:        'update',
      bbox:        b,
      activeTypes: [...active],
      gen:         genRef.current,
    });
  }

  // ── Processa batch recebido do Worker ────────────────────────────────────────

  function processBatch(results) {
    const bbs = billboardsRef.current;
    if (!bbs || bbs.isDestroyed()) {
      for (const r of results) r.labelBitmap?.close();
      return;
    }

    const rendered = renderedRef.current;
    const active   = activeTypesRef.current;
    const b        = bboxRef.current;
    const alt      = getCameraAlt(viewerRef.current);

    for (const ap of results) {
      // Aeroporto já existe: descarta bitmap (não pode reusar ImageBitmap transferido)
      if (rendered.has(ap.icao)) {
        ap.labelBitmap?.close();
        continue;
      }

      const meta = AIRPORT_TYPE_META[ap.type];
      if (!meta) { ap.labelBitmap?.close(); continue; }

      const pos     = Cartesian3.fromDegrees(ap.lon, ap.lat, 0);
      const visible = active.has(ap.type)
        && inBbox(ap.lat, ap.lon, b)
        && alt <= (meta.maxAlt ?? Infinity);

      const icon = bbs.add({
        position:        pos,
        image:           getAirportIcon(ap.type), // canvas cacheado no main thread
        width:           meta.size,
        height:          meta.size,
        scaleByDistance: meta.scale,
        show:            visible,
      });

      // Converte ImageBitmap (do Worker) para canvas via drawImage (única operação rápida)
      const lc = document.createElement('canvas');
      lc.width = ap.labelW; lc.height = ap.labelH;
      lc.getContext('2d').drawImage(ap.labelBitmap, 0, 0);
      ap.labelBitmap.close();

      const labelScale = LABEL_SCALE[ap.type]?.() ?? new NearFarScalar(5e3, 1.0, 5e4, 0.0);
      const label = bbs.add({
        position:               pos,
        image:                  lc,
        width:                  ap.labelW,
        height:                 ap.labelH,
        pixelOffset:            new Cartesian2(0, meta.size / 2 + ap.labelH / 2 + 4),
        scaleByDistance:        labelScale,
        translucencyByDistance: labelScale,
        show:                   visible,
      });

      rendered.set(ap.icao, { icon, label, lat: ap.lat, lon: ap.lon, _type: ap.type });
    }
  }

  // ── Reage a mudanças de bbox ou tipos ativos ─────────────────────────────────

  const activeKey = [...activeTypes].sort().join(',');
  const bboxKey   = bbox
    ? `${bbox.south.toFixed(1)},${bbox.west.toFixed(1)},${bbox.north.toFixed(1)},${bbox.east.toFixed(1)}`
    : 'null';

  useEffect(() => {
    sendUpdate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, bboxKey]);
}
