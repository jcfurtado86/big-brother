import countries from 'i18n-iso-countries';
import enLocale  from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(enLocale);

const FLAG_RAWS = import.meta.glob('../assets/svg/flags/*.svg', {
  query:  '?raw',
  import: 'default',
  eager:  true,
});

// Convert SVG raws to blob URLs, then immediately preload as HTMLImageElements.
// Blob URLs resolve from memory so images are ready well before flight data arrives.
const FLAG_IMGS = {};
for (const [path, raw] of Object.entries(FLAG_RAWS)) {
  const iso = path.replace(/^.*\/([^/]+)\.svg$/, '$1');
  const url = URL.createObjectURL(new Blob([raw], { type: 'image/svg+xml' }));
  const img = new Image();
  img.src = url;
  FLAG_IMGS[iso] = img;
}

// OpenSky sometimes returns official/formal country names that i18n-iso-countries
// doesn't recognise by default. Map them to the library's canonical English name.
const OPENSKY_NAME_MAP = {
  'Kingdom of the Netherlands': 'Netherlands',
  'Syria':                      'Syrian Arab Republic',
  'Moldova':                    'Moldova, Republic of',
  'Macedonia':                  'North Macedonia',
  'Laos':                       "Lao People's Democratic Republic",
  'Brunei':                     'Brunei Darussalam',
};

// Returns a fully-loaded HTMLImageElement, or null if not ready / not found.
export function getFlagImg(countryName) {
  if (!countryName) return null;
  const normalized = OPENSKY_NAME_MAP[countryName] ?? countryName;
  const iso = countries.getAlpha2Code(normalized, 'en');
  if (!iso) return null;
  const img = FLAG_IMGS[iso];
  return (img?.complete && img.naturalWidth > 0) ? img : null;
}
