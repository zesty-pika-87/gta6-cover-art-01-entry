// effects.js — deterministic poster effects for Cover Coast.
//
// Grain is seeded (mulberry32 with a fixed seed) and tiled from a small
// 128 x 128 noise canvas, so the grain is pixel-identical in the preview
// and in every export size. Vignette, halftone dots and sunburst rays are
// drawn with plain canvas gradients and shapes — no assets, no network.

const GRAIN_SEED = 20261119;
const GRAIN_TILE = 128;

// A tiny seeded PRNG (mulberry32): same seed, same sequence, every run.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;

function makeGrainTile() {
  const tile = document.createElement('canvas');
  tile.width = GRAIN_TILE;
  tile.height = GRAIN_TILE;
  const tctx = tile.getContext('2d');
  const image = tctx.createImageData(GRAIN_TILE, GRAIN_TILE);
  const random = mulberry32(GRAIN_SEED);
  for (let i = 0; i < image.data.length; i += 4) {
    const shade = Math.floor(random() * 256);
    image.data[i] = shade;
    image.data[i + 1] = shade;
    image.data[i + 2] = shade;
    image.data[i + 3] = 255;
  }
  tctx.putImageData(image, 0, 0);
  return tile;
}

// Film grain: the noise tile repeated as a pattern at 10% opacity in
// overlay mode, so it reads as grain rather than a grey wash.
export function drawGrain(ctx, width, height) {
  if (!grainTile) grainTile = makeGrainTile();
  const pattern = ctx.createPattern(grainTile, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// Vignette: radial gradient, transparent in the middle, ~30% dark at the
// corners, pulling the eye to the centre of the cover.
export function drawVignette(ctx, width, height) {
  const radius = Math.hypot(width, height) / 2;
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, radius * 0.45,
    width / 2, height / 2, radius,
  );
  gradient.addColorStop(0, 'rgba(8, 3, 18, 0)');
  gradient.addColorStop(1, 'rgba(8, 3, 18, 0.30)');
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// Halftone: a grid of orange dots inside a band, dots growing toward the
// foot of the band, at 16% opacity. Spacing never drops below 7 px.
export function drawHalftone(ctx, band) {
  const spacing = Math.max(7, band.w / 90);
  const maxRadius = spacing * 0.42;
  ctx.save();
  ctx.fillStyle = '#ff7a2e';
  ctx.globalAlpha = 0.16;
  for (let y = band.y + spacing / 2; y < band.y + band.h; y += spacing) {
    const depth = (y - band.y) / Math.max(1, band.h);
    const radius = maxRadius * (0.35 + 0.65 * depth);
    for (let x = band.x + spacing / 2; x < band.x + band.w; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Sunburst: 9 fan rays from a point just above the centre of the band,
// orange at 10% opacity, so the title band glows without drowning the type.
export function drawSunburst(ctx, band) {
  const originX = band.x + band.w / 2;
  const originY = band.y - band.h * 0.25;
  const reach = Math.hypot(band.w, band.h) * 0.9;
  ctx.save();
  // Clip to the band: without this the upward fan would leak rays over
  // the photo grid above the band.
  ctx.beginPath();
  ctx.rect(band.x, band.y, band.w, band.h);
  ctx.clip();
  ctx.fillStyle = '#ff9a3d';
  ctx.globalAlpha = 0.10;
  for (let ray = 0; ray < 9; ray++) {
    const angle = Math.PI + (ray / 8) * Math.PI;
    const spread = 0.055;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.arc(originX, originY, reach, angle - spread, angle + spread);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Poster frame: a thin white line just inside the canvas edge, about
// 0.8% of the short side thick.
export function drawPosterFrame(ctx, width, height) {
  const line = Math.max(1, 0.008 * Math.min(width, height));
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = line;
  ctx.strokeRect(line / 2, line / 2, width - line, height - line);
  ctx.restore();
}
