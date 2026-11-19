// Poster effects: film grain, vignette and a halftone dot field for the title
// band. All of them are resolution aware (they scale with the canvas) so the
// small preview and the full-size export look like the same poster.

let noise = null;

function noiseCanvas() {
  if (noise) return noise;
  noise = document.createElement('canvas');
  noise.width = 128;
  noise.height = 128;
  const c = noise.getContext('2d');
  const img = c.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return noise;
}

/** Film grain tiled over the canvas. `amount` 0..1. */
export function grain(ctx, W, H, amount = 0.10) {
  if (amount <= 0) return;
  const pattern = ctx.createPattern(noiseCanvas(), 'repeat');
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Darkened corners that pull the eye to the middle. */
export function vignette(ctx, W, H, strength = 0.32) {
  if (strength <= 0) return;
  const r = Math.hypot(W, H) / 2;
  const grad = ctx.createRadialGradient(W / 2, H / 2, r * 0.45, W / 2, H / 2, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(5,0,12,${strength})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Halftone dot field across a band, denser toward its foot. */
export function halftone(ctx, box, color = '#ff7a3d', alpha = 0.16) {
  const spacing = Math.max(7, Math.round(box.w / 56));
  const rows = Math.floor(box.h / spacing);
  const cols = Math.floor(box.w / spacing);
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const f = 0.35 + 0.65 * (r / Math.max(1, rows));
      const rad = spacing * 0.30 * f;
      ctx.beginPath();
      ctx.arc(box.x + c * spacing + spacing / 2, box.y + r * spacing + spacing / 2, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Thin poster frame around the whole cover. */
export function posterFrame(ctx, W, H, color = 'rgba(255,255,255,0.85)') {
  const w = Math.max(3, Math.round(Math.min(W, H) * 0.008));
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.strokeRect(w / 2, w / 2, W - w, H - w);
  ctx.restore();
}
