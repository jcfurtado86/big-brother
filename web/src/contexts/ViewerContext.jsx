import { createContext, useContext } from 'react';

const ViewerContext = createContext(null);

export const ViewerProvider = ViewerContext.Provider;

export function useViewer() {
  return useContext(ViewerContext);
}
