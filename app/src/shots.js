// Fixed scenes for screenshots: ?shot=<name> sets up the editor or a lone
// cover so a screenshot always shows the same thing. `window.__shotReady` is
// set once the cover is painted (fonts loaded, grade applied), which is what
// the screenshot run waits for.
//
//   ?shot=cover           the 9-panel cover alone, landscape
//   ?shot=cover-portrait  the 9-panel cover alone, portrait
//   ?shot=cover-square    the hero-and-three cover alone, square
//   ?shot=editor          the editor with photos loaded
//
// `caption` overrides the title. `photo` picks the first sample shown.

export const SHOT_SCENES = {
  cover: {
    layout: 'grid9', grade: 'vice', title: 'Sunset Heist',
    subtitle: 'Vice City nights', badge: 'Neon Nights', heat: 5, coverOnly: true,
  },
  'cover-portrait': {
    layout: 'grid9', grade: 'magenta', title: 'Boulevard Queen',
    subtitle: 'Palm trees & pink skies', badge: 'Est. 2026', heat: 4, coverOnly: true,
  },
  'cover-square': {
    layout: 'hero3', grade: 'neon', title: 'Neon Nights',
    subtitle: 'Drive fast, shine brighter', badge: 'Vice Sunset', heat: 5, coverOnly: true,
  },
  editor: {
    layout: 'grid9', grade: 'vice', title: 'Sunset Heist',
    subtitle: 'Vice City nights', badge: 'Neon Nights', heat: 4, coverOnly: false,
  },
};

/** Applies a shot scene to the editor state and returns the patched state. */
export function applyShot(state, shot, query) {
  const scene = SHOT_SCENES[shot] ?? SHOT_SCENES.cover;
  const next = { ...state, ...scene };
  if (query.get('caption')) next.title = query.get('caption');
  if (query.get('layout')) next.layout = query.get('layout');
  if (query.get('grade')) next.grade = query.get('grade');
  return next;
}

/** Marks the scene painted. Called after fonts load and one render pass. */
export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    setTimeout(() => { window.__shotReady = true; }, 250);
  }));
}
