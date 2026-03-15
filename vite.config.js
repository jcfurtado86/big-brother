import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
import { Agent } from 'node:https';
import aisProxy from './vite-plugin-aisProxy.js';

const ipv4Agent = new Agent({ family: 4 });

export default defineConfig({
  plugins: [react(), cesium(), aisProxy()],
  server: {
    host: true,
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
      '/api/airplaneslive': {
        target: 'https://api.airplanes.live',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/airplaneslive', '/v2'),
      },
      '/api/openinframap': {
        target: 'https://openinframap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/openinframap', ''),
      },
      '/api/mlat': {
        target: 'https://mlat.adsb.lol',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/mlat', ''),
      },
      '/api/overpass': {
        target: 'https://lz4.overpass-api.de',
        changeOrigin: true,
        agent: ipv4Agent,
        rewrite: (path) => path.replace('/api/overpass', '/api'),
      },
    },
  },
});
