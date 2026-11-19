// Cover Coast — the cover renderer.
//
// The cover is painted in layers, in this order:
//   1. the art layer (its own canvas, dark purple ground): every panel's
//      photo, cover-fit to its crop, tilted panels rotated about their
//      centre, polaroids in a cream frame with a shadow, a thin dark edge
//      on plain multi-panel panels so the grid reads as separate photos;
//      on the Tilted layout the full-bleed backdrop is dimmed by a dark
//      wash of about 45%.
//   2. the grade, applied to the art layer alone.
//   3. the art layer onto the main canvas.
//   4. the title band (dark gradient, orange edge line, faint sunburst
//      behind, halftone over the lower half) or a scrim gradient when the
//      layout has no band of its own.
//   5. the title, subtitle, badge and heat meter.
//   6. the thin white poster frame, deterministic grain, vignette.
//
// Lettering is drawn after the grade, so it always stays sharp.

import { layoutPanels } from './layouts.js';
import { applyGrade } from './grades.js';
import { drawCoverTitle, drawSubtitle, drawBadge, drawHeat } from './lettering.js';
import { applyGrain, applyVignette, drawHalftone, drawSunburst, drawPosterFrame } from './effects.js';

const ART_GROUND = '#150a22';
const BACKDROP_DIM = 0.45;
const PANEL_EDGE = 'rgba(12, 4, 22, 0.55)';
const POLAROID_CREAM = '#f6efdd';

function drawPhotoCoverFit(ctx, image, panel, crop) {
  const zoom = Math.max(1, crop.zoom || 1);
  const scale = Math.max(panel.w / image.naturalWidth, panel.h / image.naturalHeight) * zoom;
  const drawnW = image.naturalWidth * scale;
  const drawnH = image.naturalHeight * scale;
  const maxOx = Math.max(0, (drawnW - panel.w) / 2);
  const maxOy = Math.max(0, (drawnH - panel.h) / 2);
  const dx = panel.x + (panel.w - drawnW) / 2 + (crop.ox || 0) * maxOx;
  const dy = panel.y + (panel.h - drawnH) / 2 + (crop.oy || 0) * maxOy;
  ctx.drawImage(image, dx, dy, drawnW, drawnH);
}

function drawPhotoPanel(ctx, image, panel, crop) {
  ctx.save();
  ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
  ctx.rotate(panel.rot || 0);
  if (panel.framed) {
    // Cream polaroid frame, thicker at the foot, with a soft shadow.
    const border = Math.max(6, Math.min(panel.w, panel.h) * 0.05);
    const foot = border * 2.2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = border * 1.2;
    ctx.shadowOffsetY = border * 0.5;
    ctx.fillStyle = POLAROID_CREAM;
    ctx.fillRect(-panel.w / 2 - border, -panel.h / 2 - border, panel.w + border * 2, panel.h + border + foot);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    ctx.rect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
    ctx.clip();
    drawPhotoCoverFit(ctx, image, { x: -panel.w / 2, y: -panel.h / 2, w: panel.w, h: panel.h }, crop);
  } else {
    ctx.beginPath();
    ctx.rect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
    ctx.clip();
    drawPhotoCoverFit(ctx, image, { x: -panel.w / 2, y: -panel.h / 2, w: panel.w, h: panel.h }, crop);
  }
  ctx.restore();
  if (panel.dim) {
    ctx.save();
    ctx.fillStyle = `rgba(10, 5, 20, ${BACKDROP_DIM})`;
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.restore();
  }
}

function drawEmptyPanel(ctx, panel) {
  const gradient = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
  gradient.addColorStop(0, '#2a1245');
  gradient.addColorStop(1, '#170b28');
  ctx.save();
  ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
  ctx.rotate(panel.rot || 0);
  ctx.fillStyle = gradient;
  ctx.fillRect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
  ctx.restore();
}

function drawTitleBand(ctx, band, width, height) {
  const gradient = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  gradient.addColorStop(0, '#1d0c31');
  gradient.addColorStop(1, '#0b0517');
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  // A faint sunrise behind the lettering.
  drawSunburst(ctx, band);
  // Halftone dots over the lower half of the band.
  drawHalftone(ctx, band);
  // The orange edge line where the band meets the photos.
  ctx.fillStyle = '#ff7a2e';
  ctx.fillRect(band.x, band.y, band.w, Math.max(2, Math.min(width, height) * 0.004));
  ctx.restore();
}

function drawScrim(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, height * 0.5, 0, height);
  gradient.addColorStop(0, 'rgba(12, 5, 24, 0)');
  gradient.addColorStop(1, 'rgba(12, 5, 24, 0.85)');
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, height * 0.5, width, height * 0.5);
  ctx.restore();
}

// Paint the whole cover onto ctx at this size, from the live state.
export function renderCover(ctx, state, width, height) {
  const layout = layoutPanels(state.layout, width, height);

  // 1 — the art layer.
  const art = document.createElement('canvas');
  art.width = width;
  art.height = height;
  const artCtx = art.getContext('2d');
  artCtx.fillStyle = ART_GROUND;
  artCtx.fillRect(0, 0, width, height);
  layout.panels.forEach((panel, index) => {
    const slot = state.slots[index];
    const photo = slot ? state.photos[slot.photo] : null;
    if (photo && photo.image && photo.image.naturalWidth > 0) {
      drawPhotoPanel(artCtx, photo.image, panel, slot);
    } else {
      drawEmptyPanel(artCtx, panel);
    }
    if (!panel.framed && layout.panels.length > 1) {
      artCtx.save();
      artCtx.strokeStyle = PANEL_EDGE;
      artCtx.lineWidth = Math.max(1, Math.min(width, height) * 0.004);
      artCtx.strokeRect(panel.x, panel.y, panel.w, panel.h);
      artCtx.restore();
    }
  });

  // 2 — the grade, on the art layer alone.
  const artImage = artCtx.getImageData(0, 0, width, height);
  applyGrade(artImage, state.grade, state.intensity);
  artCtx.putImageData(artImage, 0, 0);

  // 3 — the art layer onto the main canvas.
  ctx.save();
  ctx.drawImage(art, 0, 0);
  ctx.restore();

  // 4 — the title band, or a scrim when the layout has no band.
  const title = layout.title;
  if (title.band) {
    drawTitleBand(ctx, title, width, height);
  } else {
    drawScrim(ctx, width, height);
  }

  // 5 — lettering: title, then the subtitle right under the title
  // block's real bottom edge, then badge and heat.
  const titleMetrics = drawCoverTitle(ctx, state.title, title);
  const foot = title.band
    ? title
    : { x: title.x, y: title.y, w: title.w, h: Math.max(title.h, height - title.y), align: title.align };
  drawSubtitle(ctx, state.subtitle, titleMetrics.blockBottom, foot);
  drawBadge(ctx, state.badge, width, height);
  drawHeat(ctx, state.heat, width, height);

  // 6 — frame, grain, vignette.
  drawPosterFrame(ctx, width, height);
  applyGrain(ctx, width, height);
  applyVignette(ctx, width, height);
}

// A fresh canvas with the cover rendered on it, at this size.
export function makeCoverCanvas(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  renderCover(ctx, state, width, height);
  return canvas;
}
