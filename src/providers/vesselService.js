// Abstrai a conexão WebSocket com AISStream.io para dados de embarcações.
// A conexão passa pelo proxy Vite em /ws/vessels — a API key é injetada
// server-side pelo plugin vite-plugin-aisProxy.js.

/**
 * Abre conexão WebSocket com o proxy local de AIS.
 * @param {object} bbox - { south, west, north, east }
 * @param {function} onMessage - chamada com objeto vessel normalizado
 * @param {function} onError - chamada em caso de erro
 * @returns {{ close: function, updateBbox: function }}
 */
export function connectVesselStream(bbox, onMessage, onError) {
  let ws = null;
  let closed = false;

  function connect() {
    if (closed) return;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}/ws/vessels`);

    ws.onopen = () => {
      console.log('[vesselService] proxy connected');
      const subscribe = {
        BoundingBoxes: [
          [[bbox.south, bbox.west], [bbox.north, bbox.east]],
        ],
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      };
      ws.send(JSON.stringify(subscribe));
    };

    let msgCount = 0;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error('[vesselService] AIS error:', data.error);
          onError?.(data.error);
          return;
        }
        msgCount++;
        if (msgCount <= 3 || msgCount % 100 === 0) {
          console.log(`[vesselService] msg #${msgCount}:`, data.MessageType, data.MetaData?.ShipName);
        }
        const vessel = parseAISMessage(data);
        if (vessel) onMessage(vessel);
      } catch {
        // Mensagem mal-formada — ignora
      }
    };

    ws.onerror = () => {
      onError?.('WebSocket error');
    };

    ws.onclose = () => {
      if (!closed) {
        setTimeout(connect, 5000);
      }
    };
  }

  connect();

  return {
    close() {
      closed = true;
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    },
    updateBbox(newBbox) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          BoundingBoxes: [
            [[newBbox.south, newBbox.west], [newBbox.north, newBbox.east]],
          ],
          FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
        }));
      }
    },
  };
}

// ── Parse AIS messages ────────────────────────────────────────────────────────

function parseAISMessage(data) {
  const meta = data.MetaData;
  if (!meta) return null;

  const mmsi = String(meta.MMSI);
  const name = (meta.ShipName || '').trim();
  const lat  = meta.latitude;
  const lon  = meta.longitude;

  if (lat == null || lon == null) return null;

  // Position Report
  const pos = data.Message?.PositionReport;
  // Static Data
  const stat = data.Message?.ShipStaticData;

  const dim = stat?.Dimension;
  const eta = stat?.Eta;

  const vessel = {
    mmsi,
    name:        name || mmsi,
    lat,
    lon,
    cog:         pos?.Cog             ?? 0,
    sog:         pos?.Sog             ?? 0,
    heading:     pos?.TrueHeading     ?? pos?.Cog ?? 0,
    navStatus:   pos?.NavigationalStatus ?? -1,
    rateOfTurn:  pos?.RateOfTurn      ?? null,
    shipType:    stat?.Type           ?? meta.ShipType ?? 0,
    destination: stat?.Destination    ?? '',
    callsign:    stat?.CallSign       ?? '',
    imo:         stat?.ImoNumber      ?? 0,
    draught:     stat?.MaximumStaticDraught ?? null,
    length:      dim ? (dim.A + dim.B) : null,
    beam:        dim ? (dim.C + dim.D) : null,
    eta:         eta ? { month: eta.Month, day: eta.Day, hour: eta.Hour, minute: eta.Minute } : null,
    country:     mmsiToCountry(mmsi),
    timeUtc:     meta.time_utc ?? null,
    fetchedAt:   Date.now(),
  };

  return vessel;
}

// First 3 digits of MMSI → country (simplified — most common MIDs)
const MID_COUNTRY = {
  '201': 'Albania', '202': 'Andorra', '203': 'Austria', '204': 'Portugal',
  '205': 'Belgium', '206': 'Belarus', '207': 'Bulgaria', '209': 'Cyprus',
  '210': 'Cyprus', '211': 'Germany', '212': 'Cyprus', '213': 'Georgia',
  '214': 'Moldova', '215': 'Malta', '216': 'Armenia', '218': 'Germany',
  '219': 'Denmark', '220': 'Denmark', '224': 'Spain', '225': 'Spain',
  '226': 'France', '227': 'France', '228': 'France', '229': 'Malta',
  '230': 'Finland', '231': 'Faroe Islands', '232': 'United Kingdom',
  '233': 'United Kingdom', '234': 'United Kingdom', '235': 'United Kingdom',
  '236': 'Gibraltar', '237': 'Greece', '238': 'Croatia', '239': 'Greece',
  '240': 'Greece', '241': 'Greece', '242': 'Morocco', '243': 'Hungary',
  '244': 'Netherlands', '245': 'Netherlands', '246': 'Netherlands',
  '247': 'Italy', '248': 'Malta', '249': 'Malta', '250': 'Ireland',
  '251': 'Iceland', '252': 'Liechtenstein', '253': 'Luxembourg',
  '254': 'Monaco', '255': 'Portugal', '256': 'Malta', '257': 'Norway',
  '258': 'Norway', '259': 'Norway', '261': 'Poland', '263': 'Portugal',
  '265': 'Sweden', '266': 'Sweden', '267': 'Sweden',
  '269': 'Switzerland', '270': 'Czech Republic', '271': 'Turkey',
  '272': 'Ukraine', '273': 'Russia', '274': 'North Macedonia',
  '275': 'Latvia', '276': 'Estonia', '277': 'Lithuania',
  '278': 'Slovenia', '279': 'Serbia',
  '301': 'Anguilla', '303': 'Alaska', '304': 'Antigua and Barbuda',
  '305': 'Antigua and Barbuda', '306': 'Curaçao',
  '307': 'Aruba', '308': 'Bahamas', '309': 'Bahamas', '310': 'Bermuda',
  '311': 'Bahamas', '312': 'Belize', '314': 'Barbados',
  '316': 'Canada', '319': 'Cayman Islands',
  '321': 'Costa Rica', '323': 'Cuba', '325': 'Dominica',
  '327': 'Dominican Republic', '329': 'Guadeloupe',
  '330': 'Grenada', '331': 'Greenland', '332': 'Guatemala',
  '334': 'Honduras', '336': 'Haiti', '338': 'United States',
  '339': 'Jamaica', '341': 'Saint Kitts and Nevis',
  '343': 'Saint Lucia', '345': 'Mexico', '347': 'Martinique',
  '348': 'Montserrat', '350': 'Nicaragua', '351': 'Panama',
  '352': 'Panama', '353': 'Panama', '354': 'Panama', '355': 'Panama',
  '356': 'Panama', '357': 'Panama',
  '358': 'Puerto Rico', '359': 'El Salvador',
  '361': 'Saint Pierre and Miquelon',
  '362': 'Trinidad and Tobago', '364': 'Turks and Caicos',
  '366': 'United States', '367': 'United States', '368': 'United States',
  '369': 'United States', '370': 'Panama', '371': 'Panama',
  '372': 'Panama', '373': 'Panama',
  '375': 'Saint Vincent and the Grenadines',
  '376': 'Saint Vincent and the Grenadines',
  '377': 'Saint Vincent and the Grenadines',
  '378': 'British Virgin Islands', '379': 'US Virgin Islands',
  '401': 'Afghanistan', '403': 'Saudi Arabia', '405': 'Bangladesh',
  '408': 'Bahrain', '410': 'Bhutan', '412': 'China', '413': 'China',
  '414': 'China', '416': 'Taiwan', '417': 'Sri Lanka',
  '419': 'India', '422': 'Iran', '423': 'Azerbaijan',
  '425': 'Iraq', '428': 'Israel', '431': 'Japan',
  '432': 'Japan', '434': 'Turkmenistan', '436': 'Kazakhstan',
  '437': 'Uzbekistan', '438': 'Jordan',
  '440': 'South Korea', '441': 'South Korea',
  '443': 'Palestine', '445': 'North Korea',
  '447': 'Kuwait', '450': 'Lebanon', '451': 'Kyrgyzstan',
  '453': 'Macau', '455': 'Maldives', '457': 'Mongolia',
  '459': 'Nepal', '461': 'Oman', '463': 'Pakistan',
  '466': 'Qatar', '468': 'Syria', '470': 'UAE',
  '472': 'Tajikistan', '473': 'Yemen', '475': 'Tonga',
  '477': 'Hong Kong', '478': 'Bosnia and Herzegovina',
  '501': 'Antarctica', '503': 'Australia', '506': 'Myanmar',
  '508': 'Brunei', '510': 'Micronesia', '511': 'Palau',
  '512': 'New Zealand', '514': 'Cambodia', '515': 'Cambodia',
  '516': 'Christmas Island', '518': 'Cook Islands',
  '520': 'Fiji', '523': 'Cocos Islands', '525': 'Indonesia',
  '529': 'Kiribati', '531': 'Laos', '533': 'Malaysia',
  '536': 'Northern Mariana Islands', '538': 'Marshall Islands',
  '540': 'New Caledonia', '542': 'Niue', '544': 'Nauru',
  '546': 'French Polynesia', '548': 'Philippines',
  '553': 'Papua New Guinea', '555': 'Pitcairn Island',
  '557': 'Solomon Islands', '559': 'American Samoa',
  '561': 'Samoa', '563': 'Singapore', '564': 'Singapore',
  '565': 'Singapore', '566': 'Singapore',
  '567': 'Thailand', '570': 'Tonga', '572': 'Tuvalu',
  '574': 'Vietnam', '576': 'Vanuatu',
  '577': 'Wallis and Futuna', '578': 'Wallis and Futuna',
  '601': 'South Africa', '603': 'Angola', '605': 'Algeria',
  '607': 'Saint Paul', '608': 'Ascension Island',
  '609': 'Burundi', '610': 'Benin', '611': 'Botswana',
  '612': 'Central African Republic', '613': 'Cameroon',
  '615': 'Republic of the Congo', '616': 'Comoros',
  '617': 'Cape Verde', '618': 'Réunion',
  '619': 'Ivory Coast', '620': 'Comoros',
  '621': 'Djibouti', '622': 'Egypt', '624': 'Ethiopia',
  '625': 'Eritrea', '626': 'Gabon', '627': 'Ghana',
  '629': 'Gambia', '630': 'Guinea-Bissau', '631': 'Equatorial Guinea',
  '632': 'Guinea', '633': 'Burkina Faso', '634': 'Kenya',
  '635': 'Kerguelen Islands', '636': 'Liberia',
  '637': 'Liberia', '642': 'Libya', '644': 'Lesotho',
  '645': 'Mauritius', '647': 'Madagascar', '649': 'Mali',
  '650': 'Mozambique', '654': 'Mauritania', '655': 'Malawi',
  '656': 'Niger', '657': 'Nigeria', '659': 'Namibia',
  '660': 'Réunion', '661': 'Rwanda', '662': 'Sudan',
  '663': 'Senegal', '664': 'Seychelles', '665': 'Saint Helena',
  '666': 'Somalia', '667': 'Sierra Leone', '668': 'São Tomé and Príncipe',
  '669': 'Eswatini', '670': 'Chad', '671': 'Togo',
  '672': 'Tunisia', '674': 'Tanzania', '675': 'Uganda',
  '676': 'DR Congo', '677': 'Tanzania', '678': 'Zambia',
  '679': 'Zimbabwe',
  '701': 'Argentina', '710': 'Brazil', '720': 'Bolivia',
  '725': 'Chile', '730': 'Colombia', '735': 'Ecuador',
  '740': 'Falkland Islands', '745': 'Guiana', '750': 'Guyana',
  '755': 'Paraguay', '760': 'Peru', '765': 'Suriname',
  '770': 'Uruguay', '775': 'Venezuela',
};

function mmsiToCountry(mmsi) {
  if (!mmsi || mmsi.length < 3) return '';
  return MID_COUNTRY[mmsi.substring(0, 3)] || '';
}
