import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [react(), cesium()],
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
