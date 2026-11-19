// Cover Coast — the four fixed screenshot scenes.
//
// Every screenshot the entry ships is one of these scenes, picked with
// ?shot=<name> in the URL. A scene fixes the layout, grade, words, heat
// and photo order, so the same scene always renders the same cover.
// Query overrides let a scene be re-captioned without touching the code:
//   caption — replaces the title
//   layout  — replaces the layout (only a known layout id)
//   grade   — replaces the grade (only a known grade id)
//   photo   — moves the named sample to the front of the photo order
//
// The scenes:
//   cover          — the hero: Nine Panel, Vice Sunset, "Sunset Heist"
//   cover-portrait — Nine Panel, Golden Hour, "Boulevard Queen"
//   cover-square   — Mosaic Nine, Neon Nights, "Neon Nights"
//   editor         — the editor itself, photo loaded, cover live

import { layoutById } from './layouts.js';
import { gradeById } from './grades.js';

export const SHOT_SCENES = {
  cover: {
    layout: 'grid9',
    grade: 'vice',
    title: 'Sunset Heist',
    subtitle: 'Vice City nights',
    badge: 'Neon Nights',
    heat: 5,
    coverOnly: true,
    order: ['pier', 'boardwalk', 'neon', 'rooftop', 'rain', 'boulevard'],
  },
  'cover-portrait': {
    layout: 'grid9',
    grade: 'gold',
    title: 'Boulevard Queen',
    subtitle: 'Palm trees & pink skies',
    badge: 'Est. 2026',
    heat: 4,
    coverOnly: true,
    order: ['boardwalk', 'pier', 'boulevard', 'rooftop', 'neon', 'rain'],
  },
  'cover-square': {
    layout: 'mosaic',
    grade: 'neon',
    title: 'Neon Nights',
    subtitle: 'Drive fast, shine brighter',
    badge: 'Vice Sunset',
    heat: 5,
    coverOnly: true,
    order: ['rain', 'neon', 'rooftop', 'pier', 'boardwalk', 'boulevard'],
  },
  editor: {
    layout: 'grid9',
    grade: 'vice',
    title: 'Sunset Heist',
    subtitle: 'Vice City nights',
    badge: 'Neon Nights',
    heat: 5,
    coverOnly: false,
    order: ['pier', 'boulevard', 'neon', 'rooftop', 'boardwalk', 'rain'],
  },
};

export function shotScene(name) {
  return SHOT_SCENES[name] || null;
}

// Reorder the state's photos to the scene's order; photos the scene
// does not name keep their relative order at the back.
function orderPhotosForScene(state, order) {
  const rank = new Map(order.map((name, index) => [name, index]));
  state.photos.sort((a, b) => {
    const aRank = rank.has(a.name) ? rank.get(a.name) : order.length;
    const bRank = rank.has(b.name) ? rank.get(b.name) : order.length;
    return aRank - bRank;
  });
}

// Apply a scene from URL parameters to the live state. Returns whether
// the scene shows the cover alone (no editor chrome).
export function applyShotToState(state, params) {
  const name = params.get('shot') || '';
  const scene = shotScene(name);
  if (!scene) return false;

  state.layout = scene.layout;
  state.grade = scene.grade;
  state.title = scene.title;
  state.subtitle = scene.subtitle;
  state.badge = scene.badge;
  state.heat = scene.heat;

  const caption = params.get('caption');
  if (caption) state.title = caption.slice(0, 40);
  const layout = params.get('layout');
  if (layout && layoutById(layout)) state.layout = layout;
  const grade = params.get('grade');
  if (grade && gradeById(grade)) state.grade = grade;

  let order = [...scene.order];
  const photo = params.get('photo');
  if (photo && order.includes(photo)) {
    order = [photo, ...order.filter((entry) => entry !== photo)];
  }
  orderPhotosForScene(state, order);
  return scene.coverOnly;
}

// Tell whoever is screenshotting that the scene has been drawn: two
// animation frames, then 300 ms, then the flag goes up.
export function markShotReady() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.__shotReady = true;
      }, 300);
    });
  });
}
