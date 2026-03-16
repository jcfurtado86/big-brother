import { createContext, useContext, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Cartesian3,
  ColorMaterialProperty,
  CallbackProperty,
  defined,
} from 'cesium';
import { useViewer } from './ViewerContext';
import { useCameraFollow } from '../hooks/useCameraFollow';
import { TRACK_COLOR } from '../providers/constants';

const SelectionContext = createContext(null);

export function SelectionProvider({ children }) {
  const viewer = useViewer();
  const registryRef = useRef(new Map());
  const selectionRef = useRef(null);     // { entity, key }
  const liveIntervalRef = useRef(null);
  const pendingRef = useRef(0);
  const { startFollow, stopFollow, updateFollow } = useCameraFollow(viewer);

  const clearTrack = useCallback(() => {
    if (selectionRef.current && viewer && !viewer.isDestroyed()) {
      viewer.entities.remove(selectionRef.current.entity);
      selectionRef.current = null;
    }
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    stopFollow();
  }, [viewer, stopFollow]);

  const clearAll = useCallback(() => {
    clearTrack();
    for (const handler of registryRef.current.values()) {
      handler.onClear?.();
    }
  }, [clearTrack]);

  // Shared methods for handlers to use
  const addTrack = useCallback((positions) => {
    if (!viewer || viewer.isDestroyed()) return null;
    const liveEndRef = { current: positions[positions.length - 1] };
    const dynamicPositions = new CallbackProperty(
      () => [...positions.slice(0, -1), liveEndRef.current],
      false
    );
    const entity = viewer.entities.add({
      polyline: {
        positions: dynamicPositions,
        width: 1.5,
        material: new ColorMaterialProperty(TRACK_COLOR),
        clampToGround: false,
        arcType: 0,
      },
    });
    selectionRef.current = { entity };
    return liveEndRef;
  }, [viewer]);

  const setLiveInterval = useCallback((fn, ms) => {
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    liveIntervalRef.current = setInterval(fn, ms);
  }, []);

  const nextPending = useCallback(() => ++pendingRef.current, []);
  const isPendingStale = useCallback((token) => token !== pendingRef.current, []);

  // Click + hover handlers
  useEffect(() => {
    if (!viewer) return;
    const canvas = viewer.scene.canvas;

    // Release follow on drag > 4px
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const onMove = (me) => {
        if (Math.abs(me.clientX - startX) > 4 || Math.abs(me.clientY - startY) > 4) {
          stopFollow();
          cleanup();
        }
      };
      const cleanup = () => {
        canvas.removeEventListener('mousemove', onMove);
        canvas.removeEventListener('mouseup', cleanup);
      };
      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('mouseup', cleanup, { once: true });
    };
    canvas.addEventListener('mousedown', onMouseDown);

    // Pointer cursor on hoverable entities
    const hoverHandler = new ScreenSpaceEventHandler(canvas);
    hoverHandler.setInputAction((movement) => {
      if (viewer.isDestroyed()) return;
      try {
        const picks = viewer.scene.drillPick(movement.endPosition, 5);
        const hit = picks.find(p => defined(p) && typeof p.id === 'string');
        canvas.style.cursor = hit ? 'pointer' : 'default';
      } catch { /* Cesium internal error — ignore */ }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // Click dispatch
    const handler = new ScreenSpaceEventHandler(canvas);
    handler.setInputAction(async (click) => {
      if (viewer.isDestroyed()) return;
      let picks;
      try { picks = viewer.scene.drillPick(click.position, 5); } catch { return; }
      const picked = picks.find(p => defined(p) && typeof p.id === 'string');
      viewer.selectedEntity = undefined;
      const rawId = picked?.id ?? null;

      // Find matching handler in registry
      for (const selHandler of registryRef.current.values()) {
        if (selHandler.match(rawId)) {
          clearAll();
          await selHandler.onSelect(rawId);
          return;
        }
      }

      // No match — click on empty space
      if (!rawId) clearAll();
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      hoverHandler.destroy();
      canvas.style.cursor = 'default';
      canvas.removeEventListener('mousedown', onMouseDown);
      clearTrack();
    };
  }, [viewer, stopFollow, clearAll, clearTrack]);

  const register = useCallback((name, handler) => {
    registryRef.current.set(name, handler);
  }, []);

  const unregister = useCallback((name) => {
    registryRef.current.delete(name);
  }, []);

  const ctx = useMemo(() => ({
    register,
    unregister,
    clearAll,
    startFollow,
    updateFollow,
    addTrack,
    setLiveInterval,
    nextPending,
    isPendingStale,
    viewer,
  }), [register, unregister, clearAll, startFollow, updateFollow, addTrack, setLiveInterval, nextPending, isPendingStale, viewer]);

  return <SelectionContext.Provider value={ctx}>{children}</SelectionContext.Provider>;
}

export function useSelection() {
  return useContext(SelectionContext);
}

/**
 * Register a selection handler. Called during render, unregistered on unmount.
 * @param {string} name - unique handler name
 * @param {{ match(id:string):boolean, onSelect(id:string):void|Promise, onClear():void }} handler
 */
export function useSelectionHandler(name, handler) {
  const { register, unregister } = useSelection();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  // Register a stable wrapper that delegates to the latest handler
  useEffect(() => {
    const wrapper = {
      match: (id) => handlerRef.current.match(id),
      onSelect: (id) => handlerRef.current.onSelect(id),
      onClear: () => handlerRef.current.onClear?.(),
    };
    register(name, wrapper);
    return () => unregister(name);
  }, [name, register, unregister]);
}
