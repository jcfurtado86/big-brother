# Big Brother

Dashboard de monitoramento global em tempo real com globo 3D interativo. Rastreia aeronaves, embarcações, satelites, infraestrutura de telecom, aeroportos, rotas aereas/maritimas e clima — tudo em uma unica interface.

Construido com **React 19**, **Cesium** (globo 3D) e **Vite**.

---

## Sumario

- [Requisitos](#requisitos)
- [Instalacao](#instalacao)
- [Configuracao](#configuracao)
- [APIs e fontes de dados](#apis-e-fontes-de-dados)
- [Rodando o projeto](#rodando-o-projeto)
- [Variaveis de ambiente](#variaveis-de-ambiente)
- [Arquitetura](#arquitetura)
- [Limitacoes dos dados](#limitacoes-dos-dados)

---

## Requisitos

- **Node.js** >= 18
- **npm** (ou yarn/pnpm)
- Navegador moderno com suporte a WebGL (Chrome, Firefox, Edge)

## Instalacao

```bash
git clone <repo-url>
cd big-brother
npm install
```

## Configuracao

Crie um arquivo `.env.local` na raiz do projeto com as chaves de API necessarias:

```env
# ── API Keys ─────────────────────────────────────────────────────────────────

# OpenSky Network — credenciais OAuth2 (client credentials)
VITE_OPENSKY_CLIENT_ID=seu-client-id
VITE_OPENSKY_CLIENT_SECRET=seu-client-secret

# OpenWeatherMap — chave da API (plano gratuito)
VITE_OWM_API_KEY=sua-chave-owm

# AISStream — chave da API para tracking de embarcacoes via WebSocket
VITE_AISSTREAM_API_KEY=sua-chave-aisstream

# Cesium Ion — token de acesso para terreno 3D
VITE_CESIUM_ION_TOKEN=seu-token-cesium

# ── Debug / Cache ────────────────────────────────────────────────────────────

# Cachear voos em memoria apos primeiro fetch (evita gastar creditos da API)
VITE_FLIGHT_CACHE=false

# Usar dados falsos em vez da API (para testes offline)
VITE_MOCK_FLIGHTS=false
VITE_MOCK_VESSELS=false
VITE_MOCK_SATELLITES=false

# ── Polling ──────────────────────────────────────────────────────────────────

# Intervalo de polling de voos (ms)
VITE_POLL_INTERVAL_AUTH_MS=60000
VITE_POLL_INTERVAL_ANON_MS=60000

# Delay de retry apos rate-limit ou erro (ms)
VITE_RETRY_INTERVAL_MS=1200000

# TTL do cache de voos (ms)
VITE_FLIGHT_CACHE_TTL_MS=300000
```

---

## APIs e fontes de dados

### Aeronaves (Flights)

| API | Tipo | Autenticacao | Como obter acesso |
|-----|------|-------------|-------------------|
| **OpenSky Network** | REST (polling) | OAuth2 client credentials | Criar conta em [opensky-network.org](https://opensky-network.org), ir em Settings > OAuth Clients e criar um client com grant type `client_credentials` |
| **Airplanes.live** | REST (polling) | Nenhuma | Acesso publico, sem cadastro necessario |

**OpenSky** fornece dados globais (todos os voos de uma vez). **Airplanes.live** fornece dados regionais por raio (ate 250nm de um ponto) com maior frequencia de atualizacao.

O app suporta selecionar entre os providers ou usar ambos simultaneamente ("Todos").

### Embarcacoes (Vessels)

| API | Tipo | Autenticacao | Como obter acesso |
|-----|------|-------------|-------------------|
| **AISStream** | WebSocket (tempo real) | API Key | Criar conta em [aisstream.io](https://aisstream.io) e gerar uma API key |

Recebe dados AIS em tempo real filtrados por bounding box. A chave da API e injetada no servidor (proxy WebSocket do Vite) e nunca exposta no frontend.

### Satelites

| API | Tipo | Autenticacao | Como obter acesso |
|-----|------|-------------|-------------------|
| **CelesTrak** | REST | Nenhuma | Acesso publico, sem cadastro necessario |

Baixa TLEs (Two-Line Elements) do NORAD uma vez por dia. A propagacao orbital e feita localmente usando `satellite.js` (algoritmo SGP4).

### Clima (Weather)

| API | Tipo | Autenticacao | Como obter acesso |
|-----|------|-------------|-------------------|
| **OpenWeatherMap** | Tiles de imagem | API Key | Criar conta em [openweathermap.org](https://openweathermap.org/api), plano gratuito e suficiente. Usar a chave da secao "API keys" |

Exibe camada de nuvens sobre o globo. Tiles atualizados a cada 1h.

### Terreno 3D

| API | Tipo | Autenticacao | Como obter acesso |
|-----|------|-------------|-------------------|
| **Cesium Ion** | Tiles 3D | Token | Criar conta em [ion.cesium.com](https://ion.cesium.com), copiar o Access Token do dashboard |

Sem o token, o globo usa um elipsoide plano (sem relevo). Com o token, usa o Cesium World Terrain com resolucao de ~30m.

### Infraestrutura Telecom

| API | Tipo | Autenticacao | Como obter acesso |
|-----|------|-------------|-------------------|
| **OpenInfraMap** | MVT tiles (vector) | Nenhuma | Acesso publico |

Torres de celular, data centers e linhas de comunicacao. Dados carregados sob demanda conforme zoom (nivel 5-14).

### Receptores ADS-B

| API | Tipo | Autenticacao | Como obter acesso |
|-----|------|-------------|-------------------|
| **adsb.lol** | REST | Nenhuma | Acesso publico |

Localizacoes de feeders/receptores ADS-B da rede MLAT. Atualizado a cada 1h.

### Busca de locais

| API | Tipo | Autenticacao | Como obter acesso |
|-----|------|-------------|-------------------|
| **Nominatim (OpenStreetMap)** | REST | Nenhuma | Acesso publico (respeitar rate limit de 1 req/s) |

### Geolocalizacao por IP

| API | Tipo | Autenticacao | Como obter acesso |
|-----|------|-------------|-------------------|
| **ip-api.com** | REST | Nenhuma | Acesso publico (plano gratuito) |

Usada uma vez na inicializacao para centralizar o globo na localizacao do usuario.

### Dados estaticos (inclusos no projeto)

| Arquivo | Tamanho | Conteudo |
|---------|---------|----------|
| `public/airports.json` | ~11 MB | Base de aeroportos mundial (ICAO, IATA, tipo, coordenadas) |
| `public/air-routes.json` | ~264 KB | Pares origem-destino de rotas aereas |
| `public/sea-routes.geojson` | ~1.2 MB | Rotas maritimas mundiais (GeoJSON) |
| `public/aircraft-db.json` | ~31 MB | Banco de dados de aeronaves por ICAO24 (registro, modelo, operador) |

---

## Rodando o projeto

### Desenvolvimento

```bash
npm run dev
```

O Vite inicia em `http://localhost:5173` com:
- **Hot Module Replacement** para React
- **Proxy reverso** para todas as APIs externas (evita CORS)
- **Proxy WebSocket** para AISStream (injeta a API key no servidor)

### Build de producao

```bash
npm run build
npm run preview   # para testar o build localmente
```

> **Nota:** Em producao, voce precisara configurar um servidor (nginx, Caddy, etc.) com as mesmas rotas de proxy que estao em `vite.config.js`. 

---

## Variaveis de ambiente

Todas usam o prefixo `VITE_` para serem acessiveis no frontend.

### Obrigatorias

| Variavel | Descricao |
|----------|-----------|
| `VITE_OPENSKY_CLIENT_ID` | Client ID do OAuth2 do OpenSky Network |
| `VITE_OPENSKY_CLIENT_SECRET` | Client Secret do OAuth2 do OpenSky Network |
| `VITE_OWM_API_KEY` | Chave da API do OpenWeatherMap |
| `VITE_AISSTREAM_API_KEY` | Chave da API do AISStream (tracking de embarcacoes) |
| `VITE_CESIUM_ION_TOKEN` | Token de acesso do Cesium Ion (terreno 3D) |

### Opcionais

| Variavel | Default | Descricao |
|----------|---------|-----------|
| `VITE_FLIGHT_CACHE` | `false` | Cachear voos em memoria (evita chamadas repetidas) |
| `VITE_MOCK_FLIGHTS` | `false` | Usar dados falsos de voos |
| `VITE_MOCK_VESSELS` | `false` | Usar dados falsos de embarcacoes |
| `VITE_MOCK_SATELLITES` | `false` | Usar dados falsos de satelites |
| `VITE_POLL_INTERVAL_AUTH_MS` | `60000` | Polling do OpenSky autenticado (ms) |
| `VITE_POLL_INTERVAL_ANON_MS` | `60000` | Polling do OpenSky anonimo (ms) |
| `VITE_RETRY_INTERVAL_MS` | `1200000` | Retry apos rate-limit (ms) |
| `VITE_FLIGHT_CACHE_TTL_MS` | `300000` | TTL do cache de voos (ms) |

---

## Arquitetura

```
src/
├── components/
│   ├── App.jsx                  # Componente raiz (slim — ~80 linhas)
│   ├── Globe.jsx                # Viewer Cesium + terreno + navegacao
│   ├── ControlPanel.jsx         # Toggles de camadas (consome context)
│   ├── SettingsPanel.jsx        # Painel de configuracoes avancadas
│   ├── SearchBox.jsx            # Busca via Nominatim
│   ├── *Card.jsx                # Cards de informacao (Flight, Vessel, etc.)
│   └── layers/                  # Layer managers (renderizam null)
│       ├── FlightManager.jsx    # Dados + renderizacao de aeronaves
│       ├── VesselManager.jsx    # Dados + renderizacao de embarcacoes
│       ├── SatelliteManager.jsx # Dados + renderizacao de satelites
│       ├── AirportManager.jsx   # Renderizacao de aeroportos
│       ├── TelecomManager.jsx   # Tiles MVT de telecom
│       ├── ReceiverManager.jsx  # Receptores ADS-B e AIS
│       ├── WeatherManager.jsx   # Tiles de clima
│       ├── RouteManager.jsx     # Rotas aereas e maritimas
│       ├── SceneManager.jsx     # Camera, iluminacao, cena
│       └── VisibilityManager.jsx # Filtro de visibilidade
├── contexts/
│   ├── LayerContext.jsx         # Estado de todas as camadas (useReducer)
│   ├── ViewerContext.jsx        # Instancia do Cesium Viewer
│   └── SelectionContext.jsx     # Registry de selecao de entidades
├── hooks/                       # Hooks reutilizaveis
├── providers/                   # Servicos de dados e configuracao
│   ├── opensky/                 # OpenSky auth + service
│   ├── airplaneslive/           # Airplanes.live service
│   ├── constants.js             # Constantes configuraveis
│   ├── settingsStore.js         # Store reativo (useSyncExternalStore)
│   └── layers.js                # Camadas de imagery (satelite, mapa, etc.)
├── utils/                       # Utilitarios (IndexedDB, bbox, etc.)
├── workers/                     # Web Workers (processamento de aeroportos)
└── assets/                      # SVGs, icones, bandeiras
```

### Principios

- **Cada layer = 1 manager**: Adicionar uma nova camada requer apenas criar um novo manager em `layers/` e um toggle no `ControlPanel`. Nenhuma alteracao em `App.jsx`, `Globe.jsx` ou `SelectionContext`.
- **Context-driven**: Estado de camadas gerenciado por `LayerContext` (useReducer). ControlPanel e managers consomem o mesmo context sem prop drilling.
- **Selection registry**: Clique em qualquer entidade e tratado por um registry centralizado (`SelectionContext`). Cada manager registra seu handler de selecao.
- **Render on demand**: `requestRenderMode = true` — o Cesium so re-renderiza quando algo muda, economizando GPU.

---

## Limitacoes dos dados

### OpenSky Network
- **Rate limit**: ~400 requisicoes/dia com autenticacao (~4000 creditos/dia, cada chamada global custa ~10). Sem autenticacao, muito mais restrito.
- **Cobertura**: Depende de receptores ADS-B voluntarios. Areas com poucos receptores (oceanos, regioes remotas) tem cobertura limitada ou inexistente.
- **Latencia**: Dados tem atraso de ~5-15 segundos em relacao ao tempo real.
- **Metadados**: Nem todas as aeronaves tem callsign preenchido. Algumas retornam apenas ICAO24.

### Airplanes.live
- **Rate limit**: 1 requisicao/segundo por IP.
- **Raio maximo**: 250 milhas nauticas (~463 km) por consulta. Para areas maiores, o app faz multiplas requisicoes.
- **Cobertura**: Similar ao OpenSky (baseado em feeders ADS-B), mas com rede propria de receptores.

### AISStream (Embarcacoes)
- **Cobertura**: Limitada a embarcacoes com transponder AIS ativo e dentro do alcance de estacoes terrestres ou satelites AIS.
- **Oceano aberto**: Cobertura intermitente — embarcacoes podem "desaparecer" entre zonas de cobertura.
- **Dados estaticos**: Nem todas as embarcacoes transmitem dados estaticos (nome, tipo, dimensoes). Alguns campos podem estar vazios ou incorretos.
- **WebSocket**: Conexao unica por cliente. Reconexao automatica em caso de queda.

### CelesTrak (Satelites)
- **Atualizacao**: TLEs sao atualizados 1-2x por dia pelo NORAD. Satelites com manobras recentes podem ter posicao imprecisa ate a proxima atualizacao.
- **Propagacao**: O algoritmo SGP4 tem precisao de ~1 km para orbitas baixas, degradando ao longo dos dias sem TLE atualizado.
- **Quantidade**: O catalogo "active" tem ~10.000 satelites. Renderizar todos pode impactar performance.

### OpenWeatherMap (Clima)
- **Resolucao**: Tiles de zoom 2 (padrao) cobrem areas grandes com baixa resolucao. Aumentar o zoom melhora o detalhe mas multiplica as requisicoes.
- **Atualizacao**: Dados meteorologicos sao atualizados a cada ~1-3 horas pelo provedor.
- **Camadas**: Atualmente apenas nuvens. Precipitacao, temperatura, vento e pressao estao disponiveis mas nao implementadas.

### OpenInfraMap (Telecom)
- **Cobertura**: Baseado em dados do OpenStreetMap. Regioes menos mapeadas (Africa, partes da Asia) podem ter dados incompletos.
- **Atualizacao**: Depende de contribuicoes voluntarias ao OSM.
- **Tipos**: Torres de celular, data centers e linhas de comunicacao. Nem todos os tipos de infraestrutura estao mapeados.

### Aeroportos
- **Fonte**: Dados estaticos inclusos no projeto (OurAirports). Novos aeroportos ou mudancas de status exigem atualizacao manual do arquivo.
- **Tipos**: 6 categorias (large, medium, small, heliport, seaplane_base, balloonport). Visibilidade filtrada por altitude da camera.

### Rotas aereas/maritimas
- **Fonte**: Dados estaticos. Podem nao refletir rotas atuais ou sazonais.
- **Rotas aereas**: Apenas pares origem-destino, sem waypoints intermediarios. Renderizadas como grandes circulos.
- **Rotas maritimas**: GeoJSON com 3 categorias (major, middle, minor) baseadas em importancia.

### Geral
- **Performance**: Com todas as camadas ativas e muitas entidades visiveis, a performance pode degradar. Use os controles de batch size nas configuracoes para ajustar.
- **IndexedDB**: O app usa cache local extensivo (voos, satelites, telecom, receptores). Em caso de dados corrompidos, limpe o IndexedDB do navegador.
- **Produção**: O projeto atualmente roda com proxy do Vite dev server. Para producao, e necessario um backend proprio.
