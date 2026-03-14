// Flight data provider registry.
// To add a new provider: import it and add to the `providers` object.

import opensky from './opensky/openskyService';
import airplaneslive from './airplaneslive/airplanesLiveService';

const providers = { opensky, airplaneslive };

export const PROVIDER_LIST = [
  { name: 'all', label: 'Todos' },
  ...Object.values(providers),
];
export const getProvider = (name) => providers[name] ?? providers.opensky;
