import { Cartesian2 } from 'cesium';
import { LABEL_VISIBLE } from '../providers/constants';
import { getSetting } from '../providers/settingsStore';
import { getFlagImg } from '../providers/countryFlags';

const FONT_SIZE = 14;
const FLAG_W = 34, FLAG_H = 23;
const GAP = 5, PAD_X = 5, PAD_Y = 4;

const _measureCtx = document.createElement('canvas').getContext('2d');

// Canvas image cache: key → { image, W, H }
const _cache = new Map();
const MAX_CACHE = 5000;

function measure(callsign, hasFlag) {
  _measureCtx.font = `${FONT_SIZE}px monospace`;
  const textW = Math.ceil(_measureCtx.measureText(callsign).width);
  const H = hasFlag ? FLAG_H : PAD_Y + FONT_SIZE + 4 + PAD_Y;
  const W = (hasFlag ? FLAG_W + GAP : PAD_X) + textW + PAD_X;
  return { W, H };
}

function draw(ctx, W, H, callsign, hasFlag, flagImg) {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, W, H, hasFlag ? [0, 3, 3, 0] : 3);
  else ctx.rect(0, 0, W, H);
  ctx.fill();

  let x = 0;
  if (hasFlag && flagImg) {
    ctx.drawImage(flagImg, 0, 0, FLAG_W, FLAG_H);
    x = FLAG_W + GAP;
  } else {
    x = PAD_X;
  }

  ctx.font = `${FONT_SIZE}px monospace`;
  ctx.fillStyle = 'white';
  ctx.textBaseline = 'middle';
  ctx.fillText(callsign, x, H / 2);
}

function getOrCreateImage(callsign, country) {
  const key = `${callsign}|${country || ''}`;
  const cached = _cache.get(key);
  if (cached) return cached;

  const flagImg = getFlagImg(country);
  const hasFlag = !!flagImg;
  const { W, H } = measure(callsign, hasFlag);

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  draw(c.getContext('2d'), W, H, callsign, hasFlag, flagImg);

  const entry = { image: c, W, H };

  // Evict oldest if cache is full
  if (_cache.size >= MAX_CACHE) {
    const first = _cache.keys().next().value;
    _cache.delete(first);
  }

  _cache.set(key, entry);
  return entry;
}

export function buildCallsignBillboard(billboards, pos, h, callsign, country) {
  const { image, W, H } = getOrCreateImage(callsign, country);

  const labelY = h / 2 + H / 2 + 6;
  return billboards.add({
    position: pos,
    image,
    width:  W,
    height: H,
    pixelOffset:            new Cartesian2(0, labelY),
    scaleByDistance:        LABEL_VISIBLE(getSetting('LABEL_NEAR'), getSetting('LABEL_FAR')),
    translucencyByDistance: LABEL_VISIBLE(getSetting('LABEL_NEAR'), getSetting('LABEL_FAR')),
  });
}
