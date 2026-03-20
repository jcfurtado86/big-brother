import { ArcGisMapServerImageryProvider, OpenStreetMapImageryProvider } from 'cesium';

const esri = await ArcGisMapServerImageryProvider.fromUrl(
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
);

const reference = await ArcGisMapServerImageryProvider.fromUrl(
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer',
  { enablePickFeatures: false }
);

const osm = new OpenStreetMapImageryProvider({
  url: 'https://tile.openstreetmap.org/',
});

export const layers = [
  { id: 'satellite', label: 'cat.layer.satellite', base: esri, overlay: reference },
  { id: 'street',    label: 'cat.layer.street',    base: osm,  overlay: null },
];
