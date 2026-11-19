// Per-panel photo state: which photo fills each layout slot and how it is
// cropped (zoom and offset). Nine slots cover the biggest layout; smaller
// layouts simply use the first slots.

// Default assignment spreads the photos across the slots so a multi-photo
// cover looks varied even before the user touches anything.
export function defaultPanels(photoCount) {
  const n = Math.max(1, photoCount || 1);
  const pattern = [0, 1, 2, 3, 1, 0, 3, 2, 0];
  return Array.from({ length: 9 }, (_, i) => ({
    photo: pattern[i] % n,
    zoom: 1,
    ox: 0,
    oy: 0,
  }));
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
