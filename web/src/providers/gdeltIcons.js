import { Color } from 'cesium';

export const TONE_COLORS = { negative: '#F44336', positive: '#4CAF50', neutral: '#888' };
export const TONE_LABELS = { negative: 'Negativo', positive: 'Positivo', neutral: 'Neutro' };

export const GDELT_CATEGORIES = [
  'conflict',
  'disaster',
  'protest',
  'terror',
  'political',
];

export const GDELT_CATEGORY_META = {
  conflict:  { label: 'Conflitos', color: '#E53935' },
  disaster:  { label: 'Desastres', color: '#FF9800' },
  protest:   { label: 'Protestos', color: '#FDD835' },
  terror:    { label: 'Ataques',   color: '#B71C1C' },
  political: { label: 'Politico',  color: '#00BCD4' },
};

export const GDELT_CATEGORY_COLOR = {
  conflict:  Color.fromCssColorString('#E53935'),
  disaster:  Color.fromCssColorString('#FF9800'),
  protest:   Color.fromCssColorString('#FDD835'),
  terror:    Color.fromCssColorString('#B71C1C'),
  political: Color.fromCssColorString('#00BCD4'),
};

const iconCache = new Map();

export function getGdeltIcon(type) {
  if (iconCache.has(type)) return iconCache.get(type);

  const meta = GDELT_CATEGORY_META[type] || GDELT_CATEGORY_META.conflict;
  const size = 28;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Circle background
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.fillStyle = meta.color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner dot
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();

  const url = canvas.toDataURL('image/png');
  iconCache.set(type, url);
  return url;
}
