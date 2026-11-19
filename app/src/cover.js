// The cover renderer: panels of photos, gradient-map grade, title band with
// halftone, sunset-gradient lettering, badge, heat meter, grain and vignette.
// Photos are drawn to an offscreen art layer first so the grade colours only
// the photography; lettering and effects are drawn on top, crisp.
//
// v2: every panel gets a thin dark keyline so the nine-panel and mosaic grids
// read as separate photos instead of one blended field, the title band gets a
// faint sunburst behind the halftone, and the subtitle now positions itself
// from the title's real drawn block (drawTitle returns { px, height }) so a
// wrapped two-line title never collides with it.

import { layoutPanels } from './layouts.js';
import { applyGrade } from './grades.js';
import { drawTitle, drawSubtitle, drawBadge, drawHeat } from './lettering.js';
import { grain, vignette, halftone, posterFrame, rays } from './effects.js';

/** Cover-fits one photo into a panel rect, honouring its crop (zoom/offset). */
function drawPhotoCover(ctx, img, p, slot) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const zoom = Math.max(1, slot.zoom || 1);
  const scale = Math.max(p.w / iw, p.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const maxX = Math.max(0, (dw - p.w) / 2);
  const maxY = Math.max(0, (dh - p.h) / 2);
  const dx = p.x + (p.w - dw) / 2 + (slot.ox || 0) * maxX;
  const dy = p.y + (p.h - dh) / 2 + (slot.oy || 0) * maxY;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * Renders the whole cover onto `canvas` from a state:
 * { photos: [{img}], panels: [{photo, zoom, ox, oy}], layout, grade,
 *   intensity, title, subtitle, badge, heat }.
 */
export function renderCover(canvas, s) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const L = layoutPanels(s.layout, W, H);

  // Art layer: photos only, then the grade.
  const art = document.createElement('canvas');
  art.width = W;
  art.height = H;
  const actx = art.getContext('2d');
  actx.fillStyle = '#160a24';
  actx.fillRect(0, 0, W, H);
  L.panels.forEach((p, i) => {
    const slot = s.panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const photo = s.photos[slot.photo];
    actx.save();
    if (p.rot) {
      actx.translate(p.x + p.w / 2, p.y + p.h / 2);
      actx.rotate(p.rot);
      actx.translate(-(p.x + p.w / 2), -(p.y + p.h / 2));
    }
    if (p.frame) {
      const fw = Math.round(Math.min(p.w, p.h) * 0.045);
      actx.shadowColor = 'rgba(0,0,0,0.45)';
      actx.shadowBlur = Math.round(Math.min(W, H) * 0.02);
      actx.shadowOffsetY = Math.round(Math.min(W, H) * 0.008);
      actx.fillStyle = '#f8f4ec';
      actx.fillRect(p.x - fw, p.y - fw, p.w + 2 * fw, p.h + 2 * fw);
      actx.shadowColor = 'transparent';
      actx.shadowBlur = 0;
      actx.shadowOffsetY = 0;
    }
    actx.beginPath();
    actx.rect(p.x, p.y, p.w, p.h);
    actx.clip();
    if (photo && photo.img) drawPhotoCover(actx, photo.img, p, slot);
    else {
      actx.fillStyle = '#2b1838';
      actx.fillRect(p.x, p.y, p.w, p.h);
    }
    actx.restore();
    // Thin dark keyline around each panel: the grid reads as nine separate
    // photos even where two neighbours are similarly coloured.
    if (!p.frame && p.w > 0 && L.panels.length > 1) {
      actx.save();
      actx.strokeStyle = 'rgba(12,4,22,0.55)';
      actx.lineWidth = Math.max(1, Math.round(Math.min(W, H) * 0.004));
      actx.strokeRect(p.x, p.y, p.w, p.h);
      actx.restore();
    }
  });
  // The tilted layout's first panel is a dimmed full-bleed backdrop.
  if (s.layout === 'tilted') {
    actx.save();
    actx.globalAlpha = 0.45;
    actx.fillStyle = '#0d0518';
    actx.fillRect(0, 0, W, H);
    actx.restore();
  }
  applyGrade(actx, W, H, s.grade, s.intensity ?? 0.85);
  ctx.drawImage(art, 0, 0);

  // Title band or scrim.
  const t = L.title;
  if (t.band) {
    const grad = ctx.createLinearGradient(0, t.y, 0, t.y + t.h);
    grad.addColorStop(0, 'rgba(16,5,28,0.82)');
    grad.addColorStop(1, 'rgba(32,8,44,0.96)');
    ctx.fillStyle = grad;
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.fillStyle = 'rgba(255,122,61,0.9)';
    ctx.fillRect(t.x, t.y, t.w, Math.max(3, H * 0.006));
    rays(ctx, { x: t.x, y: t.y, w: t.w, h: t.h });
    halftone(ctx, { x: t.x, y: t.y + t.h * 0.55, w: t.w, h: t.h * 0.45 });
  } else if (L.scrim) {
    const grad = ctx.createLinearGradient(0, t.y - H * 0.12, 0, H);
    grad.addColorStop(0, 'rgba(10,4,20,0)');
    grad.addColorStop(1, 'rgba(10,4,20,0.78)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, t.y - H * 0.12, W, H - (t.y - H * 0.12));
  }

  // Lettering, badge, heat.
  const title = drawTitle(ctx, s.title, t, { align: t.align });
  drawSubtitle(ctx, s.subtitle, t, title, t.align);
  drawBadge(ctx, s.badge, W, H);
  drawHeat(ctx, s.heat ?? 4, W, H);

  // Finish: frame, grain, vignette.
  posterFrame(ctx, W, H);
  grain(ctx, W, H, 0.10);
  vignette(ctx, W, H, 0.30);
}
