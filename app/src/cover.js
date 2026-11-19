// cover.js — the cover renderer of Cover Coast.
//
// renderCover draws, in order:
//   1. an offscreen art layer (dark purple ground, every panel's photo in
//      cover-fit with its crop, polaroid frames, thin dark seams, and a
//      45% dim over the full-bleed backdrop of the Tilted layout),
//   2. the grade, applied to the art layer only,
//   3. the art layer onto the main canvas,
//   4. the title band (dark gradient, orange top edge, sunburst, halftone)
//      or a scrim gradient when the layout floats its caption,
//   5. title, subtitle, badge and heat meter,
//   6. the thin white poster frame, deterministic grain and vignette.
//
// Photos never leave the panel: offsets are clamped so the drawn photo
// always covers its panel. In shot-cover mode the canvas is rendered at
// viewport size (set by main.js), so the screenshot stays razor sharp.

import { getLayout } from './layouts.js';
import { applyGrade } from './grades.js';
import { drawTitle, drawSubtitle, drawBadge, drawHeatMeter } from './lettering.js';
import { drawGrain, drawVignette, drawHalftone, drawSunburst, drawPosterFrame } from './effects.js';

function coverFitDraw(ctx, image, panel, slot) {
  const imageW = image.naturalWidth || image.width;
  const imageH = image.naturalHeight || image.height;
  const scale = Math.max(panel.w / imageW, panel.h / imageH) * slot.zoom;
  const drawW = imageW * scale;
  const drawH = imageH * scale;
  const maxShiftX = Math.max(0, (drawW - panel.w) / 2);
  const maxShiftY = Math.max(0, (drawH - panel.h) / 2);
  const dx = (panel.w - drawW) / 2 + slot.offsetX * maxShiftX;
  const dy = (panel.h - drawH) / 2 + slot.offsetY * maxShiftY;
  return { dx, dy, drawW, drawH };
}

function placeholderFill(ctx, panel, index) {
  const gradient = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
  const hues = [
    ['#3b1155', '#ff2e88'],
    ['#1c2a6b', '#2ec8ff'],
    ['#5a1a1a', '#ff7a1a'],
  ];
  const pair = hues[index % hues.length];
  gradient.addColorStop(0, pair[0]);
  gradient.addColorStop(1, pair[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
}

function drawPanelPhoto(ctx, panel, slot, photo, slotIndex) {
  ctx.save();
  const centreX = panel.x + panel.w / 2;
  const centreY = panel.y + panel.h / 2;
  ctx.translate(centreX, centreY);
  if (panel.rotation) ctx.rotate(panel.rotation);

  if (panel.frame) {
    // Polaroid frame: cream border, thicker at the foot, soft shadow.
    const pad = Math.max(4, 0.045 * Math.min(panel.w, panel.h));
    const foot = pad * 3.2;
    ctx.fillStyle = '#fdf6e3';
    ctx.shadowColor = 'rgba(5, 1, 16, 0.55)';
    ctx.shadowBlur = Math.max(6, pad * 1.6);
    ctx.shadowOffsetY = Math.max(3, pad * 0.7);
    ctx.fillRect(-panel.w / 2 - pad, -panel.h / 2 - pad, panel.w + pad * 2, panel.h + pad + foot);
    ctx.shadowColor = 'transparent';
  }

  ctx.beginPath();
  ctx.rect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
  ctx.clip();
  if (photo && photo.image) {
    const fit = coverFitDraw(ctx, photo.image, panel, slot);
    ctx.drawImage(photo.image, fit.dx - panel.w / 2, fit.dy - panel.h / 2, fit.drawW, fit.drawH);
  } else {
    ctx.save();
    ctx.translate(-panel.w / 2, -panel.h / 2);
    placeholderFill(ctx, { x: 0, y: 0, w: panel.w, h: panel.h }, slotIndex);
    ctx.restore();
  }
  ctx.restore();
}

function drawTitleBand(ctx, band, width, height) {
  const gradient = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  gradient.addColorStop(0, '#1c0b33');
  gradient.addColorStop(1, '#0a0418');
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  drawSunburst(ctx, band);
  drawHalftone(ctx, band);
  // Orange rule along the band's top edge.
  ctx.fillStyle = '#ff7a1a';
  ctx.fillRect(band.x, band.y, band.w, Math.max(2, 0.006 * height));
  ctx.restore();
  void width;
}

function drawScrim(ctx, width, height) {
  const top = height * 0.5;
  const gradient = ctx.createLinearGradient(0, top, 0, height);
  gradient.addColorStop(0, 'rgba(8, 2, 20, 0)');
  gradient.addColorStop(1, 'rgba(8, 2, 20, 0.85)');
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, top, width, height - top);
  ctx.restore();
}

export function renderCover(canvas, state, options = {}) {
  const width = options.width || canvas.width;
  const height = options.height || canvas.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const layout = getLayout(state.layout, width, height);

  // 1. Art layer: panels, frames, seams, dimmed Tilted backdrop.
  const art = document.createElement('canvas');
  art.width = width;
  art.height = height;
  const actx = art.getContext('2d');
  actx.fillStyle = '#160a2a';
  actx.fillRect(0, 0, width, height);
  layout.panels.forEach((panel, index) => {
    const slot = state.slots[index] || { photoIndex: 0, zoom: 1, offsetX: 0, offsetY: 0 };
    const photo = state.photos[slot.photoIndex];
    drawPanelPhoto(actx, panel, slot, photo, index);
    if (index === 0 && state.layout === 'tilted') {
      actx.save();
      actx.fillStyle = 'rgba(10, 4, 24, 0.45)';
      actx.fillRect(0, 0, width, height);
      actx.restore();
    }
  });
  // Thin dark seams so a multi-panel grid reads as separate photos.
  const seam = Math.max(1, 0.004 * Math.min(width, height));
  actx.save();
  actx.strokeStyle = 'rgba(20, 5, 40, 0.85)';
  actx.lineWidth = seam;
  layout.panels.forEach((panel) => {
    if (panel.frame || panel.rotation) return;
    actx.strokeRect(panel.x + seam / 2, panel.y + seam / 2, panel.w - seam, panel.h - seam);
  });
  actx.restore();

  // 2. Grade on the art layer only.
  applyGrade(actx, width, height, state.grade, state.intensity);

  // 3. Art layer onto the main canvas.
  ctx.drawImage(art, 0, 0);

  // 4. Title band or scrim.
  if (layout.title.band) drawTitleBand(ctx, layout.title, width, height);
  else if (layout.scrim) drawScrim(ctx, width, height);

  // 5. Lettering: title, subtitle anchored under its real bottom edge,
  // badge ribbon and heat stars.
  const titleResult = drawTitle(ctx, layout.title, state.title);
  drawSubtitle(ctx, layout.title, titleResult.bottom, state.subtitle);
  drawBadge(ctx, width, state.badge);
  drawHeatMeter(ctx, width, state.heat);

  // 6. Poster frame, grain, vignette.
  drawPosterFrame(ctx, width, height);
  drawGrain(ctx, width, height);
  drawVignette(ctx, width, height);
  return canvas;
}
