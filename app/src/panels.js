// panels.js — the nine photo slots of Cover Coast.
//
// The default assignment spreads six photos over nine slots in row-major
// order 0,1,2,3,4,5,1,2,3, so every row and every column holds three
// different photos and no two neighbours (horizontal or vertical) match.
// Each slot has its own crop: a gentle zoom (1.00-1.12) and a small offset
// for first appearances, and a tight zoom (1.32-1.42) with a hard offset to
// the opposite side for the repeats (slots 6-8), so a repeated photo reads
// as a close-up of another part of the frame — slot 8, the bottom-right
// corner, is offset to (-0.35, +0.25), a close-up of the smiling face and
// hat rather than a headless torso.
//
// Shuffle rotates the assignment pattern by 1..(photoCount - 1) instead of
// scrambling it, so the no-equal-neighbours rule always survives; each
// slot keeps its own crop.

export const PANEL_COUNT = 9;

// The row-major photo pattern for nine slots over `photoCount` photos.
export function basePattern(photoCount) {
  const count = Math.max(1, photoCount);
  return [0, 1, 2, 3, 4, 5, 1, 2, 3].map((index) => index % count);
}

// Per-slot default crops: [zoom, offsetX, offsetY].
const DEFAULT_CROPS = [
  [1.05, 0.05, -0.04],
  [1.10, -0.08, 0.03],
  [1.02, 0.04, 0.06],
  [1.08, -0.05, -0.06],
  [1.12, 0.07, 0.02],
  [1.04, -0.03, -0.05],
  [1.38, 0.30, -0.20],
  [1.34, -0.28, 0.22],
  [1.42, -0.35, 0.25],
];

export function defaultSlots(photoCount) {
  const pattern = basePattern(photoCount);
  return pattern.map((photoIndex, slot) => ({
    photoIndex,
    zoom: DEFAULT_CROPS[slot][0],
    offsetX: DEFAULT_CROPS[slot][1],
    offsetY: DEFAULT_CROPS[slot][2],
  }));
}

// Rotate the assignment pattern by `shift` positions; crops stay put.
export function shuffleSlots(slots, photoCount, shift) {
  const count = Math.max(1, photoCount);
  const step = ((shift % (count - 1 || 1)) + (count - 1 || 1)) % (count - 1 || 1) || 1;
  const pattern = basePattern(count);
  const rotated = pattern.map((_, i) => pattern[(i + step) % pattern.length]);
  return slots.map((slot, i) => ({ ...slot, photoIndex: rotated[i] % count }));
}

// Point one slot at another photo, keeping its crop.
export function assignPhoto(slots, slotIndex, photoIndex) {
  return slots.map((slot, i) => (i === slotIndex ? { ...slot, photoIndex } : slot));
}

// Zoom is clamped to 1-4, offsets to -1..1.
export function setCrop(slot, zoom, offsetX, offsetY) {
  return {
    ...slot,
    zoom: Math.min(4, Math.max(1, zoom)),
    offsetX: Math.min(1, Math.max(-1, offsetX)),
    offsetY: Math.min(1, Math.max(-1, offsetY)),
  };
}

export function resetCrop(slot) {
  return { ...slot, zoom: 1, offsetX: 0, offsetY: 0 };
}
