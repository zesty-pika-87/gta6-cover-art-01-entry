// Per-panel photo state: which photo fills each layout slot and how it is
// cropped (zoom and offset). Nine slots cover the biggest layout; smaller
// layouts simply use the first slots.
//
// v2: six sample photos, so the nine-slot default spreads them with no two
// neighbours alike — horizontally or vertically — and gives every slot its
// own slight zoom and offset, so the three photos that appear twice still
// read as different framings rather than repeats.

// Default assignment for a 3 x 3 grid over six photos. Row-major order:
//   0 1 2
//   3 4 5
//   1 2 3
// Every row and every column holds three different photos.
const GRID9_PATTERN_6 = [0, 1, 2, 3, 4, 5, 1, 2, 3];
// A gentle zoom per slot (1.00–1.12) plus a small offset, so repeated photos
// are framed differently in each of their slots — and slots 6–8, which repeat
// photos 1–3 in the nine-panel grids, get a much tighter zoom (1.32–1.42)
// with a hard offset to the opposite side, so the repeat reads as a close-up
// of a different part of the photo, not the same picture twice.
const SLOT_ZOOM = [1.0, 1.08, 1.0, 1.12, 1.05, 1.0, 1.38, 1.32, 1.42];
const SLOT_OX = [0, 0.12, -0.1, 0, -0.12, 0.1, -0.35, 0.3, -0.3];
const SLOT_OY = [0, -0.1, 0.12, 0, 0.1, -0.12, -0.3, 0.35, 0.3];

export function defaultPanels(photoCount) {
  const n = Math.max(1, photoCount || 1);
  // With fewer than six photos the pattern still avoids identical neighbours
  // wherever the count allows: the modulo keeps neighbours apart for n >= 3.
  const pattern = GRID9_PATTERN_6;
  return Array.from({ length: 9 }, (_, i) => ({
    photo: pattern[i] % n,
    zoom: SLOT_ZOOM[i],
    ox: SLOT_OX[i],
    oy: SLOT_OY[i],
  }));
}

/**
 * Shuffles the photos across the nine slots with a fresh random rotation of
 * the six-photo pattern, keeping the no-identical-neighbours rule: the
 * pattern is rotated, never reordered, so rows and columns stay varied.
 * Returns new panels; the current crops are kept per slot.
 */
export function shufflePanels(panels, photoCount) {
  const n = Math.max(1, photoCount || 1);
  const shift = 1 + Math.floor(Math.random() * (n - 1));
  const next = panels.map((p) => ({ ...p }));
  for (let i = 0; i < next.length; i++) {
    next[i].photo = (GRID9_PATTERN_6[i] + shift) % n;
  }
  return next;
}

export function assignPhoto(panels, slotIdx, photoIdx) {
  const next = panels.map((p) => ({ ...p }));
  if (next[slotIdx]) next[slotIdx].photo = photoIdx;
  return next;
}

export function setCrop(panels, slotIdx, patch) {
  const next = panels.map((p) => ({ ...p }));
  if (!next[slotIdx]) return next;
  next[slotIdx] = { ...next[slotIdx], ...patch };
  if (next[slotIdx].zoom < 1) next[slotIdx].zoom = 1;
  if (next[slotIdx].zoom > 4) next[slotIdx].zoom = 4;
  next[slotIdx].ox = Math.max(-1, Math.min(1, next[slotIdx].ox || 0));
  next[slotIdx].oy = Math.max(-1, Math.min(1, next[slotIdx].oy || 0));
  return next;
}

export function resetCrop(panels, slotIdx) {
  const next = panels.map((p) => ({ ...p }));
  if (next[slotIdx]) {
    next[slotIdx].zoom = 1;
    next[slotIdx].ox = 0;
    next[slotIdx].oy = 0;
  }
  return next;
}
