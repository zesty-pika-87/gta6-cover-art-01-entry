// grades.js — six gradient-map colour grades for Cover Coast.
//
// A grade is a five-stop ramp (shadow, low-mid, mid, high-mid, highlight).
// Each pixel's brightness is remapped through the ramp with smoothstep
// interpolation between stops, so there is never a visible colour band.
// The 256-entry lookup table for a grade is computed once and cached.
//
// Brightness uses the luma weights ~21% red, ~72% green, ~7% blue.
// The grade is applied only to the art layer (the photos) and blended
// with the original photo by `strength` (0 = untouched, 1 = full grade);
// lettering drawn afterwards stays crisp.

export const GRADE_IDS = ['vice', 'neon', 'palm', 'magenta', 'teal', 'golden'];

export const GRADE_NAMES = {
  vice: 'Vice Sunset',
  neon: 'Neon Nights',
  palm: 'Palm Dusk',
  magenta: 'Magenta Heat',
  teal: 'Teal Noir',
  golden: 'Golden Hour',
};

// Each ramp: [shadow, low-mid, mid, high-mid, highlight], RGB 0-255.
export const GRADE_RAMPS = {
  vice: [
    [26, 8, 54],
    [122, 28, 110],
    [255, 64, 140],
    [255, 150, 80],
    [255, 214, 120],
  ],
  neon: [
    [4, 10, 38],
    [40, 40, 120],
    [120, 60, 220],
    [40, 220, 230],
    [190, 250, 255],
  ],
  palm: [
    [16, 22, 52],
    [90, 60, 110],
    [230, 110, 60],
    [255, 170, 90],
    [255, 226, 160],
  ],
  magenta: [
    [40, 6, 34],
    [120, 20, 80],
    [235, 40, 130],
    [255, 110, 160],
    [255, 190, 210],
  ],
  teal: [
    [2, 16, 18],
    [10, 60, 70],
    [20, 120, 110],
    [80, 200, 180],
    [190, 245, 230],
  ],
  golden: [
    [44, 26, 10],
    [120, 70, 30],
    [230, 150, 50],
    [255, 200, 100],
    [255, 240, 190],
  ],
};

const lookupCache = new Map();

function smoothstep(t) {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}

// Build the 256-entry table for one ramp: for each brightness level, the
// ramp colour at that level, with smoothstep easing inside each segment.
function buildLookup(ramp) {
  const table = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const scaled = t * (ramp.length - 1);
    const segment = Math.min(ramp.length - 2, Math.floor(scaled));
    const local = smoothstep(scaled - segment);
    const from = ramp[segment];
    const to = ramp[segment + 1];
    for (let channel = 0; channel < 3; channel++) {
      table[i * 3 + channel] = Math.round(from[channel] + (to[channel] - from[channel]) * local);
    }
  }
  return table;
}

export function gradeLookup(gradeId) {
  const id = GRADE_RAMPS[gradeId] ? gradeId : 'vice';
  if (!lookupCache.has(id)) lookupCache.set(id, buildLookup(GRADE_RAMPS[id]));
  return lookupCache.get(id);
}

// Remap every pixel of `ctx`'s canvas in place, blending toward the
// graded colour by `strength`.
export function applyGrade(ctx, width, height, gradeId, strength) {
  if (strength <= 0) return;
  const table = gradeLookup(gradeId);
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const mix = Math.min(1, Math.max(0, strength));
  for (let i = 0; i < data.length; i += 4) {
    const luma = Math.round(0.21 * data[i] + 0.72 * data[i + 1] + 0.07 * data[i + 2]);
    const base = luma * 3;
    data[i] = Math.round(data[i] + (table[base] - data[i]) * mix);
    data[i + 1] = Math.round(data[i + 1] + (table[base + 1] - data[i + 1]) * mix);
    data[i + 2] = Math.round(data[i + 2] + (table[base + 2] - data[i + 2]) * mix);
  }
  ctx.putImageData(image, 0, 0);
}
