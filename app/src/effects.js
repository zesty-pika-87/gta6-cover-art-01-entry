// Cover Coast — poster effects.
//
// Film grain (deterministic: the same seed every time, so the preview and
// every export size carry identical grain), a vignette, halftone dots,
// sunburst rays and the thin white poster frame. Everything here is drawn
// on top of the art and lettering, never under it.

const GRAIN_SEED = 20261119;
const GRAIN_TILE = 128;
const GRAIN_OPACITY = 0.1;
const VIGNETTE_STRENGTH = 0.3;
const HALFTONE_OPACITY = 0.16;
const SUNBURST_RAYS = 9;
const SUNBURST_OPACITY = 0.1;

// A small seeded generator in the mulberry32 style: the same sequence on
// every run, in every browser, at every size.
export function seededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;

// One 128 by 128 noise tile, built once from the fixed seed.
export function grainNoiseTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = GRAIN_TILE;
  tile.height = GRAIN_TILE;
  const tileCtx = tile.getContext('2d');
  const image = tileCtx.createImageData(GRAIN_TILE, GRAIN_TILE);
  const random = seededRandom(GRAIN_SEED);
  for (let i = 0; i < image.data.length; i += 4) {
    const shade = Math.floor(random() * 256);
    image.data[i] = shade;
    image.data[i + 1] = shade;
    image.data[i + 2] = shade;
    image.data[i + 3] = 255;
  }
  tileCtx.putImageData(image, 0, 0);
  grainTile = tile;
  return grainTile;
}

// Repeat the noise tile over the whole canvas as an overlay at 10%
// opacity. Deterministic, so two renders of the same cover match pixel
// for pixel.
export function applyGrain(ctx, width, height) {
  const pattern = ctx.createPattern(grainNoiseTile(), 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = GRAIN_OPACITY;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// A radial falloff: clear in the middle, dark at the corners.
export function applyVignette(ctx, width, height) {
  const centreX = width / 2;
  const centreY = height * 0.45;
  const inner = Math.min(width, height) * 0.35;
  const outer = Math.max(width, height) * 0.75;
  const gradient = ctx.createRadialGradient(centreX, centreY, inner, centreX, centreY, outer);
  gradient.addColorStop(0, 'rgba(10, 4, 20, 0)');
  gradient.addColorStop(1, `rgba(10, 4, 20, ${VIGNETTE_STRENGTH})`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// A grid of orange dots across a band, at least 7 px apart, growing
// toward the foot of the band, at 16% opacity.
export function drawHalftone(ctx, band) {
  const spacing = Math.max(7, Math.min(band.w, band.h) * 0.09);
  const top = band.y + band.h * 0.5;
  const bottom = band.y + band.h;
  ctx.save();
  ctx.globalAlpha = HALFTONE_OPACITY;
  ctx.fillStyle = '#ff8a3c';
  for (let y = top + spacing / 2; y < bottom; y += spacing) {
    const depth = (y - top) / Math.max(1, bottom - top);
    const radius = spacing * (0.14 + depth * 0.24);
    for (let x = band.x + spacing / 2; x < band.x + band.w; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Nine fan rays from a point just above the middle of the band, orange
// at 10% opacity, so the title band reads as a sunrise.
export function drawSunburst(ctx, band) {
  const apexX = band.x + band.w / 2;
  const apexY = band.y - band.h * 0.35;
  const leftAngle = Math.atan2(band.y + band.h - apexY, band.x - apexX);
  const rightAngle = Math.atan2(band.y + band.h - apexY, band.x + band.w - apexX);
  const spread = rightAngle - leftAngle;
  const step = spread / SUNBURST_RAYS;
  const reach = Math.hypot(band.w, band.h * 2);
  ctx.save();
  ctx.globalAlpha = SUNBURST_OPACITY;
  ctx.fillStyle = '#ff8a3c';
  for (let ray = 0; ray < SUNBURST_RAYS; ray++) {
    const start = leftAngle + step * ray + step * 0.12;
    const end = leftAngle + step * (ray + 1) - step * 0.12;
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(apexX + Math.cos(start) * reach, apexY + Math.sin(start) * reach);
    ctx.lineTo(apexX + Math.cos(end) * reach, apexY + Math.sin(end) * reach);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// The thin white poster frame: about 0.8% of the canvas's short side.
export function drawPosterFrame(ctx, width, height) {
  const line = Math.max(2, Math.min(width, height) * 0.008);
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = line;
  ctx.strokeRect(line / 2, line / 2, width - line, height - line);
  ctx.restore();
}
