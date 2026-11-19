// lettering.js — the cover's type: title, subtitle, badge and heat meter.
//
// Title: Anton, all caps, vertical gradient (gold on top, coral in the
// middle, hot pink at the foot), dark purple outline, drop shadow. The
// size fits its box: it shrinks 2 px at a time to a 10 px floor, and if one
// line would shrink below about a third of its starting size it splits
// into two balanced lines at the space nearest the middle, each line at
// 84-92% of the starting size. Band titles start roomy (about 50% of the
// band height) so the subtitle never collides with the frame.
//
// Subtitle: Pacifico script in bright cyan with a pink neon glow, drawn
// just under the title block's real bottom edge — so a wrapped two-line
// title never overlaps it — and never past the foot of the band.
//
// Badge: a ribbon tilted about -0.10 rad at the top right, pink-to-orange
// gradient, white Bebas Neue text, rounded corners.
//
// Heat meter: five stars at the top left; lit stars are glowing gold,
// unlit ones are translucent white with a dark outline.

const TITLE_MIN_SIZE = 10;

function fitOneLine(ctx, text, box, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (size > TITLE_MIN_SIZE && ctx.measureText(text).width > box.w) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

function splitBalanced(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  let best = null;
  let bestGap = Infinity;
  for (let cut = 1; cut < words.length; cut++) {
    const first = words.slice(0, cut).join(' ');
    const second = words.slice(cut).join(' ');
    const gap = Math.abs(first.length - second.length);
    if (gap < bestGap) {
      bestGap = gap;
      best = [first, second];
    }
  }
  return best;
}

// Draw the title inside `box`. Returns the font size, the block height
// and the block's bottom edge (the subtitle anchors to that edge).
export function drawTitle(ctx, box, text) {
  const label = (text || 'SUNSET HEIST').toUpperCase();
  const startSize = box.band ? Math.round(box.h * 0.50) : Math.round(box.h * 0.42);
  let lines = [label];
  let size = fitOneLine(ctx, label, box, startSize);
  if (size < startSize / 3) {
    const split = splitBalanced(label);
    if (split) {
      const firstSize = fitOneLine(ctx, split[0], box, Math.round(startSize * 0.92));
      const secondSize = fitOneLine(ctx, split[1], box, Math.round(startSize * 0.92));
      size = Math.min(firstSize, secondSize);
      // Keep each line at 84-92% of the starting size, never below the floor.
      size = Math.max(TITLE_MIN_SIZE, Math.min(size, Math.round(startSize * 0.92)));
      lines = split;
    }
  }
  const lineHeight = size * 1.18;
  const blockHeight = lines.length * lineHeight;
  const top = box.y + (box.h - blockHeight) / 2;
  const bottom = top + blockHeight;

  ctx.save();
  ctx.textAlign = box.align === 'left' ? 'left' : box.align === 'right' ? 'right' : 'center';
  ctx.textBaseline = 'top';
  const anchorX = box.align === 'left' ? box.x : box.align === 'right' ? box.x + box.w : box.x + box.w / 2;
  const gradient = ctx.createLinearGradient(0, top, 0, bottom);
  gradient.addColorStop(0, '#ffd23e');
  gradient.addColorStop(0.5, '#ff7a59');
  gradient.addColorStop(1, '#ff2e88');
  ctx.fillStyle = gradient;
  ctx.strokeStyle = '#1a0b2e';
  ctx.lineWidth = Math.max(2, size / 12);
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(10, 2, 24, 0.65)';
  ctx.shadowBlur = Math.max(4, size * 0.12);
  ctx.shadowOffsetY = Math.max(2, size * 0.06);
  lines.forEach((line, index) => {
    const y = top + index * lineHeight;
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.strokeText(line, anchorX, y);
    ctx.fillText(line, anchorX, y);
  });
  ctx.restore();
  return { fontSize: size, blockHeight, bottom };
}

// Draw the subtitle just under the title block's real bottom edge.
export function drawSubtitle(ctx, box, titleBottom, text) {
  if (!text) return;
  const bandBottom = box.y + box.h;
  let size = Math.max(12, Math.round(box.h * 0.22));
  ctx.font = `${size}px Pacifico, cursive`;
  const maxWidth = box.w * 0.92;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `${size}px Pacifico, cursive`;
  }
  // Baseline sits just under the title block, never past the band foot:
  // the subtitle's descenders need ~30% of its size below the baseline,
  // so shrink it until title + subtitle + descenders fit the band.
  const available = bandBottom - titleBottom;
  size = Math.max(10, Math.min(size, Math.floor((available - 4) / 0.85)));
  ctx.font = `${size}px Pacifico, cursive`;
  const baseline = titleBottom + size * 0.55;
  const anchorX = box.align === 'left' ? box.x : box.align === 'right' ? box.x + box.w : box.x + box.w / 2;
  ctx.save();
  ctx.font = `${size}px Pacifico, cursive`;
  ctx.textAlign = box.align === 'left' ? 'left' : box.align === 'right' ? 'right' : 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#7ff3ff';
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = Math.max(6, size * 0.5);
  ctx.fillText(text, anchorX, baseline);
  ctx.restore();
}

// A tilted ribbon badge at the top right of the canvas.
export function drawBadge(ctx, width, text) {
  if (!text) return;
  const height = Math.max(20, Math.round(width * 0.038));
  ctx.font = `${Math.round(height * 0.62)}px "Bebas Neue", sans-serif`;
  const textWidth = ctx.measureText(text).width;
  const pad = height * 0.7;
  const badgeW = textWidth + pad * 2;
  const badgeH = height;
  const x = width - badgeW - width * 0.03;
  const y = width * 0.025;
  ctx.save();
  ctx.translate(x + badgeW / 2, y + badgeH / 2);
  ctx.rotate(-0.10);
  const gradient = ctx.createLinearGradient(-badgeW / 2, 0, badgeW / 2, 0);
  gradient.addColorStop(0, '#ff2e88');
  gradient.addColorStop(1, '#ff7a1a');
  ctx.fillStyle = gradient;
  ctx.shadowColor = 'rgba(10, 2, 24, 0.6)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  const radius = badgeH * 0.45;
  ctx.beginPath();
  ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, radius);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(height * 0.62)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 0, badgeH * 0.04);
  ctx.restore();
}

function starPath(ctx, cx, cy, outer, inner) {
  ctx.beginPath();
  for (let point = 0; point < 10; point++) {
    const radius = point % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (point === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// Five-star heat meter at the top left: lit stars glow gold, unlit stars
// are translucent white with a dark outline.
export function drawHeatMeter(ctx, width, heat) {
  const size = Math.max(12, Math.round(width * 0.028));
  const gap = size * 0.25;
  const startX = width * 0.03 + size / 2;
  const cy = width * 0.03 + size / 2;
  ctx.save();
  for (let star = 0; star < 5; star++) {
    const cx = startX + star * (size + gap);
    starPath(ctx, cx, cy, size / 2, size / 5);
    if (star < heat) {
      ctx.fillStyle = '#ffc93e';
      ctx.shadowColor = '#ffb13e';
      ctx.shadowBlur = size * 0.45;
      ctx.fill();
      ctx.shadowColor = 'transparent';
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(20, 6, 40, 0.85)';
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.stroke();
  }
  ctx.restore();
}
