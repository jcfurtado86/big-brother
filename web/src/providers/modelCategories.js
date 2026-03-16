// Mapeamento de códigos ICAO de tipo de aeronave (icaotypecode) para:
//   TYPE_CATEGORY: categoria de renderização (heavy | large | regional | light | helicopter | uav | unknown)
//   TYPE_SVG:      chave do SVG específico quando disponível (null = usar genérico da categoria)
//
// SVGs específicos disponíveis: a320, a330, a340, a380, b737, b747, b767, b777, b787,
//   c130, cessna, crjx, dh8a, e195, erj, f100, f5, f11, f15, fa7x, glf5, learjet, md11

// ── Categorias ────────────────────────────────────────────────────────────────
export const TYPE_CATEGORY = {
  // Airbus wide-body (heavy)
  A306: 'heavy', A30B: 'heavy', A300: 'heavy',
  A310: 'heavy',
  A332: 'heavy', A333: 'heavy', A338: 'heavy', A339: 'heavy',
  A342: 'heavy', A343: 'heavy', A345: 'heavy', A346: 'heavy',
  A359: 'heavy', A35K: 'heavy',
  A380: 'heavy', A388: 'heavy',
  A3ST: 'heavy', // Beluga

  // Airbus narrow-body (large)
  A318: 'large', A319: 'large', A320: 'large', A321: 'large',
  A20N: 'large', A21N: 'large', // NEO family
  A19N: 'large',

  // Boeing wide-body (heavy)
  B741: 'heavy', B742: 'heavy', B743: 'heavy', B744: 'heavy',
  B748: 'heavy', B74D: 'heavy', B74F: 'heavy', B74S: 'heavy', B74R: 'heavy',
  B762: 'heavy', B763: 'heavy', B764: 'heavy',
  B772: 'heavy', B773: 'heavy', B77L: 'heavy', B77W: 'heavy', B778: 'heavy', B779: 'heavy',
  B788: 'heavy', B789: 'heavy', B78X: 'heavy',

  // Boeing narrow-body (large)
  B712: 'large',
  B721: 'large', B722: 'large',
  B731: 'large', B732: 'large', B733: 'large', B734: 'large', B735: 'large',
  B736: 'large', B737: 'large', B738: 'large', B739: 'large',
  B37M: 'large', B38M: 'large', B39M: 'large', B3XM: 'large',
  B752: 'large', B753: 'large',

  // McDonnell Douglas (heavy / large)
  MD11: 'heavy', DC10: 'heavy',
  DC86: 'large', DC87: 'large', DC88: 'large', DC89: 'large', DC9: 'large',
  DC8: 'large',
  MD81: 'large', MD82: 'large', MD83: 'large', MD87: 'large', MD88: 'large', MD90: 'large',

  // Ilyushin / Antonov large (heavy)
  IL96: 'heavy', IL86: 'heavy', IL76: 'heavy', IL62: 'heavy',
  A124: 'heavy', A225: 'heavy', // Antonov
  C17: 'heavy', C5: 'heavy',   // Military transports
  A400: 'heavy',                // A400M

  // Tupolev large
  T134: 'regional', T144: 'heavy', T154: 'large', T204: 'large',

  // Bombardier CRJ (regional)
  CRJ1: 'regional', CRJ2: 'regional', CRJ7: 'regional', CRJ9: 'regional', CRJX: 'regional',

  // Embraer E-Jet (regional)
  E170: 'regional', E175: 'regional', E190: 'regional', E195: 'regional',
  E75L: 'regional', E75S: 'regional',
  E290: 'regional', E295: 'regional',
  E2L1: 'regional', E2L2: 'regional', E2L3: 'regional',

  // Embraer ERJ (regional)
  E135: 'regional', E145: 'regional',

  // ATR turboprops (regional)
  AT43: 'regional', AT44: 'regional', AT45: 'regional', AT46: 'regional',
  AT72: 'regional', AT73: 'regional', AT75: 'regional', AT76: 'regional',

  // Dash 8 / Q400 (regional)
  DH8A: 'regional', DH8B: 'regional', DH8C: 'regional', DH8D: 'regional',

  // Saab turboprops (regional)
  SF34: 'regional', SB20: 'regional',
  JS31: 'regional', JS32: 'regional', JS41: 'regional',

  // Fokker (regional)
  F27: 'regional', F28: 'regional', FK28: 'regional',
  F50: 'regional', F70: 'regional', F100: 'regional',

  // BAe / Avro RJ (regional)
  B461: 'regional', B462: 'regional', B463: 'regional',
  RJ70: 'regional', RJ85: 'regional', RJ1H: 'regional',

  // Dornier / Let (regional)
  D328: 'regional', DO28: 'regional',
  L410: 'regional',

  // De Havilland Canada (regional)
  DHC6: 'regional', DHC7: 'regional',

  // Antonov smaller (regional)
  AN24: 'regional', AN26: 'regional', AN72: 'regional',
  C295: 'regional', CN35: 'regional',

  // Cessna piston / turboprop (light)
  C150: 'light', C152: 'light', C162: 'light',
  C172: 'light', C177: 'light', C180: 'light', C182: 'light', C185: 'light',
  C206: 'light', C207: 'light', C208: 'light', C210: 'light',

  // Cessna jets / Citation (light)
  C500: 'light', C501: 'light', C510: 'light', C525: 'light',
  C550: 'light', C551: 'light', C56X: 'light', C560: 'light',
  C680: 'light', C68A: 'light', C750: 'light',
  C25A: 'light', C25B: 'light', C25C: 'light',

  // Diamond (light)
  DA20: 'light', DA40: 'light', DA42: 'light', DA62: 'light',

  // Piper (light)
  P28A: 'light', P28B: 'light', P28R: 'light', P28T: 'light',
  P32: 'light',  P32R: 'light', P32T: 'light', P46T: 'light',
  PA18: 'light', PA12: 'light', PA19: 'light', PA34: 'light', PA44: 'light',

  // Cirrus (light)
  SR20: 'light', SR22: 'light', SF50: 'light',

  // Pilatus (light)
  PC12: 'light', PC24: 'light',

  // TBM turboprops (light)
  TBM7: 'light', TBM8: 'light', TBM9: 'light',

  // Beechcraft (light)
  BE20: 'light', BE30: 'light', BE35: 'light', BE36: 'light',
  BE55: 'light', BE58: 'light', BE76: 'light', BE99: 'light',
  B190: 'regional',

  // Mooney (light)
  M20P: 'light', M20T: 'light', M20V: 'light',

  // Learjet (light business)
  LJ24: 'light', LJ25: 'light', LJ31: 'light', LJ35: 'light', LJ36: 'light',
  LJ40: 'light', LJ45: 'light', LJ55: 'light', LJ60: 'light', LJ70: 'light', LJ75: 'light',

  // Gulfstream (light business)
  GL5T: 'light', GLEX: 'light', GLFD: 'light',
  G150: 'light', G280: 'light', G450: 'light', G550: 'light', G650: 'light',
  G6ER: 'light', G700: 'light',

  // Bombardier Challenger / Global (light business)
  CL60: 'light', CL35: 'light',
  BD10: 'light', BD7X: 'light',

  // Dassault Falcon (light business)
  FA10: 'light', FA20: 'light', FA50: 'light', FA7X: 'light',
  F2TH: 'light', F900: 'light',

  // Embraer business jets (light)
  E50P: 'light', E55P: 'light',
  PHENOM: 'light',

  // HondaJet (light)
  HA4T: 'light',

  // Piaggio (light)
  P180: 'light',

  // Hawker (light)
  H25A: 'light', H25B: 'light', H25C: 'light',
  HDJT: 'light',

  // Military fighters / jets (light — silhouette específico)
  F5: 'light', T38: 'light',
  F15: 'light', F16: 'light', F18: 'light',
  F14: 'light', F22: 'light', F35: 'light',
  F111: 'light',
  SU27: 'light', SU30: 'light', SU35: 'light',
  MIG29: 'light', MIG31: 'light',

  // Lockheed Hercules (heavy)
  C130: 'heavy',

  // ── Helicopters ──────────────────────────────────────────────────────────────
  // Robinson
  R22: 'helicopter', R44: 'helicopter', R66: 'helicopter',

  // Bell
  B06: 'helicopter', B06T: 'helicopter',
  B407: 'helicopter', B412: 'helicopter', B427: 'helicopter',
  B429: 'helicopter', B430: 'helicopter',
  B47G: 'helicopter', B47T: 'helicopter',
  B212: 'helicopter', B214: 'helicopter', B222: 'helicopter', B230: 'helicopter',

  // Sikorsky
  S58: 'helicopter', S61: 'helicopter', S64: 'helicopter',
  S70: 'helicopter', S76: 'helicopter', S92: 'helicopter',
  UH1: 'helicopter', UH60: 'helicopter',

  // Airbus Helicopters / Eurocopter
  AS32: 'helicopter', AS50: 'helicopter', AS55: 'helicopter', AS65: 'helicopter',
  EC20: 'helicopter', EC25: 'helicopter', EC30: 'helicopter',
  EC35: 'helicopter', EC45: 'helicopter', EC55: 'helicopter',
  EC65: 'helicopter', EC75: 'helicopter',
  H125: 'helicopter', H130: 'helicopter', H135: 'helicopter',
  H145: 'helicopter', H160: 'helicopter', H175: 'helicopter',
  H215: 'helicopter', H225: 'helicopter',

  // AgustaWestland / Leonardo
  A109: 'helicopter', A119: 'helicopter', A129: 'helicopter',
  A139: 'helicopter', A149: 'helicopter', A169: 'helicopter', A189: 'helicopter',
  AW09: 'helicopter',

  // Kamov / Mil
  KA27: 'helicopter', KA32: 'helicopter',
  MI8: 'helicopter',  MI17: 'helicopter', MI24: 'helicopter', MI26: 'helicopter',

  // Miscellaneous
  NH90: 'helicopter', LYNX: 'helicopter', PUMA: 'helicopter',
  WS55: 'helicopter', WS61: 'helicopter',

  // ── UAV ──────────────────────────────────────────────────────────────────────
  MQ4C: 'uav', MQ9: 'uav', RQ4: 'uav', PRED: 'uav', REAP: 'uav',
};

// ── SVG específico por código de tipo ─────────────────────────────────────────
// null = usar genérico da categoria
export const TYPE_SVG = {
  // Airbus narrow-body → a320.svg
  A318: 'a320', A319: 'a320', A320: 'a320', A321: 'a320',
  A20N: 'a320', A21N: 'a320', A19N: 'a320',

  // A330 → a330.svg
  A332: 'a330', A333: 'a330', A338: 'a330', A339: 'a330',

  // A340 → a340.svg
  A342: 'a340', A343: 'a340', A345: 'a340', A346: 'a340',

  // A380 → a380.svg
  A380: 'a380', A388: 'a380',

  // Boeing 737 family → b737.svg
  B731: 'b737', B732: 'b737', B733: 'b737', B734: 'b737', B735: 'b737',
  B736: 'b737', B737: 'b737', B738: 'b737', B739: 'b737',
  B37M: 'b737', B38M: 'b737', B39M: 'b737', B3XM: 'b737',

  // Boeing 747 family → b747.svg
  B741: 'b747', B742: 'b747', B743: 'b747', B744: 'b747',
  B748: 'b747', B74D: 'b747', B74F: 'b747', B74S: 'b747', B74R: 'b747',

  // Boeing 767 → b767.svg
  B762: 'b767', B763: 'b767', B764: 'b767',

  // Boeing 777 → b777.svg
  B772: 'b777', B773: 'b777', B77L: 'b777', B77W: 'b777', B778: 'b777', B779: 'b777',

  // Boeing 787 → b787.svg
  B788: 'b787', B789: 'b787', B78X: 'b787',

  // MD-11 / DC-10 → md11.svg
  MD11: 'md11', DC10: 'md11',

  // CRJ family → crjx.svg
  CRJ1: 'crjx', CRJ2: 'crjx', CRJ7: 'crjx', CRJ9: 'crjx', CRJX: 'crjx',

  // Embraer ERJ (145 family) → erj.svg
  E135: 'erj', E145: 'erj',

  // Embraer E-Jet → e195.svg (usa E195 como representante)
  E170: 'e195', E175: 'e195', E190: 'e195', E195: 'e195',
  E75L: 'e195', E75S: 'e195', E290: 'e195', E295: 'e195',

  // Dash 8 → dh8a.svg
  DH8A: 'dh8a', DH8B: 'dh8a', DH8C: 'dh8a', DH8D: 'dh8a',

  // Fokker 100 → f100.svg
  F100: 'f100', F70: 'f100', F28: 'f100', FK28: 'f100',

  // Gulfstream → glf5.svg
  GL5T: 'glf5', GLEX: 'glf5', G150: 'glf5', G280: 'glf5',
  G450: 'glf5', G550: 'glf5', G650: 'glf5', G6ER: 'glf5', G700: 'glf5',

  // Learjet → learjet.svg
  LJ24: 'learjet', LJ25: 'learjet', LJ31: 'learjet', LJ35: 'learjet',
  LJ36: 'learjet', LJ40: 'learjet', LJ45: 'learjet', LJ55: 'learjet',
  LJ60: 'learjet', LJ70: 'learjet', LJ75: 'learjet',

  // Dassault Falcon → fa7x.svg
  FA7X: 'fa7x', FA50: 'fa7x', FA10: 'fa7x', FA20: 'fa7x', F2TH: 'fa7x', F900: 'fa7x',

  // Cessna piston/turboprop → cessna.svg
  C150: 'cessna', C152: 'cessna', C162: 'cessna',
  C172: 'cessna', C177: 'cessna', C182: 'cessna', C206: 'cessna', C208: 'cessna',

  // Hercules → c130.svg
  C130: 'c130',

  // Fighters → specific military SVGs
  F5:  'f5',  T38: 'f5',
  F15: 'f15', F16: 'f15', F22: 'f15', F35: 'f15',
  F14: 'f11', F111: 'f11', F18: 'f11',
  SU27: 'f15', SU30: 'f15', SU35: 'f15',
  MIG29: 'f15', MIG31: 'f15',
};
