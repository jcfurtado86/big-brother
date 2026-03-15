export const WEBCAM_PROVIDER_LIST = [
  { name: 'all',     label: 'Todos (~72K)' },
  { name: 'windy',   label: 'Windy (~65K)' },
  { name: 'otcm',    label: 'OpenTrafficCam (~7.5K)' },
  // { name: '511',  label: '511 DOT (US)' },
];

/** Map of provider key → fetch function. Used by useWebcamData. */
export const WEBCAM_FETCHERS = {};

export function registerFetcher(name, { fetch: fetchFn, hydrate }) {
  WEBCAM_FETCHERS[name] = { fetch: fetchFn, hydrate };
}
