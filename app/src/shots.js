// Fixed scenes for screenshots: ?shot=<name> sets up the editor or a lone
// cover so a screenshot always shows the same thing. `window.__shotReady` is
// set once the cover is painted (fonts loaded, grade applied), which is what
// the screenshot run waits for.
//
//   ?shot=cover           the 9-panel cover alone, landscape 1920 x 1080
//   ?shot=cover-portrait  the 9-panel cover alone, portrait, Golden Hour grade
//   ?shot=cover-square    the mosaic-nine cover alone, square, Neon grade
//   ?shot=editor          the editor with photos loaded
//
// `caption` overrides the title. `photo` picks the first sample shown.
// `order` (a scene field) reorders the six samples after they load, so a
// scene can lead with the boardwalk daylight or the rainy night shot.

export const SHOT_SCENES = {
  cover: {
    layout: 'grid9', grade: 'vice', title: 'Sunset Heist',
    subtitle: 'Vice City nights', badge: 'Neon Nights', heat: 5, coverOnly: true,
    order: ['pier', 'boardwalk', 'neon', 'rooftop', 'rain', 'boulevard'],
  },
  'cover-portrait': {
    layout: 'grid9', grade: 'gold', title: 'Boulevard Queen',
    subtitle: 'Palm trees & pink skies', badge: 'Est. 2026', heat: 4, coverOnly: true,
    order: ['boardwalk', 'pier', 'boulevard', 'rooftop', 'neon', 'rain'],
  },
  'cover-square': {
    layout: 'mosaic9', grade: 'neon', title: 'Neon Nights',
    subtitle: 'Drive fast, shine brighter', badge: 'Vice Sunset', heat: 5, coverOnly: true,
    order: ['rain', 'neon', 'rooftop', 'pier', 'boardwalk', 'boulevard'],
  },
  editor: {
    layout: 'grid9', grade: 'vice', title: 'Sunset Heist',
    subtitle: 'Vice City nights', badge: 'Neon Nights', heat: 4, coverOnly: false,
    order: ['pier', 'boulevard', 'neon', 'rooftop', 'boardwalk', 'rain'],
  },
};

/** Applies a shot scene to the editor state and returns the patched state. */
export function applyShot(state, shot, query) {
  const scene = SHOT_SCENES[shot] ?? SHOT_SCENES.cover;
  const next = { ...state, ...scene };
  if (query.get('caption')) next.title = query.get('caption');
  if (query.get('layout')) next.layout = query.get('layout');
  if (query.get('grade')) next.grade = query.get('grade');
  if (query.get('photo')) {
    // Move the named sample to the front of the scene's order.
    const order = [...(scene.order ?? [])];
    const at = order.indexOf(query.get('photo'));
    if (at > 0) { order.splice(at, 1); order.unshift(query.get('photo')); }
    next.sampleOrder = order;
  } else if (scene.order) {
    next.sampleOrder = scene.order;
  }
  return next;
}

/**
 * Reorders loaded photos to the scene's sample order. Called from boot once
 * the samples are in; unknown names keep their loaded position at the end.
 */
export function orderPhotos(photos, order) {
  if (!order || !order.length) return photos;
  const byName = new Map(photos.map((p) => [p.key, p]));
  const ordered = [];
  for (const key of order) {
    const p = byName.get(key);
    if (p) { ordered.push(p); byName.delete(key); }
  }
  return [...ordered, ...byName.values()];
}

/** Marks the scene painted. Called after fonts load and one render pass. */
export function markShotReady() {
  if (window.__shotReady) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    setTimeout(() => { window.__shotReady = true; }, 300);
  }));
}
