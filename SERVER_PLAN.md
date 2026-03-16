# Plano: Backend Centralizado (Server-Side Aggregation)

## Problema

Cada sessão de cliente faz suas próprias chamadas para todas as APIs externas. Com N usuários simultâneos, o consumo de API escala linearmente — rate limits são atingidos, custos aumentam, e APIs podem bloquear o IP.

## Solução

Um servidor Node.js centralizado que:
1. Faz as chamadas às APIs externas (1 vez, independente de quantos clientes)
2. Cacheia os resultados em memória + Redis
3. Serve os clientes via REST e SSE/WebSocket

## Arquitetura

```
┌──────────────┐       ┌──────────────────────────────────────────┐       ┌────────────────┐
│  Browser A   │       │            Servidor Node.js              │       │ APIs Externas   │
│  Browser B   │◄─────►│                                          │◄─────►│                │
│  Browser C   │  REST  │  ┌────────────┐   ┌──────────────────┐  │       │ OpenSky        │
│  ...         │  SSE   │  │ Cache      │   │ Pollers / WS     │  │       │ Airplanes.live │
│              │  WS    │  │ (Redis)    │   │ (1 por API)      │  │       │ AISStream      │
└──────────────┘       └──────────────────────────────────────────┘       │ CelesTrak      │
                                                                          └────────────────┘
```

## Stack

- **Runtime:** Node.js
- **Framework:** Fastify (leve, rápido, suporte nativo a WebSocket)
- **Cache:** Redis (compartilhado entre instâncias, pub/sub para fan-out)
- **Frontend:** React + Vite (estático, sem proxies — aponta direto para o servidor)

## Endpoints do Servidor

### REST (dados cacheados)

| Endpoint | Fonte | Cache TTL | Descrição |
|----------|-------|-----------|-----------|
| `GET /api/flights/opensky` | OpenSky | 60s | Snapshot global de voos |
| `GET /api/flights/airplaneslive?lat=&lon=&r=` | Airplanes.live | 10s | Voos por região (250nm max) |
| `GET /api/aircraft/:icao24` | DB local + Airplanes.live | 24h | Metadados de aeronave |
| `GET /api/tle` | CelesTrak | 24h | TLE de satélites ativos |
| `GET /api/geoip` | ip-api.com | 1h | Geolocalização do IP |

### SSE / WebSocket (tempo real)

| Endpoint | Fonte | Descrição |
|----------|-------|-----------|
| `GET /api/vessels/stream` (SSE) | AISStream | Stream de navios, filtrado por bbox do cliente |
| `WS /ws/vessels` (WebSocket) | AISStream | Alternativa bidirecional — cliente envia bbox, recebe navios |

## Estratégia por API

### OpenSky Network
- **Hoje:** Cada cliente faz 1 poll/60s (global)
- **Servidor:** 1 poller único, poll a cada 60s, salva snapshot completo no Redis
- **Cliente:** `GET /api/flights/opensky` → retorna snapshot do cache
- **Auth:** OAuth2 com credenciais no servidor (não expõe no frontend)
- **Ganho:** N clientes = 1 chamada/min (vs N chamadas/min)

### Airplanes.live
- **Hoje:** Cada cliente faz 1 poll/10s por bbox (max 250nm)
- **Servidor:** Duas estratégias possíveis:

  **Opção A — Grid fixo (simples):**
  Servidor faz polling de ~20 regiões pré-definidas (grandes centros de tráfego aéreo) a cada 10s, intercalados para respeitar 1 req/s. Cobre ~80% do tráfego global.
  ```
  Regiões: São Paulo, New York, London, Dubai, Tokyo, ...
  20 regiões × 1 req/s = ciclo completo a cada 20s
  ```

  **Opção B — Demand-driven (eficiente):**
  Servidor agrega os bboxes dos clientes ativos, deduplica regiões sobrepostas, faz as chamadas necessárias. Se 10 clientes olham para SP, é 1 chamada só.
  ```
  Cliente A → bbox SP     ┐
  Cliente B → bbox SP     ├→ 1 chamada para SP
  Cliente C → bbox SP     ┘
  Cliente D → bbox London → 1 chamada para London
  Total: 2 chamadas (em vez de 40)
  ```

- **Recomendação:** Começar com Opção A, migrar para B quando escalar

### AISStream (Navios)
- **Hoje:** 1 WebSocket por cliente (cada um com seu bbox)
- **Servidor:** 1 WebSocket com bbox global (ou union dos bboxes ativos)
- **Fan-out:** Servidor recebe todos os navios, filtra por bbox de cada cliente, envia via SSE
- **Alternativa:** WebSocket bidirecional — cliente envia bbox, servidor filtra e encaminha
- **Ganho:** 1 conexão AISStream (vs N conexões)

### CelesTrak (Satélites)
- **Hoje:** Cada cliente faz 1 fetch/dia, cacheia em IDB
- **Servidor:** 1 fetch/dia, salva em Redis/disco
- **Cliente:** `GET /api/tle` → retorna TLE cacheado
- **Mais simples de todos:** Dado muda 1x/dia, ~2MB de texto

### OpenWeatherMap
- **Hoje:** Tiles de mapa carregados diretamente do CDN
- **Servidor:** Proxy com cache de tiles (Redis, TTL 10min)
- **Ganho:** Tiles populares servidos do cache, reduz chamadas à OWM

### Dados Estáticos com Refresh Periódico

Vários datasets hoje são carregados como arquivos estáticos pelo frontend. No servidor, esses dados devem ser consumidos por serviços background que rodam periodicamente, processam e servem via REST:

| Dataset | Fonte | Frequência | Endpoint |
|---------|-------|------------|----------|
| ACLED (conflitos) | XLSX do site ACLED (login + scrape) | Semanal (seg 7h) | `GET /api/acled` |
| Militar (bases) | OSM Overpass | Semanal | `GET /api/military` |
| ATC (radares/torres) | OSM Overpass | Semanal | `GET /api/atc` |
| Telecom (antenas) | OSM Overpass + OpenCelliD | Semanal | `GET /api/telecom` |
| Nuclear (usinas) | IAEA PRIS | Mensal | `GET /api/nuclear` |
| Airspace (zonas) | OpenAIP | Mensal | `GET /api/airspace` |
| Aeroportos | OurAirports CSV | Mensal | `GET /api/airports` |
| LiveUAMap (emergentes) | LiveUAMap API | Poll ~5min | `GET /api/liveuamap` |

### LiveUAMap — Eventos Emergentes (Tempo Real)

Complementa o ACLED: enquanto o ACLED entrega dados agregados semanalmente, o LiveUAMap cobre eventos emergentes em tempo real (conflitos, protestos, desastres, terrorismo).

- **API:** `https://a.liveuamap.com/api?a=mpts&resid={region}&time={unix_ts}&count=100&key={api_key}`
- **Auth:** API key (~$85/ano) — contato: `api@liveuamap.com`
- **Dados:** JSON com `name`, `lat`, `lng`, `timeDt`
- **Estratégia:** Servidor faz poll a cada ~5min, acumula eventos da semana atual. Quando o ACLED semanal é atualizado (segunda 7h), os eventos LiveUAMap da semana anterior são descartados (já cobertos pelo ACLED).
- **Frontend:** Mesmo layer de conflitos, com ícone diferenciado (ex: pulsar/glow) para eventos "quentes" vs históricos ACLED.
- **Fallback:** Se API key não disponível, scraping como alternativa (projetos open-source existem).
- notícias geopolíticas (GDELT) usar junto com o timeline e mostrar as noticias do dia

**Vantagens:**
- Frontend não precisa parsear XLSX/CSV/JSON gigantes — servidor entrega dados já processados
- Um único processo baixa e processa, N clientes consomem o resultado
- Possibilidade de agregar/indexar por região para queries espaciais rápidas
- API keys e credenciais ficam no servidor

**Implementação:**
- Cada dataset tem um poller/worker com intervalo configurável
- Worker baixa → processa → salva em Redis (com timestamp)
- Endpoint REST lê do Redis e retorna JSON
- Se Redis vazio (cold start), worker roda imediatamente


## Modelo de Cache (Redis)

```
flights:opensky          → JSON do Map completo         TTL 90s
flights:al:{lat}:{lon}   → JSON do Map por região       TTL 15s
aircraft:{icao24}        → JSON de metadados             TTL 24h
tle:active               → Texto TLE bruto               TTL 24h
geoip:{ip}               → JSON de geolocalização        TTL 1h
vessels:stream            → Pub/Sub channel (fan-out)
owm:tile:{layer}:{z}:{x}:{y} → Buffer do tile PNG       TTL 10min
```

## Segurança

- **API keys** ficam exclusivamente no servidor (não no frontend)
- **CORS** restrito ao domínio do frontend
- **Rate limiting** por IP no servidor (protege contra abuso de clientes)
- **Sem credenciais expostas** — frontend não tem `.env` com secrets

## Estrutura de Diretórios

```
server/
├── index.js                  # Entry point, Fastify setup
├── config.js                 # Env vars, intervalos, regiões
├── cache.js                  # Redis wrapper (get/set/pub/sub)
├── pollers/
│   ├── opensky.js            # Poll OpenSky a cada 60s
│   ├── airplaneslive.js      # Poll Airplanes.live (grid ou demand)
│   └── celestrak.js          # Fetch TLE 1x/dia
├── streams/
│   └── aisstream.js          # 1 WebSocket → Redis pub/sub
├── routes/
│   ├── flights.js            # GET /api/flights/*
│   ├── aircraft.js           # GET /api/aircraft/:icao24
│   ├── tle.js                # GET /api/tle
│   ├── vessels.js            # SSE /api/vessels/stream
│   └── geoip.js              # GET /api/geoip
└── utils/
    └── bbox.js               # Helpers de bbox, merge, overlap
```

## Mudanças no Frontend

1. **Remover proxies do Vite** — não precisa mais
2. **Apontar para o servidor** — `VITE_API_URL=https://api.sentinela.app`
3. **Remover API keys do .env.local** — ficam só no servidor
4. **Providers apontam para o servidor** em vez de APIs externas:
   - `openskyService.js`: `fetch('/api/flights/opensky')` → sem mudança de rota, só o destino muda
   - `airplanesLiveService.js`: idem
   - `vesselService.js`: WebSocket aponta para `/ws/vessels` do servidor
   - `satelliteService.js`: `fetch('/api/tle')` → idem
5. **Remover vite-plugin-aisProxy.js** — servidor cuida do WebSocket
6. **O FRONT DEVE CONTINUAR COM AS LOGICAS DE CACHE JÁ IMPLEMENTADAS PRA NAO PESAR NO MEU BACKEND**
7. **Lógica de atualização para dados estáticos no frontend:**
   - Ao carregar a app, checar `Last-Modified` ou `ETag` via `HEAD` request ao servidor
   - Se dado local (IDB) é mais antigo que o servidor, buscar nova versão
   - Se igual, usar cache local sem fetch
   - Intervalo de re-check: a cada 1h para dados que mudam semanalmente, a cada 24h para mensais
   - Datasets grandes (ACLED ~6 CSVs, TLE ~2MB): só baixar diff ou timestamp novo

## Sequência de Implementação

### Fase 1 — Fundação
1. Setup Fastify + Redis
2. Implementar cache.js (wrapper Redis)
3. Rota `GET /api/tle` + poller CelesTrak (mais simples)
4. Testar: frontend aponta para servidor, satélites funcionam

### Fase 2 — Voos
5. Poller OpenSky (global, 1 poll/min)
6. Rota `GET /api/flights/opensky`
7. Poller Airplanes.live (grid fixo)
8. Rota `GET /api/flights/airplaneslive`
9. Rota `GET /api/aircraft/:icao24` (cache de metadados)

### Fase 3 — Navios
10. Stream AISStream (1 WebSocket → Redis pub/sub)
11. Rota SSE `GET /api/vessels/stream` (fan-out filtrado por bbox)
12. Remover vite-plugin-aisProxy.js

### Fase 4 — Extras
13. Proxy OWM tiles com cache
14. Rate limiting por IP
15. CORS configurado
16. Health check + métricas básicas

### Fase 5 — Deploy
17. Dockerfile (servidor)
18. Docker Compose (servidor + Redis)
19. Frontend build estático (Vite build → CDN/nginx)
20. Configurar domínio + HTTPS

## Estimativa de Recursos

| Componente | Memória | CPU |
|------------|---------|-----|
| Servidor Node.js | ~100-200MB | Baixo (I/O bound) |
| Redis | ~50-100MB (depende de dados cacheados) | Mínimo |
| Total | ~200-300MB | 1 vCPU suficiente para ~100 clientes |

## Cron Jobs

### ACLED (Conflitos Armados)
- **Script:** `node scripts/update-acled.mjs`
- **Frequência:** Toda segunda-feira às 7h
- **O que faz:** Login no ACLED → scrape 6 páginas regionais → baixa XLSX → converte para CSV → salva em `public/data/acled/`
- **Env vars:** `ACLED_USER`, `ACLED_PASS`
- **Cron:** `0 7 * * 1 cd /path/to/sentinela && node scripts/update-acled.mjs`
- **Regiões:** Africa, Middle East, Asia-Pacific, Europe+Central Asia, Latin America+Caribbean, US+Canada

## O que NÃO muda

- Toda a lógica de renderização (Cesium, billboards, dead reckoning)
- IDB cache no cliente (continua como cache local L2)
- Lógica de categorização, ícones, filtros
- Componentes React (FlightCard, VesselCard, ControlPanel)
- Propagação orbital (satellite.js roda no cliente)




### Webcams (Multi-Provider)

Hoje o frontend faz fetch direto para cada provider de webcam. No servidor, centralizar:

| Provider | Fonte | Cameras | Cache TTL | Endpoint |
|----------|-------|---------|-----------|----------|
| Windy | Windy Webcams API | ~65K | 1h | `GET /api/webcams/windy?bbox=S,W,N,E` |
| OTCM | GitHub JSON estático | ~7.5K | 7 dias | `GET /api/webcams/otcm` |
| DOT (Caltrans) | CWWP2 JSON (12 distritos) | ~2K+ | 24h | `GET /api/webcams/dot` |
| DOT (IBI 511) | 511 APIs (10 estados) | varia | 24h | (merge no dot) |
| DOT (OHGO) | OHGO API | ~200 | 24h | (merge no dot) |
| DOT (WSDOT) | WSDOT API | ~500 | 24h | (merge no dot) |
| Gov (Digitraffic) | Finlândia JSON | ~400 | 6h | `GET /api/webcams/gov` |
| Gov (TfL) | Londres JSON | ~900 | 6h | (merge no gov) |
| Gov (Singapore) | LTA JSON | ~90 | 6h | (merge no gov) |
| Gov (USGS) | Vulcões JSON | ~40 | 6h | (merge no gov) |
| Gov (DGT) | Espanha DATEX II XML | ~1.9K | 6h | (merge no gov) |
| Gov (JMA) | Japão GeoJSON | ~93 | 6h | (merge no gov) |
| **Total** | | **~90K+** | | `GET /api/webcams/all` |

**Ganho:** API keys (Windy, 511, OHGO, WSDOT) ficam no servidor. Parsing de XML/GeoJSON roda 1x no servidor, N clientes recebem JSON pronto.

**Nota sobre imagens:** As webcams snapshot (gov, dot, otcm timelapse) servem JPEGs que atualizam no servidor a cada poucos minutos. O frontend faz auto-refresh da `<img>` a cada 10s com cache-busting (`?_t=timestamp`). Clipes MP4 (TfL) refresh a cada 60s. Isso não muda com o backend — é lógica de apresentação do card.

---

## AVALIAR DEPOIS (precisa key/registro ou parsing extra)

| Base | País | Cameras | Bloqueio |
|------|------|---------|----------|
| Noruega Vegvesen | Noruega | ~centenas | Registro por email, DATEX II XML |
| Taiwan TDX | Taiwan | muitas | OAuth2 + registro |
| Coreia ITS | Coreia do Sul | muitas | Geo-restrito (só IPs coreanos) |
| CET São Paulo | Brasil | dezenas | Sem API, scraping, sem coordenadas |
| DER-SP | Brasil | desconhecido | Dados em XLSX, imagens via scraping |

**Descartados (pesquisados e inviáveis):**
- Insecam — scraping, sem API, CORS, questionável legalmente
- EarthCam — API comercial cara, sem tier gratuito
- TrafficLand — API depreciada/offline
- We4City — API sem dados reais, coordenadas aproximadas
- Helios — sem API pública encontrada
- Shodan — ~2K cameras com coordenadas mas a maioria offline/expirada, esforço alto vs retorno baixo

---

## Descoberta de Câmeras

**Problema:** Com 90K+ câmeras no globo, é difícil o usuário encontrar uma câmera específica navegando pelo mapa.

**Soluções possíveis:**

1. **Busca por texto** — Campo de busca no ControlPanel que filtra por título, cidade, país, provider. Ao selecionar, voa até a câmera e abre o card. Simples e eficaz.

2. **Lista/Painel lateral** — Sidebar com lista scrollável das câmeras visíveis no viewport atual, agrupadas por provider. Clicar numa centraliza e seleciona.

3. **Busca por país/região** — Dropdown hierárquico: País → Região → Cidade → Câmeras disponíveis.

**Recomendação:** Opção 1 (busca por texto) é a mais leve e útil. Pode ser um input no card de webcams do ControlPanel com autocomplete debounced. O dataset já está em memória (pointsMap), então a busca é instantânea sem chamadas extras.
