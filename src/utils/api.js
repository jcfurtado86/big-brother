// Base URL for the Sentinela API server
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const WS_URL = API_URL.replace(/^http/, 'ws');
