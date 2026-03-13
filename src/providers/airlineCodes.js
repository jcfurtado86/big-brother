// Mapa ICAO (3 letras do callsign) → { iata, name }
// Usado como fallback quando a aeronave não está no aircraft-db.json
const AIRLINES = {
  // Brasil
  GLO: { iata: 'G3', name: 'Gol Linhas Aéreas' },
  TAM: { iata: 'JJ', name: 'LATAM Airlines Brasil' },
  AZU: { iata: 'AD', name: 'Azul Linhas Aéreas' },
  VBR: { iata: '2Z', name: 'VOEPASS (Passaredo)' },
  PTB: { iata: 'P3', name: 'MAP Linhas Aéreas' },
  ITQ: { iata: '', name: 'ITA Transportes Aéreos' },
  ABJ: { iata: 'M3', name: 'Abaeté Linhas Aéreas' },
  TTL: { iata: 'T4', name: 'Total Linhas Aéreas' },
  SID: { iata: '', name: 'Sideral Linhas Aéreas' },

  // América Latina
  LAN: { iata: 'LA', name: 'LATAM Airlines' },
  SKU: { iata: 'H2', name: 'Sky Airline' },
  AVA: { iata: 'AV', name: 'Avianca' },
  ARG: { iata: 'AR', name: 'Aerolíneas Argentinas' },
  AEA: { iata: 'UX', name: 'Air Europa' },
  CMP: { iata: 'CM', name: 'Copa Airlines' },
  AMX: { iata: 'AM', name: 'Aeroméxico' },
  VOI: { iata: 'Y4', name: 'Volaris' },

  // América do Norte
  AAL: { iata: 'AA', name: 'American Airlines' },
  DAL: { iata: 'DL', name: 'Delta Air Lines' },
  UAL: { iata: 'UA', name: 'United Airlines' },
  SWA: { iata: 'WN', name: 'Southwest Airlines' },
  JBU: { iata: 'B6', name: 'JetBlue Airways' },
  FFT: { iata: 'F9', name: 'Frontier Airlines' },
  NKS: { iata: 'NK', name: 'Spirit Airlines' },
  ACA: { iata: 'AC', name: 'Air Canada' },
  WJA: { iata: 'WS', name: 'WestJet' },
  ASA: { iata: 'AS', name: 'Alaska Airlines' },
  FDX: { iata: 'FX', name: 'FedEx Express' },
  UPS: { iata: '5X', name: 'UPS Airlines' },

  // Europa
  BAW: { iata: 'BA', name: 'British Airways' },
  DLH: { iata: 'LH', name: 'Lufthansa' },
  AFR: { iata: 'AF', name: 'Air France' },
  KLM: { iata: 'KL', name: 'KLM' },
  IBE: { iata: 'IB', name: 'Iberia' },
  TAP: { iata: 'TP', name: 'TAP Air Portugal' },
  SAS: { iata: 'SK', name: 'SAS Scandinavian' },
  AZA: { iata: 'AZ', name: 'ITA Airways' },
  SWR: { iata: 'LX', name: 'Swiss International' },
  AUA: { iata: 'OS', name: 'Austrian Airlines' },
  BEL: { iata: 'SN', name: 'Brussels Airlines' },
  FIN: { iata: 'AY', name: 'Finnair' },
  EIN: { iata: 'EI', name: 'Aer Lingus' },
  LOT: { iata: 'LO', name: 'LOT Polish Airlines' },
  CSA: { iata: 'OK', name: 'Czech Airlines' },
  THY: { iata: 'TK', name: 'Turkish Airlines' },
  RYR: { iata: 'FR', name: 'Ryanair' },
  EZY: { iata: 'U2', name: 'easyJet' },
  WZZ: { iata: 'W6', name: 'Wizz Air' },
  VLG: { iata: 'VY', name: 'Vueling' },
  NOZ: { iata: 'D8', name: 'Norwegian Air' },
  EWG: { iata: 'EW', name: 'Eurowings' },
  TVF: { iata: 'TO', name: 'Transavia France' },

  // Oriente Médio & África
  UAE: { iata: 'EK', name: 'Emirates' },
  QTR: { iata: 'QR', name: 'Qatar Airways' },
  ETD: { iata: 'EY', name: 'Etihad Airways' },
  SVA: { iata: 'SV', name: 'Saudia' },
  MEA: { iata: 'ME', name: 'Middle East Airlines' },
  RJA: { iata: 'RJ', name: 'Royal Jordanian' },
  ELY: { iata: 'LY', name: 'El Al' },
  ETH: { iata: 'ET', name: 'Ethiopian Airlines' },
  SAA: { iata: 'SA', name: 'South African Airways' },
  KQA: { iata: 'KQ', name: 'Kenya Airways' },
  RAM: { iata: 'AT', name: 'Royal Air Maroc' },

  // Ásia & Oceania
  CPA: { iata: 'CX', name: 'Cathay Pacific' },
  SIA: { iata: 'SQ', name: 'Singapore Airlines' },
  THA: { iata: 'TG', name: 'Thai Airways' },
  MAS: { iata: 'MH', name: 'Malaysia Airlines' },
  GIA: { iata: 'GA', name: 'Garuda Indonesia' },
  VNM: { iata: 'VN', name: 'Vietnam Airlines' },
  ANA: { iata: 'NH', name: 'All Nippon Airways' },
  JAL: { iata: 'JL', name: 'Japan Airlines' },
  KAL: { iata: 'KE', name: 'Korean Air' },
  AAR: { iata: 'OZ', name: 'Asiana Airlines' },
  CCA: { iata: 'CA', name: 'Air China' },
  CES: { iata: 'MU', name: 'China Eastern' },
  CSN: { iata: 'CZ', name: 'China Southern' },
  HDA: { iata: 'HU', name: 'Hainan Airlines' },
  AIC: { iata: 'AI', name: 'Air India' },
  QFA: { iata: 'QF', name: 'Qantas' },
  ANZ: { iata: 'NZ', name: 'Air New Zealand' },
  AXM: { iata: 'AK', name: 'AirAsia' },
  JST: { iata: 'JQ', name: 'Jetstar Airways' },
  VOZ: { iata: 'VA', name: 'Virgin Australia' },

  // Rússia & CIS
  AFL: { iata: 'SU', name: 'Aeroflot' },
  SDM: { iata: 'S7', name: 'S7 Airlines' },
};

/**
 * Extrai o prefixo ICAO (3 letras) do callsign e retorna { iata, name }.
 * Ex: "GLO1999" → { iata: 'G3', name: 'Gol Linhas Aéreas' }
 */
export function getAirlineFromCallsign(callsign) {
  if (!callsign || callsign.length < 3) return null;
  const prefix = callsign.slice(0, 3).toUpperCase();
  return AIRLINES[prefix] ?? null;
}
