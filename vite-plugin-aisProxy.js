/**
 * Vite plugin — proxy WebSocket para AISStream.io
 *
 * O browser conecta em ws://localhost:<port>/ws/vessels e envia a subscription
 * (sem APIKey). O plugin injeta a key server-side, abre a conexão com o
 * AISStream e repassa as mensagens nos dois sentidos.
 *
 * Isso resolve o bloqueio de CORS do AISStream e mantém a API key fora do
 * bundle do frontend.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const AIS_URL = 'wss://stream.aisstream.io/v0/stream';

function loadApiKey() {
  try {
    const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    const match = envFile.match(/^VITE_AISSTREAM_API_KEY=(.+)$/m);
    return match?.[1]?.trim() || '';
  } catch {
    return '';
  }
}

export default function aisProxyPlugin() {
  return {
    name: 'vite-plugin-ais-proxy',

    configureServer(server) {
      const API_KEY = loadApiKey();
      if (!API_KEY) {
        console.warn('[ais-proxy] VITE_AISSTREAM_API_KEY não configurada — proxy desabilitado');
        return;
      }

      const wss = new WebSocketServer({ noServer: true });

      // Intercepta upgrade requests em /ws/vessels
      server.httpServer.on('upgrade', (req, socket, head) => {
        if (req.url !== '/ws/vessels') return; // deixa o Vite HMR passar

        wss.handleUpgrade(req, socket, head, (clientWs) => {
          wss.emit('connection', clientWs, req);
        });
      });

      wss.on('connection', (clientWs) => {
        let upstream = null;

        clientWs.on('message', (raw) => {
          let msg;
          try { msg = JSON.parse(raw); } catch { return; }

          // Injeta a API key na subscription do client
          msg.APIKey = API_KEY;

          const boxes = msg.BoundingBoxes;
          if (boxes) console.log('[ais-proxy] subscription bbox:', JSON.stringify(boxes));

          if (upstream && upstream.readyState === WebSocket.OPEN) {
            // Update subscription — reenvia para o AISStream
            try { upstream.send(JSON.stringify(msg)); } catch { /* closed mid-send */ }
            return;
          }

          // Primeira subscription — abre conexão upstream
          upstream = new WebSocket(AIS_URL);

          upstream.on('open', () => {
            console.log('[ais-proxy] connected to AISStream');
            try { upstream.send(JSON.stringify(msg)); } catch { /* closed mid-send */ }
          });

          upstream.on('message', (data) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              try { clientWs.send(data.toString()); } catch { /* closed mid-send */ }
            }
          });

          upstream.on('close', () => {
            console.log('[ais-proxy] upstream closed');
            if (clientWs.readyState === WebSocket.OPEN) {
              try { clientWs.close(); } catch { /* ignore */ }
            }
          });

          upstream.on('error', (err) => {
            console.error('[ais-proxy] upstream error:', err.message);
            upstream = null;
          });
        });

        clientWs.on('close', () => {
          if (upstream) { try { upstream.close(); } catch { /* ignore */ } upstream = null; }
        });

        clientWs.on('error', () => {
          if (upstream) { try { upstream.close(); } catch { /* ignore */ } upstream = null; }
        });
      });

      console.log('[ais-proxy] WebSocket proxy ready on /ws/vessels');
    },
  };
}
