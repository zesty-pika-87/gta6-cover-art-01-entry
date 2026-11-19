// Cover Coast — the nine panel slots.
//
// The cover always has nine slots, filled from the photos in row-major
// order. With the six sample photos the default order is
// 0, 1, 2, 3, 4, 5, 1, 2, 3, so every row and every column holds three
// different photos and no two neighbours — across or down — are the same.
// Photos that appear twice do so as a different framing: the first six
// slots get a gentle zoom (1.00 to 1.12) and a small offset, while the
// three repeat slots get a tight zoom (1.32 to 1.42) with a hard offset
// to the opposite side, so the repeat reads as a close-up of another
// part of the photo.
//
// Shuffle rotates the assignment pattern instead of re-rolling it, so
// the no-identical-neighbour rule survives every shuffle. A slot's crop
// stays with the slot, not the photo.

export const SLOT_COUNT = 9;

// The default order over six photos, row-major: rows [0,1,2], [3,4,5],
// [1,2,3]; columns [0,3,1], [1,4,2], [2,5,3] — all different.
export const DEFAULT_ORDER = [0, 1, 2, 3, 4, 5, 1, 2, 3];

const REPEAT_ZOOM = [1.32, 1.37, 1.42];
const REPEAT_OFFSET = [
  [-0.45, 0.3],
  [0.45, -0.3],
  [-0.4, -0.35],
];

// The crop a slot starts with: gentle for slots 0–5, a tight close-up
// with a hard offset for the repeat slots 6–8.
export function defaultSlotCrop(slotIndex) {
  if (slotIndex >= 6) {
    const repeat = slotIndex - 6;
    return { zoom: REPEAT_ZOOM[repeat], ox: REPEAT_OFFSET[repeat][0], oy: REPEAT_OFFSET[repeat][1] };
  }
  const zoom = 1 + (slotIndex % 3) * 0.06;
  const ox = (((slotIndex * 37) % 5) - 2) * 0.05;
  const oy = (((slotIndex * 53) % 5) - 2) * 0.05;
  return { zoom, ox, oy };
}

// An assignment with no identical neighbours, for any photo count.
// Six photos use the exact default order; other counts are built by a
// greedy rotation that skips whatever sits left or above.
export function buildAssignment(photoCount) {
  if (photoCount <= 0) return new Array(SLOT_COUNT).fill(0);
  if (photoCount === 6) return [...DEFAULT_ORDER];
  const order = [];
  let pointer = 0;
  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    const left = slot % 3 === 0 ? -1 : order[slot - 1];
    const above = slot < 3 ? -1 : order[slot - 3];
    let candidate = pointer % photoCount;
    let tries = 0;
    while (photoCount >= 3 && (candidate === left || candidate === above) && tries < photoCount) {
      pointer++;
      candidate = pointer % photoCount;
      tries++;
    }
    order.push(candidate);
    pointer++;
  }
  return order;
}

export function createSlots(photoCount) {
  const order = buildAssignment(photoCount);
  return order.map((photo, index) => ({
    photo,
    ...defaultSlotCrop(index),
  }));
}

export function assignPhoto(slots, slotIndex, photoIndex) {
  if (!slots[slotIndex]) return;
  slots[slotIndex].photo = photoIndex;
}

export function setCrop(slot, zoom, ox, oy) {
  if (!slot) return;
  slot.zoom = Math.max(1, Math.min(4, zoom));
  slot.ox = Math.max(-1, Math.min(1, ox));
  slot.oy = Math.max(-1, Math.min(1, oy));
}

export function resetCrop(slot) {
  if (!slot) return;
  slot.zoom = 1;
  slot.ox = 0;
  slot.oy = 0;
}

let shuffleStep = 0;

// Rotate the assignment pattern by 1 to (photoCount - 1) places. A
// rotation keeps every neighbour pair distinct, so the cover never ends
// up with the same photo twice side by side. Crops stay on their slots.
export function shuffleSlots(slots, photoCount) {
  if (!slots.length || photoCount <= 1) return slots;
  const step = 1 + (shuffleStep % Math.max(1, photoCount - 1));
  shuffleStep++;
  const photos = slots.map((slot) => slot.photo);
  slots.forEach((slot, index) => {
    slot.photo = photos[(index + step) % slots.length];
  });
  return slots;
}
