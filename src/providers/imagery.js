import {
  ArcGisMapServerImageryProvider,
  OpenStreetMapImageryProvider,
} from 'cesium';

const esri = await ArcGisMapServerImageryProvider.fromUrl(
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
);

const osm = new OpenStreetMapImageryProvider({
  url: 'https://tile.openstreetmap.org/',
});

export const imageryProviders = {
  satellite: esri,
  street: osm,
};

export const layerOptions = [
  { id: 'satellite', label: 'Satélite' },
  { id: 'street', label: 'Mapa' },
];
