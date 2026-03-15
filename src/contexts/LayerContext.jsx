import React, { createContext, useContext, useReducer, useMemo } from 'react';

const INITIAL_STATE = {
  flights:     { show: false, types: new Set(['heavy', 'large', 'regional', 'light', 'helicopter', 'uav', 'military', 'unknown']), provider: 'all' },
  vessels:     { show: false, types: new Set(['cargo', 'tanker', 'passenger', 'fishing', 'sailing', 'tug', 'military', 'sar']) },
  satellites:  { show: false, types: new Set(['leo', 'meo', 'geo']) },
  airports:    { show: false, types: new Set(['large_airport', 'medium_airport']) },
  telecom:     { show: false, types: new Set(['mast', 'comm_line', 'data_center']) },
  atc:         { show: false, types: new Set(['control_tower', 'radar']) },
  military:    { show: false, types: new Set(['airfield', 'barracks', 'base', 'checkpoint', 'danger_area', 'naval_base', 'nuclear_explosion_site', 'office', 'range', 'training_area']) },
  nuclear:     { show: false, types: new Set(['operational', 'under_construction', 'planned', 'shutdown', 'suspended_operation']) },
  airspace:    { show: false, types: new Set(['danger', 'restricted', 'prohibited']), opacity: 0.12 },
  weather:     { show: true,  opacity: 0 },
  airRoutes:   { show: false, types: new Set(['short', 'medium', 'long']) },
  seaRoutes:   { show: false, types: new Set(['major', 'middle', 'minor']) },
  receivers:   { adsbShow: false, aisShow: false, adsbOpacity: 0.15, aisOpacity: 0.15 },
  environment: { layerId: 'satellite', lighting: false, terrain: false },
};

function layerReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_SHOW': {
      const { layer } = action;
      const sub = state[layer];
      return { ...state, [layer]: { ...sub, show: !sub.show } };
    }
    case 'TOGGLE_FIELD': {
      const { layer, field } = action;
      const sub = state[layer];
      return { ...state, [layer]: { ...sub, [field]: !sub[field] } };
    }
    case 'SET_TYPES': {
      const { layer, types } = action;
      const sub = state[layer];
      return { ...state, [layer]: { ...sub, types } };
    }
    case 'SET_FIELD': {
      const { layer, field, value } = action;
      const sub = state[layer];
      return { ...state, [layer]: { ...sub, [field]: value } };
    }
    default:
      return state;
  }
}

const StateCtx    = createContext(INITIAL_STATE);
const DispatchCtx = createContext(() => {});

export function LayerProvider({ children }) {
  const [state, dispatch] = useReducer(layerReducer, INITIAL_STATE);

  return (
    <DispatchCtx.Provider value={dispatch}>
      <StateCtx.Provider value={state}>
        {children}
      </StateCtx.Provider>
    </DispatchCtx.Provider>
  );
}

export function useLayerState(key) {
  const state = useContext(StateCtx);
  return key ? state[key] : state;
}

export function useLayerDispatch() {
  return useContext(DispatchCtx);
}
