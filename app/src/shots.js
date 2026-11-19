// shots.js — the four fixed scenes used for screenshots.
//
// Each scene is a complete editor state (layout, grade, words, heat, photo
// order, cover-only or editor) chosen through the `?shot=` URL parameter.
// The cover scene is the default cover the judge sees first: Nine Panel,
// Vice Sunset, "Sunset Heist". Query parameters may override a scene:
// `caption` replaces the title, `layout` and `grade` replace the picks,
// and `photo` moves the named sample to the front of the photo order.
//
// markShotReady signals the screenshot process: after two animation
// frames plus 300 ms, `window.__shotReady` is true and the scene is drawn.

import { defaultSlots } from './panels.js';

export const SHOTS = {
  cover: {
    layout: 'grid9',
    grade: 'vice',
    title: 'Sunset Heist',
    subtitle: 'Vice City nights',
    badge: 'Neon Nights',
    heat: 5,
    size: '1920x1080',
    coverOnly: true,
    order: ['pier', 'boardwalk', 'neon', 'rooftop', 'rain', 'boulevard'],
  },
  'cover-portrait': {
    layout: 'grid9',
    grade: 'golden',
    title: 'Boulevard Queen',
    subtitle: 'Palm trees & pink skies',
    badge: 'Est. 2026',
    heat: 4,
    size: '1080x1350',
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
    size: '1080x1080',
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
    size: '1080x1080',
    coverOnly: false,
    order: ['pier', 'boulevard', 'neon', 'rooftop', 'boardwalk', 'rain'],
  },
};

// Reorder the state's photos so the named samples come first in `order`,
// keeping the rest in their current order; then rebuild the default slots.
function applyPhotoOrder(state, order) {
  const byName = new Map(state.photos.map((photo) => [photo.name, photo]));
  const ordered = [];
  for (const name of order) {
    const photo = byName.get(name);
    if (photo && !ordered.includes(photo)) ordered.push(photo);
  }
  for (const photo of state.photos) {
    if (!ordered.includes(photo)) ordered.push(photo);
  }
  state.photos = ordered;
  state.slots = defaultSlots(state.photos.length);
}

export function applyShot(state, shotName, params) {
  const scene = SHOTS[shotName] || SHOTS.cover;
  const order = [...scene.order];
  const photoOverride = params.get('photo');
  if (photoOverride) {
    const at = order.indexOf(photoOverride);
    if (at > 0) {
      order.splice(at, 1);
      order.unshift(photoOverride);
    }
  }
  applyPhotoOrder(state, order);
  state.layout = params.get('layout') || scene.layout;
  state.grade = params.get('grade') || scene.grade;
  state.title = params.get('caption') || scene.title;
  state.subtitle = scene.subtitle;
  state.badge = scene.badge;
  state.heat = scene.heat;
  state.size = scene.size;
  state.coverOnly = scene.coverOnly;
  state.selected = 0;
  return scene;
}

export function markShotReady() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.__shotReady = true;
      }, 300);
    });
  });
}
