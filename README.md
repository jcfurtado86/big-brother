# Big Brother

Dashboard de monitoramento global em tempo real com globo 3D interativo. Rastreia aeronaves, embarcacoes, satelites, infraestrutura de telecom, bases militares, usinas nucleares, conflitos (ACLED), eventos geopoliticos (GDELT), cameras ao vivo, aeroportos, zonas de exclusao aerea, rotas aereas/maritimas, navios sancionados (OFAC) e clima — tudo em uma unica interface com playback historico e briefing regional.

Arquitetura cliente-servidor: **API** (Fastify + PostgreSQL/PostGIS) e **Web** (React 19 + CesiumJS + Vite).

---

## Sumario

- [Requisitos](#requisitos)
- [Instalacao](#instalacao)
- [Configuracao](#configuracao)
- [Rodando o projeto](#rodando-o-projeto)
- [APIs e fontes de dados](#apis-e-fontes-de-dados)
- [Banco de dados](#banco-de-dados)
- [Arquitetura](#arquitetura)
- [Funcionalidades](#funcionalidades)
- [Timeline (Historico)](#timeline-historico)
- [Scripts](#scripts)
- [Limitacoes dos dados](#limitacoes-dos-dados)

---

## Requisitos

- **Node.js** >= 18
- **PostgreSQL** >= 14 com extensao **PostGIS**
- **npm** (ou yarn/pnpm)
- Navegador moderno com suporte a WebGL (Chrome, Firefox, Edge)

## Instalacao

```bash
git clone <repo-url>
cd big-brother

# API
cd api && npm install

# Web
cd ../web && npm install
```

## Configuracao

### API (`api/.env`)

```env
# Servidor
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=*

# PostgreSQL + PostGIS
PG_HOST=localhost
PG_PORT=5432
PG_USER=seu-usuario
PG_PASS=sua-senha
PG_DB=bigbrother

# API Keys
OPENSKY_CLIENT_ID=seu-client-id
OPENSKY_CLIENT_SECRET=seu-client-secret
OWM_API_KEY=sua-chave-owm
AISSTREAM_API_KEY=sua-chave-aisstream
OPENAIP_API_KEY=sua-chave-openaip
WINDY_WEBCAMS_KEY=sua-chave-windy

# ACLED (para atualizar dados de conflitos)
ACLED_USER=seu-email
ACLED_PASS=sua-senha
```

### Web (`web/.env`)

```env
VITE_API_URL=http://localhost:3001
VITE_CESIUM_ION_TOKEN=seu-token-cesium
```

---

## Rodando o projeto

### 1. Preparar o banco

```bash
cd api
npm run migrate        # cria tabelas e indices
```

### 2. Iniciar a API

```bash
cd api
npm run dev            # com --watch (desenvolvimento)
# ou
npm start              # producao
```

A API inicia em `http://localhost:3001`. Os pollers comecam automaticamente: OpenSky (2min), Airplanes.live (10s), AISStream (WebSocket persistente), CelesTrak (24h), GDELT (15min), OFAC SDN (24h), receptores (1h), ACLED/militar/ATC/telecom (7d), aeroportos/aircraft (30d).

### 3. Iniciar o frontend

```bash
cd web
npm run dev
```

O Vite inicia em `http://localhost:5173` com Hot Module Replacement.

### Build de producao

```bash
cd web
npm run build          # gera dist/
npm run preview        # testa o build localmente
```

---

## APIs e fontes de dados

### Tempo real

| Camada | Fonte | Tipo | Auth | Intervalo |
|--------|-------|------|------|-----------|
| Aeronaves | OpenSky Network | REST | OAuth2 | 2 min |
| Aeronaves | Airplanes.live | REST | Nenhuma | 10 s |
| Embarcacoes | AISStream | WebSocket | API Key | Tempo real |
| Satelites | CelesTrak | REST | Nenhuma | 24 h |
| Clima (nuvens) | OpenWeatherMap | Tiles PNG | API Key | 1 h |
| Receptores ADS-B | adsb.lol | REST | Nenhuma | 1 h |

### Dados periodicos (pollers com persistencia no banco)

| Camada | Fonte | Intervalo |
|--------|-------|-----------|
| Aeroportos | OurAirports (CSV) | 30 dias |
| Aircraft DB | OpenSky metadata | 30 dias |
| Bases militares | Overpass API (OSM) | 7 dias |
| Radares/torres ATC | Overpass API (OSM) | 7 dias |
| Infraestrutura telecom | Overpass API (OSM) | 7 dias |
| Zonas de exclusao aerea | OpenAIP | 24 h |
| Conflitos (ACLED) | ACLED CSV/XLSX | 7 dias |
| Eventos geopoliticos | GDELT Event Export (CSV) | 15 min |
| Navios sancionados | OFAC SDN (CSV) | 24 h |
| Usinas nucleares | Overpass API (OSM) | 7 dias |
| Cameras ao vivo | Windy, OTCM, GOV, DOT | 24 h |
| Estacoes AIS | AISStream | 1 h |

### Outros servicos

| Servico | Fonte | Auth |
|---------|-------|------|
| Noticias relacionadas | GDELT DOC API | Nenhuma |
| Terreno 3D | Cesium Ion | Token |
| Busca de locais | Nominatim (OSM) | Nenhuma |
| Geolocalizacao por IP | ip-api.com | Nenhuma |

---

## Banco de dados

PostgreSQL com PostGIS. Tabelas principais:

| Tabela | Registros | Descricao |
|--------|-----------|-----------|
| `airports` | ~40K | Aeroportos mundiais com geometria |
| `acled_events` | ~900K | Eventos de conflito (Africa, Asia, Europa, Americas) |
| `gdelt_events` | Crescente | Eventos geopoliticos do GDELT (conflitos, protestos, desastres) |
| `telecom_points` | ~100K | Torres, data centers, infraestrutura |
| `webcams` | ~90K | Cameras ao vivo (multi-provider) |
| `adsb_receivers` | ~20K | Receptores ADS-B/MLAT |
| `airspaces` | ~10K | Poligonos de zonas de exclusao |
| `military_points` | ~8K | Bases militares (OSM) |
| `atc_points` | ~5K | Radares e torres ATC |
| `sanctioned_vessels` | ~1.5K | Navios sancionados OFAC SDN (IMO, MMSI, programa) |
| `nuclear_plants` | ~400 | Usinas nucleares |
| `aircraft` | ~300K | Metadados de aeronaves por ICAO24 |
| `tle_data` | 1 | TLEs de ~15K satelites (atualizado diariamente) |
| `air_routes` | ~30K | Rotas aereas (LineString) |
| `sea_routes` | ~3 categorias | Rotas maritimas (GeoJSON) |
| `flight_history` | Crescente | Snapshots de posicao a cada 5 min (retencao 30 dias) |
| `vessel_history` | Crescente | Snapshots de posicao a cada 5 min (retencao 30 dias) |
| `ais_stations` | Crescente | Estacoes base AIS |

### Migrations

```bash
cd api
npm run migrate              # aplica todas as migrations pendentes
npm run migrate:rollback     # desfaz a ultima migration
```

---

## Arquitetura

```
big-brother/
├── api/                           # Backend (Fastify)
│   ├── src/
│   │   ├── index.js               # Entrypoint: plugins, rotas, pollers
│   │   ├── db.js                  # Conexao Knex + PostgreSQL
│   │   ├── config.js              # Variaveis de ambiente
│   │   ├── routes/                # 20+ endpoints REST + WebSocket
│   │   │   ├── flights.js         # Voos live + historico
│   │   │   ├── vessels.js         # Embarcacoes live + historico + check sancoes
│   │   │   ├── satellites.js      # TLEs
│   │   │   ├── acled.js           # Eventos com filtro de periodo/data
│   │   │   ├── gdelt.js           # GDELT live + noticias relacionadas
│   │   │   ├── heatmap.js         # Heatmap de tensao global (ACLED + GDELT)
│   │   │   ├── briefing.js        # Briefing regional agregado
│   │   │   ├── weather.js         # Proxy de tiles OWM (cache 10min)
│   │   │   └── ...                # airports, military, atc, telecom, etc.
│   │   ├── pollers/               # 15 pollers com intervalos configuraveis
│   │   │   ├── sanctions.js       # OFAC SDN — navios sancionados (diario)
│   │   │   ├── gdeltPoller.js     # GDELT Event Export CSV (15min)
│   │   │   └── ...
│   │   ├── streams/               # AISStream WebSocket persistente
│   │   ├── cache/                 # Caches in-memory (voos, navios + flag sancoes)
│   │   ├── migrations/            # 10 migrations (schema completo)
│   │   └── utils/                 # Scheduler, spatial helpers
│   └── scripts/
│       └── update-acled.mjs       # Download ACLED (login + XLSX → CSV)
│
├── web/                           # Frontend (React 19 + CesiumJS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── App.jsx            # Raiz: providers + layout
│   │   │   ├── Globe.jsx          # Viewer Cesium + terreno + right-click
│   │   │   ├── ControlPanel.jsx   # Toggles de camadas por categoria
│   │   │   ├── SettingsPanel.jsx  # Configuracoes avancadas
│   │   │   ├── SearchBox.jsx      # Busca Nominatim
│   │   │   ├── BriefingPanel.jsx  # Briefing regional (right-click)
│   │   │   ├── GdeltToast.jsx     # Notificacoes de eventos criticos
│   │   │   ├── ClockDisplay.jsx   # Relogio (live ou historico)
│   │   │   ├── InfoBar.jsx        # Lat/lon do cursor
│   │   │   ├── TimelineBar.jsx    # Controles de playback historico
│   │   │   ├── TimelineActivator.jsx # Botao de ativacao da timeline
│   │   │   ├── *Card.jsx          # Cards de detalhe (Flight, Vessel, Gdelt, etc.)
│   │   │   └── layers/            # 17 layer managers (renderizam null)
│   │   │       ├── FlightManager.jsx
│   │   │       ├── VesselManager.jsx
│   │   │       ├── SatelliteManager.jsx
│   │   │       ├── AcledManager.jsx
│   │   │       ├── GdeltLiveManager.jsx
│   │   │       ├── TensionManager.jsx
│   │   │       ├── WebcamManager.jsx
│   │   │       └── ...
│   │   ├── contexts/
│   │   │   ├── LayerContext.jsx    # Estado de todas as camadas (useReducer)
│   │   │   ├── ViewerContext.jsx   # Instancia do Cesium Viewer
│   │   │   ├── SelectionContext.jsx # Registry de selecao + right-click
│   │   │   ├── TimelineContext.jsx # Estado global de tempo + playback
│   │   │   └── LoadingContext.jsx  # Indicador de carregamento
│   │   ├── hooks/                 # Hooks reutilizaveis (useBillboardLayer, etc.)
│   │   ├── providers/             # Servicos, icones, constantes
│   │   ├── utils/                 # Interpolacao, bbox, canvas labels
│   │   └── assets/                # SVGs, icones, bandeiras
│   └── vite.config.js
│
└── public/data/acled/             # CSVs da ACLED (gerados pelo script)
```

### Principios

- **Cada camada = 1 manager**: Novo layer = novo manager em `layers/` + toggle no `ControlPanel`
- **Context-driven**: Estado via `LayerContext` (useReducer), sem prop drilling
- **Selection registry**: Clique centralizado via `SelectionContext` — cada manager registra seu handler
- **Right-click briefing**: Botao direito no globo gera briefing agregado da regiao (conflitos, midia, infraestrutura)
- **Render on demand**: `requestRenderMode = true` — Cesium so re-renderiza quando necessario
- **Pollers autonomos**: API coleta dados em background, frontend so consulta
- **Sancoes em tempo real**: Navios cruzados contra lista OFAC SDN via Sets in-memory no cache

---

## Funcionalidades

### Camadas de dados
- **Trafego aereo**: Aeronaves em tempo real (OpenSky + Airplanes.live), aeroportos, rotas aereas, zonas de exclusao, receptores ADS-B
- **Trafego maritimo**: Embarcacoes AIS em tempo real, rotas maritimas, antenas AIS, deteccao de navios sancionados (OFAC)
- **Satelites**: ~15K satelites com propagacao SGP4 (LEO, MEO, GEO)
- **Infraestrutura**: Telecom (torres, data centers), ATC (radares, torres), bases militares, usinas nucleares
- **Eventos**: Conflitos ACLED (6 categorias), eventos GDELT ao vivo (5 categorias), heatmap de tensao global
- **Cameras**: ~90K webcams ao vivo de multiplos provedores
- **Ambiente**: 6 camadas de mapa base, relevo 3D, ciclo dia/noite, nuvens com opacidade

### Interacao
- **Clique esquerdo**: Seleciona entidade e abre card de detalhe
- **Clique direito**: Gera briefing da regiao (raio 200km) com conflitos, midia, infraestrutura, alertas
- **Busca**: Nominatim para locais, voar ate coordenadas
- **Filtros**: Cada camada com subcategorias filtraveis, periodo configuravel

### Alertas
- **GDELT Toast**: Notificacoes em tempo real de eventos criticos (Goldstein <= -7 ou tom <= -15)
- **Navios sancionados**: Cor roxa no mapa, badge "SANCIONADO" no card com programa de sancoes
- **Heatmap de tensao**: Overlay visual combinando ACLED (70%) + GDELT (30%), com opacidade ajustavel

---

## Timeline (Historico)

O app suporta playback historico global. Quando ativado:

- **Voos e embarcacoes**: Posicoes interpoladas a partir de `flight_history` e `vessel_history` (snapshots a cada 5 min)
- **Satelites**: Propagacao SGP4 com TLEs para qualquer data (sem necessidade de historico no banco)
- **ACLED**: Filtro client-side por data, respeitando o periodo selecionado (1d/7d/30d) relativo ao tempo do playback
- **Heatmap de tensao**: Calcula tensao a partir da data selecionada na timeline

### Controles

- Play/Pause, velocidade (1x a 60x), scrub no slider
- Range configuravel: 1h, 6h, 12h, 24h, 3d, 7d
- Teclado: Space = play/pause, setas = seek

---

## Scripts

### Atualizar dados ACLED

```bash
cd api
node scripts/update-acled.mjs
```

Faz login no site ACLED, baixa XLSX das 6 regioes, converte pra CSV. O poller da API importa os CSVs automaticamente na proxima execucao.

Requer `ACLED_USER` e `ACLED_PASS` no `.env`.

---

## Limitacoes dos dados

### OpenSky Network
- Rate limit de ~400 req/dia com auth. Polling padrao a cada 2 min
- Cobertura depende de receptores ADS-B voluntarios — oceanos tem cobertura limitada
- Latencia de ~5-15s em relacao ao tempo real

### Airplanes.live
- Rate limit de 1 req/s por IP. Raio maximo de 250nm por consulta
- Cobertura baseada em rede propria de feeders ADS-B

### AISStream
- Cobertura limitada a embarcacoes com AIS ativo e dentro do alcance de estacoes terrestres/satelites
- Oceano aberto: cobertura intermitente. Reconexao automatica do WebSocket

### CelesTrak / SGP4
- TLEs atualizados 1-2x por dia. Precisao de ~1 km para orbitas baixas
- Catalogo ativo: ~15K satelites

### ACLED
- Dados agregados semanais. Atualizacao depende da publicacao da ACLED (geralmente segundas)
- ~900K eventos historicos (2018-presente)

### GDELT
- Event Export atualizado a cada 15 min. Cobertura global de eventos geopoliticos
- DOC API para noticias relacionadas (sem auth, rate limit leve)
- Tom e escala Goldstein podem ter ruido em eventos ambiguos

### OFAC SDN
- Lista atualizada diariamente. ~1.5K navios sancionados
- Cruzamento por MMSI e IMO extraidos do campo remarks do CSV
- Cobertura depende da presenca de MMSI/IMO na lista (nem todos os navios tem)

### OpenWeatherMap
- Tiles de zoom 2 (padrao) com baixa resolucao. Cache de 10 min no servidor
- Somente nuvens implementadas. Sem historico no plano gratuito

### Historico (Timeline)
- Snapshots a cada 5 min — posicoes entre snapshots sao interpoladas linearmente
- Retencao de 30 dias. Volume: ~3K voos + ~15K embarcacoes por snapshot
