// Lettering: the big Anton title with a sunset gradient and a dark outline, the
// Pacifico script subtitle with a neon glow, the ribbon badge and the five-star
// heat meter. Every draw auto-fits its text to the box it is given.
//
// v2: the title now wraps. A long title that would shrink below 34% of its
// starting size splits into two balanced lines at a space instead of going
// tiny — so a two-word cover name stays poster-big in the title band.
// drawTitle returns { px, height, bottom } (the drawn block's size and its
// bottom edge), and drawSubtitle positions itself from that block.

function fitFont(ctx, text, maxW, startPx, family, weight = '') {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 10 && ctx.measureText(text).width > maxW) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

/** Splits `text` into two lines at the space nearest the middle, if any. */
function splitTitle(text) {
  const words = text.split(/\s+/);
  if (words.length < 2) return null;
  let best = -1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(' ').length;
    const diff = Math.abs(left - text.length / 2);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  if (best < 0) return null;
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

function paintLine(ctx, line, x, y, px, grad, align) {
  ctx.font = `${px}px Anton, "Arial Narrow", sans-serif`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2a0a33';
  ctx.lineWidth = Math.max(2, px / 14);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = px * 0.12;
  ctx.shadowOffsetY = px * 0.05;
  ctx.strokeText(line, x, y);
  ctx.fillStyle = grad;
  ctx.fillText(line, x, y);
}

/**
 * Big title: sunset gradient fill, dark outline, hard drop shadow.
 * Wraps to two lines when one line would go too small. Returns
 * { px, height, bottom } — the font size used, the drawn block's height,
 * and the y of the block's bottom edge, so the subtitle can sit below it.
 */
export function drawTitle(ctx, text, box, { align = 'center' } = {}) {
  const t = (text || '').trim().toUpperCase();
  if (!t) return { px: 0, height: 0, bottom: box.y };
  const maxPx = box.h * 0.52;
  const grad = ctx.createLinearGradient(0, box.y, 0, box.y + maxPx);
  grad.addColorStop(0, '#ffe259');
  grad.addColorStop(0.45, '#ff7e5f');
  grad.addColorStop(1, '#ff2975');
  const x = align === 'left' ? box.x : align === 'right' ? box.x + box.w : box.x + box.w / 2;
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const onePx = fitFont(ctx, t, box.w, maxPx, 'Anton, "Arial Narrow", sans-serif');
  // One line is fine unless it would shrink below a third of the band's cap:
  // then two balanced lines stay far bigger and read better at thumbnail size.
  if (onePx >= maxPx * 0.34) {
    paintLine(ctx, t, x, box.y + onePx * 0.95, onePx, grad, align);
    ctx.restore();
    return { px: onePx, height: onePx, bottom: box.y + onePx };
  }
  const lines = splitTitle(t);
  if (!lines) {
    paintLine(ctx, t, x, box.y + onePx * 0.95, onePx, grad, align);
    ctx.restore();
    return { px: onePx, height: onePx, bottom: box.y + onePx };
  }
  const linePx = Math.min(
    fitFont(ctx, lines[0], box.w, maxPx * 0.92, 'Anton, "Arial Narrow", sans-serif'),
    fitFont(ctx, lines[1], box.w, maxPx * 0.92, 'Anton, "Arial Narrow", sans-serif'),
    maxPx * 0.84, // two lines + gap must still fit inside the band
  );
  const gap = linePx * 0.18;
  const total = linePx * 2 + gap;
  const y0 = box.y + (box.h - total) / 2 + linePx * 0.95;
  paintLine(ctx, lines[0], x, y0, linePx, grad, align);
  paintLine(ctx, lines[1], x, y0 + linePx + gap, linePx, grad, align);
  ctx.restore();
  return { px: linePx, height: total, bottom: box.y + (box.h + total) / 2 };
}

/**
 * Script subtitle with a neon glow, drawn under the title block.
 * `title` is the { px, height, bottom } drawTitle returned.
 */
export function drawSubtitle(ctx, text, box, title, align = 'center') {
  const t = (text || '').trim();
  const titlePx = title?.px ?? 0;
  const titleBottom = title?.bottom ?? box.y + (title?.height ?? titlePx);
  if (!t || !titlePx) return 0;
  const px = fitFont(ctx, t, box.w * 0.9, Math.max(14, titlePx * 0.34), 'Pacifico, cursive');
  ctx.save();
  ctx.font = `${px}px Pacifico, cursive`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = '#ff2fb3';
  ctx.shadowBlur = px * 0.9;
  ctx.fillStyle = '#8ef6ff';
  const x = align === 'left' ? box.x : align === 'right' ? box.x + box.w : box.x + box.w / 2;
  // Sit just under the title block's real bottom edge (a wrapped two-line
  // title is vertically centred, so its bottom is well below box.y + px);
  // never run past the band's foot.
  const y = Math.min(titleBottom + px * 1.05, box.y + box.h - px * 0.2);
  ctx.fillText(t, x, y);
  ctx.fillText(t, x, y); // second pass strengthens the glow
  ctx.restore();
  return px;
}

/** Ribbon badge, tilted, top right. */
export function drawBadge(ctx, text, W, H) {
  const t = (text || '').trim().toUpperCase();
  if (!t) return;
  const px = Math.max(14, Math.round(Math.min(W, H) * 0.030));
  ctx.save();
  ctx.font = `400 ${px}px "Bebas Neue", "Arial Narrow", sans-serif`;
  const tw = ctx.measureText(t).width;
  const pad = px * 0.9;
  const bw = tw + pad * 2;
  const bh = px * 1.7;
  ctx.translate(W - bw * 0.55, bh * 0.9);
  ctx.rotate(-0.10);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = px * 0.25;
  ctx.shadowOffsetY = px * 0.08;
  const grad = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
  grad.addColorStop(0, '#ff2975');
  grad.addColorStop(1, '#ff7a3d');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh * 0.28);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t, 0, px * 0.06);
  ctx.restore();
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Five-star heat meter, top left. `heat` is 0..5. */
export function drawHeat(ctx, heat, W, H) {
  const r = Math.max(8, Math.round(Math.min(W, H) * 0.022));
  const gap = r * 2.5;
  const x0 = Math.round(W * 0.035);
  const y0 = Math.round(H * 0.045);
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const cx = x0 + r + i * gap;
    starPath(ctx, cx, y0 + r, r);
    ctx.fillStyle = i < heat ? '#ffd319' : 'rgba(255,255,255,0.20)';
    ctx.strokeStyle = 'rgba(20,5,30,0.85)';
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.lineJoin = 'round';
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
