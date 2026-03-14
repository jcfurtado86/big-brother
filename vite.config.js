import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
import aisProxy from './vite-plugin-aisProxy.js';

export default defineConfig({
  plugins: [react(), cesium(), aisProxy()],
  server: {
    proxy: {
      '/api/geoip': {
        target: 'http://ip-api.com',
        changeOrigin: true,
        rewrite: () => '/json/',
      },
      '/api/opensky-track': {
        target: 'https://opensky-network.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/opensky-track', '/api/tracks/all'),
      },
      '/api/opensky-meta': {
        target: 'https://opensky-network.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/opensky-meta', '/api/metadata/aircraft/icao'),
      },
      '/api/opensky': {
        target: 'https://opensky-network.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/opensky', '/api/states/all'),
      },
      '/api/skyauth': {
        target: 'https://auth.opensky-network.org',
        changeOrigin: true,
        rewrite: () => '/auth/realms/opensky-network/protocol/openid-connect/token',
      },
    },
  },
});
