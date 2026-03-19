const env = (key, fallback) => process.env[key] ?? fallback;

export default {
  // Server
  PORT: parseInt(env('PORT', '3001')),
  HOST: env('HOST', '0.0.0.0'),
  CORS_ORIGIN: env('CORS_ORIGIN', 'http://localhost:5173'),

  // PostgreSQL
  PG_HOST: env('PG_HOST', 'localhost'),
  PG_PORT: parseInt(env('PG_PORT', '5432')),
  PG_USER: env('PG_USER', 'sentinela'),
  PG_PASS: env('PG_PASS', 'sentinela'),
  PG_DB: env('PG_DB', 'sentinela'),

  // API Keys
  OPENSKY_CLIENT_ID: env('OPENSKY_CLIENT_ID', ''),
  OPENSKY_CLIENT_SECRET: env('OPENSKY_CLIENT_SECRET', ''),
  OWM_API_KEY: env('OWM_API_KEY', ''),
  AISSTREAM_API_KEY: env('AISSTREAM_API_KEY', ''),
  OPENAIP_API_KEY: env('OPENAIP_API_KEY', ''),
  WINDY_WEBCAMS_KEY: env('WINDY_WEBCAMS_KEY', ''),

  // DOT keys (optional)
  DOT_511NY_KEY: env('DOT_511NY_KEY', ''),
  DOT_511GA_KEY: env('DOT_511GA_KEY', ''),
  DOT_511WI_KEY: env('DOT_511WI_KEY', ''),
  DOT_511AK_KEY: env('DOT_511AK_KEY', ''),
  DOT_511AZ_KEY: env('DOT_511AZ_KEY', ''),
  DOT_511LA_KEY: env('DOT_511LA_KEY', ''),
  DOT_511UT_KEY: env('DOT_511UT_KEY', ''),
  DOT_511ID_KEY: env('DOT_511ID_KEY', ''),
  DOT_511CT_KEY: env('DOT_511CT_KEY', ''),
  DOT_511NV_KEY: env('DOT_511NV_KEY', ''),
  DOT_OHGO_KEY: env('DOT_OHGO_KEY', ''),
  DOT_WSDOT_KEY: env('DOT_WSDOT_KEY', ''),

  // Poller intervals (ms)
  OPENSKY_POLL_MS: 120_000,
  AL_POLL_MS: 10_000,
  TLE_POLL_MS: 24 * 60 * 60 * 1000,       // 24h
  AIRPORTS_POLL_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
  AIRCRAFT_POLL_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
  ACLED_POLL_MS: 7 * 24 * 60 * 60 * 1000,     // 7 days
  ATC_POLL_MS: 7 * 24 * 60 * 60 * 1000,       // 7 days
  MILITARY_POLL_MS: 7 * 24 * 60 * 60 * 1000,  // 7 days
  WEBCAMS_WINDY_POLL_MS: 24 * 60 * 60 * 1000, // 24h
  WEBCAMS_DOT_POLL_MS: 24 * 60 * 60 * 1000,   // 24h
  WEBCAMS_GOV_POLL_MS: 6 * 60 * 60 * 1000,    // 6h
  WEBCAMS_OTCM_POLL_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  TELECOM_POLL_MS: 7 * 24 * 60 * 60 * 1000,   // 7 days
  AIRSPACE_POLL_MS: 24 * 60 * 60 * 1000,      // 24h
  RECEIVERS_POLL_MS: 60 * 60 * 1000,          // 1h
  GDELT_POLL_MS: 15 * 60 * 1000,              // 15 min

  // External APIs
  OVERPASS_URL: 'https://lz4.overpass-api.de/api/interpreter',
};
