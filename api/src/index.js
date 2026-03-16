import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import db from './db.js';
import config from './config.js';

// Routes
import tleRoutes from './routes/satellites.js';
import nuclearRoutes from './routes/nuclear.js';
import airportsRoutes from './routes/airports.js';
import aircraftRoutes from './routes/aircraft.js';
import acledRoutes from './routes/acled.js';
import atcRoutes from './routes/atc.js';
import militaryRoutes from './routes/military.js';
import telecomRoutes from './routes/telecom.js';
import airspaceRoutes from './routes/airspace.js';
import receiversRoutes from './routes/receivers.js';
import routesRoutes from './routes/routes.js';
import healthRoutes from './routes/health.js';
import flightsRoutes from './routes/flights.js';
import vesselsRoutes from './routes/vessels.js';
import { registerVesselWS } from './streams/aisstream.js';
import webcamsRoutes from './routes/webcams.js';
import weatherRoutes from './routes/weather.js';
import geoipRoutes from './routes/geoip.js';

// Pollers
import { startTlePoller } from './pollers/celestrak.js';
import { startAirportsPoller } from './pollers/airports.js';
import { startAircraftPoller } from './pollers/aircraft.js';
import { startAcledPoller } from './pollers/acled.js';
import { startAtcPoller } from './pollers/atc.js';
import { startMilitaryPoller } from './pollers/military.js';
import { startTelecomPoller } from './pollers/telecom.js';
import { startAirspacePoller } from './pollers/airspace.js';
import { startReceiversPoller } from './pollers/receivers.js';
import { startOpenSkyPoller } from './pollers/opensky.js';
import { startAirplanesLivePoller } from './pollers/airplaneslive.js';
import { startFlightHistoryPoller } from './pollers/flightHistory.js';
import { startWebcamsPollers } from './pollers/webcams/index.js';

const app = Fastify({ logger: true });

// Plugins
await app.register(cors, { origin: config.CORS_ORIGIN });
await app.register(websocket);
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

// Register routes
await app.register(tleRoutes, { prefix: '/api' });
await app.register(nuclearRoutes, { prefix: '/api' });
await app.register(airportsRoutes, { prefix: '/api' });
await app.register(aircraftRoutes, { prefix: '/api' });
await app.register(acledRoutes, { prefix: '/api' });
await app.register(atcRoutes, { prefix: '/api' });
await app.register(militaryRoutes, { prefix: '/api' });
await app.register(telecomRoutes, { prefix: '/api' });
await app.register(airspaceRoutes, { prefix: '/api' });
await app.register(receiversRoutes, { prefix: '/api' });
await app.register(routesRoutes, { prefix: '/api' });
await app.register(healthRoutes, { prefix: '/api' });
await app.register(flightsRoutes, { prefix: '/api' });
await app.register(vesselsRoutes, { prefix: '/api' });
registerVesselWS(app);
await app.register(webcamsRoutes, { prefix: '/api' });
await app.register(weatherRoutes, { prefix: '/api' });
await app.register(geoipRoutes, { prefix: '/api' });

// Verify DB connection
try {
  await db.raw('SELECT 1');
  app.log.info('PostgreSQL connected');
} catch (e) {
  app.log.error('PostgreSQL connection failed:', e.message);
  process.exit(1);
}

// Start pollers
startTlePoller();
startAirportsPoller();
startAircraftPoller();
startAcledPoller();
startAtcPoller();
startMilitaryPoller();
startTelecomPoller();
startAirspacePoller();
startReceiversPoller();
startOpenSkyPoller();
startAirplanesLivePoller();
startFlightHistoryPoller();
startWebcamsPollers();

// Start server
try {
  await app.listen({ port: config.PORT, host: config.HOST });
  app.log.info(`API listening on ${config.HOST}:${config.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
