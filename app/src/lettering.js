// Cover Coast — poster lettering.
//
// The title is big Anton, all caps, with a vertical sunset gradient
// (yellow over coral over hot pink), a dark purple outline and a drop
// shadow. It shrinks in 2 px steps to fit its box; when one line would
// shrink below about a third of its starting size, the title splits into
// two balanced lines instead. The subtitle is Pacifico script in bright
// cyan with a pink neon glow, drawn just under the title block's real
// bottom edge, never past the band's foot. The badge is a tilted ribbon,
// the heat meter five stars.

const TITLE_TOP = '#ffd23f';
const TITLE_MID = '#ff7a59';
const TITLE_BOTTOM = '#ff2e7e';
const TITLE_OUTLINE = '#200b33';
const SUBTITLE_FILL = '#8ef4ff';
const SUBTITLE_GLOW = '#ff2e88';
const BADGE_FROM = '#ff2e7e';
const BADGE_TO = '#ff7a2e';
const STAR_LIT = '#ffc93c';
const STAR_DIM = 'rgba(255, 255, 255, 0.28)';

function measureLine(ctx, text, fontSize) {
  ctx.font = `${fontSize}px Anton, 'Arial Black', sans-serif`;
  return ctx.measureText(text).width;
}

function splitTitle(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  let best = null;
  for (let cut = 1; cut < words.length; cut++) {
    const first = words.slice(0, cut).join(' ');
    const second = words.slice(cut).join(' ');
    const imbalance = Math.abs(first.length - second.length);
    if (!best || imbalance < best.imbalance) {
      best = { first, second, imbalance };
    }
  }
  return best;
}

// Fit one line into a width: shrink by 2 px steps down to a 10 px floor.
function fitLine(ctx, text, width, startSize) {
  let size = startSize;
  while (size > 10 && measureLine(ctx, text, size) > width) {
    size -= 2;
  }
  return size;
}

function drawTitleLine(ctx, text, centreX, baselineY, fontSize, blockTop, blockHeight) {
  const gradient = ctx.createLinearGradient(0, blockTop, 0, blockTop + blockHeight);
  gradient.addColorStop(0, TITLE_TOP);
  gradient.addColorStop(0.52, TITLE_MID);
  gradient.addColorStop(1, TITLE_BOTTOM);
  ctx.save();
  ctx.font = `${fontSize}px Anton, 'Arial Black', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = fontSize * 0.08;
  ctx.shadowOffsetY = fontSize * 0.05;
  ctx.strokeStyle = TITLE_OUTLINE;
  ctx.lineWidth = Math.max(2, fontSize * 0.09);
  ctx.strokeText(text, centreX, baselineY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = gradient;
  ctx.fillText(text, centreX, baselineY);
  ctx.restore();
}

// Draw the title inside its box. Returns the size used, the block's
// height and the block's bottom edge, so the subtitle can sit right under it.
export function drawCoverTitle(ctx, text, box) {
  const label = (text || 'COVER').toUpperCase();
  const innerW = box.w * 0.96;
  const centreX = box.align === 'left' ? box.x + innerW / 2 : box.x + box.w / 2;
  const startSize = Math.floor(box.h * 0.62);
  const oneLineSize = fitLine(ctx, label, innerW, startSize);

  let lines;
  let fontSize;
  if (oneLineSize < startSize * 0.34) {
    const split = splitTitle(label);
    if (split) {
      const firstSize = fitLine(ctx, split.first, innerW, Math.floor(startSize * 0.92));
      const secondSize = fitLine(ctx, split.second, innerW, Math.floor(startSize * 0.92));
      fontSize = Math.min(firstSize, secondSize);
      lines = [split.first, split.second];
    } else {
      fontSize = oneLineSize;
      lines = [label];
    }
  } else {
    fontSize = oneLineSize;
    lines = [label];
  }

  const lineGap = fontSize * 0.18;
  const blockHeight = lines.length * fontSize + (lines.length - 1) * lineGap;
  const blockTop = box.y + (box.h - blockHeight) / 2;
  lines.forEach((line, index) => {
    const baselineY = blockTop + fontSize * (index + 1) + lineGap * index - fontSize * 0.12;
    drawTitleLine(ctx, line, centreX, baselineY, fontSize, blockTop, blockHeight);
  });
  return { fontSize, blockHeight, blockBottom: blockTop + blockHeight };
}

// Draw the subtitle just under the title block's real bottom edge, and
// never past the foot of the band it lives in.
export function drawSubtitle(ctx, text, titleBottom, band) {
  const label = (text || '').trim();
  if (!label) return 0;
  const size = Math.max(14, Math.min(band.h * 0.17, 46));
  const foot = band.y + band.h - 4;
  const baselineY = Math.min(titleBottom + size * 0.95, foot);
  ctx.save();
  ctx.font = `${size}px Pacifico, cursive`;
  ctx.textAlign = band.align === 'left' ? 'left' : 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = SUBTITLE_GLOW;
  ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = SUBTITLE_FILL;
  const x = band.align === 'left' ? band.x + band.w * 0.05 : band.x + band.w / 2;
  ctx.fillText(label, x, baselineY);
  ctx.restore();
  return size;
}

// A slightly tilted ribbon in the top-right corner, pink into orange,
// white Bebas Neue lettering, rounded corners.
export function drawBadge(ctx, text, width, height) {
  const label = (text || '').trim();
  if (!label) return;
  const fontSize = Math.max(16, Math.round(height * 0.028));
  ctx.save();
  ctx.font = `${fontSize}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
  const textW = ctx.measureText(label).width;
  const padX = fontSize * 0.9;
  const padY = fontSize * 0.45;
  const ribbonW = textW + padX * 2;
  const ribbonH = fontSize + padY * 2;
  const centreX = width * 0.86;
  const centreY = height * 0.055;
  ctx.translate(centreX, centreY);
  ctx.rotate(-0.1);
  const gradient = ctx.createLinearGradient(-ribbonW / 2, 0, ribbonW / 2, 0);
  gradient.addColorStop(0, BADGE_FROM);
  gradient.addColorStop(1, BADGE_TO);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = fontSize * 0.35;
  ctx.shadowOffsetY = fontSize * 0.12;
  roundRectPath(ctx, -ribbonW / 2, -ribbonH / 2, ribbonW, ribbonH, ribbonH * 0.32);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, fontSize * 0.06);
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function starPath(ctx, cx, cy, radius) {
  const outer = radius;
  const inner = radius * 0.45;
  ctx.beginPath();
  for (let point = 0; point < 10; point++) {
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const r = point % 2 === 0 ? outer : inner;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (point === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// Five stars in the top-left corner: lit ones golden yellow with a glow,
// unlit ones translucent white with a dark outline.
export function drawHeat(ctx, heat, width, height) {
  const lit = Math.max(0, Math.min(5, Math.round(heat || 0)));
  if (lit === 0) return;
  const radius = Math.max(7, height * 0.016);
  const step = radius * 2.4;
  const startX = width * 0.045;
  const centreY = height * 0.045;
  ctx.save();
  for (let star = 0; star < 5; star++) {
    const cx = startX + star * step;
    starPath(ctx, cx, centreY, radius);
    if (star < lit) {
      ctx.shadowColor = 'rgba(255, 201, 60, 0.9)';
      ctx.shadowBlur = radius * 0.9;
      ctx.fillStyle = STAR_LIT;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = STAR_DIM;
      ctx.fill();
      ctx.strokeStyle = 'rgba(20, 8, 32, 0.8)';
      ctx.lineWidth = Math.max(1, radius * 0.12);
      ctx.stroke();
    }
  }
  ctx.restore();
}
