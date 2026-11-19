// layouts.js — the seven cover layouts of Cover Coast.
//
// Every layout is a pure function of the canvas size. It returns the panels
// (photo boxes), the title box and whether the cover needs a scrim gradient
// behind the lettering. Panel coordinates are absolute pixels; rotation is
// radians around the panel centre; `frame` marks a polaroid-style panel.
//
// Gutter rule: the gap between panels is the larger of 2 px and 1.2% of the
// canvas's short side, so the grid stays readable at every export size.

export const LAYOUT_IDS = ['fullbleed', 'four', 'hero3', 'grid9', 'mosaic', 'tilted', 'story'];

export const LAYOUT_NAMES = {
  fullbleed: 'Full Bleed',
  four: 'Four Panel',
  hero3: 'Hero + Three',
  grid9: 'Nine Panel',
  mosaic: 'Mosaic Nine',
  tilted: 'Tilted Snapshots',
  story: 'Story Stack',
};

function gutterFor(width, height) {
  return Math.max(2, 0.012 * Math.min(width, height));
}

function panel(x, y, w, h, rotation = 0, frame = false) {
  return { x, y, w, h, rotation, frame };
}

function titleBox(x, y, w, h, align = 'center', band = false) {
  return { x, y, w, h, align, band };
}

// One photo fills the whole canvas; the caption sits on a scrim at the foot.
function fullBleed(width, height) {
  return {
    panels: [panel(0, 0, width, height)],
    title: titleBox(0.06 * width, 0.66 * height, 0.88 * width, 0.28 * height, 'left', false),
    scrim: true,
  };
}

// Classic 2 x 2 grid; the caption floats centred on a scrim at the foot.
function fourPanel(width, height, gap) {
  const cellW = (width - gap) / 2;
  const cellH = (height - gap) / 2;
  return {
    panels: [
      panel(0, 0, cellW, cellH),
      panel(cellW + gap, 0, cellW, cellH),
      panel(0, cellH + gap, cellW, cellH),
      panel(cellW + gap, cellH + gap, cellW, cellH),
    ],
    title: titleBox(0.05 * width, 0.70 * height, 0.90 * width, 0.24 * height, 'center', false),
    scrim: true,
  };
}

// A tall hero on the left (64% wide), three stacked panels on the right;
// the caption lives in the hero's lower half.
function heroThree(width, height, gap) {
  const heroW = 0.64 * width;
  const sideX = heroW + gap;
  const sideW = width - sideX;
  const cellH = (height - 2 * gap) / 3;
  return {
    panels: [
      panel(0, 0, heroW, height),
      panel(sideX, 0, sideW, cellH),
      panel(sideX, cellH + gap, sideW, cellH),
      panel(sideX, 2 * (cellH + gap), sideW, cellH),
    ],
    title: titleBox(0.04 * width, 0.72 * height, 0.58 * width, 0.22 * height, 'left', false),
    scrim: true,
  };
}

// Nine Panel: a 3 x 3 grid over the top 78%, then a solid title band
// owning the bottom 22%. This is the default cover.
function ninePanel(width, height, gap) {
  const gridH = 0.78 * height;
  const cellW = (width - 2 * gap) / 3;
  const cellH = (gridH - 2 * gap) / 3;
  const panels = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      panels.push(panel(col * (cellW + gap), row * (cellH + gap), cellW, cellH));
    }
  }
  return {
    panels,
    title: titleBox(0, gridH, width, height - gridH, 'center', true),
    scrim: false,
  };
}

// Mosaic Nine: a tall hero on the left of the top 78% (40% wide) and,
// on the right, two columns of four cinematic strips; title band at the foot.
function mosaicNine(width, height, gap) {
  const gridH = 0.78 * height;
  const heroW = 0.40 * width;
  const sideX = heroW + gap;
  const sideW = width - sideX;
  const stripW = (sideW - gap) / 2;
  const stripH = (gridH - 3 * gap) / 4;
  const panels = [panel(0, 0, heroW, gridH)];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      panels.push(panel(sideX + col * (stripW + gap), row * (stripH + gap), stripW, stripH));
    }
  }
  return {
    panels,
    title: titleBox(0, gridH, width, height - gridH, 'center', true),
    scrim: false,
  };
}

// Tilted Snapshots: one dimmed full-bleed photo as the backdrop, three
// framed polaroids tilted over it, caption at the lower left.
function tiltedSnapshots(width, height) {
  return {
    panels: [
      panel(0, 0, width, height),
      panel(0.07 * width, 0.06 * height, 0.30 * width, 0.34 * height, 0.05, true),
      panel(0.33 * width, 0.16 * height, 0.38 * width, 0.52 * height, -0.04, true),
      panel(0.62 * width, 0.48 * height, 0.30 * width, 0.34 * height, 0.06, true),
    ],
    title: titleBox(0.06 * width, 0.76 * height, 0.88 * width, 0.20 * height, 'left', false),
    scrim: true,
  };
}

// Story Stack: a tall top panel (52%), two half-width panels below it
// (20% tall, from 53%), then a title band from 76% to the foot.
function storyStack(width, height, gap) {
  const halfW = (width - gap) / 2;
  return {
    panels: [
      panel(0, 0, width, 0.52 * height),
      panel(0, 0.53 * height, halfW, 0.20 * height),
      panel(halfW + gap, 0.53 * height, halfW, 0.20 * height),
    ],
    title: titleBox(0, 0.76 * height, width, 0.24 * height, 'center', true),
    scrim: false,
  };
}

const BUILDERS = {
  fullbleed: (w, h, g) => fullBleed(w, h),
  four: (w, h, g) => fourPanel(w, h, g),
  hero3: (w, h, g) => heroThree(w, h, g),
  grid9: (w, h, g) => ninePanel(w, h, g),
  mosaic: (w, h, g) => mosaicNine(w, h, g),
  tilted: (w, h, g) => tiltedSnapshots(w, h),
  story: (w, h, g) => storyStack(w, h, g),
};

// Unknown layout ids fall back to the Nine Panel grid.
export function getLayout(id, width, height) {
  const build = BUILDERS[id] || BUILDERS.grid9;
  return build(width, height, gutterFor(width, height));
}
