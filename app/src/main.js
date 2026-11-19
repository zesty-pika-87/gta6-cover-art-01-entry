// Wires the Cover Coast editor: photos in, layout and grade picked, words typed,
// cover exported. Drag a panel to move its photo, scroll to zoom it, click a
// thumbnail to fill the selected panel. A `?shot=` query sets up a fixed scene
// for a screenshot instead (./shots.js).

import { renderCover } from './cover.js';
import { LAYOUTS, layoutPanels } from './layouts.js';
import { GRADES } from './grades.js';
import { SIZES, exportCover, exportAll } from './export.js';
import { defaultPanels, assignPhoto, setCrop, resetCrop } from './panels.js';
import { applyShot, markShotReady } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const query = new URLSearchParams(location.search);
const shot = query.get('shot');

const SAMPLES = [
  ['pier', 'Pier'],
  ['boulevard', 'Boulevard'],
  ['neon', 'Neon street'],
  ['rooftop', 'Rooftop dusk'],
];

let state = {
  photos: [],
  panels: defaultPanels(4),
  selectedPanel: 0,
  layout: 'grid9',
  grade: 'vice',
  intensity: 0.85,
  title: 'Sunset Heist',
  subtitle: 'Vice City nights',
  badge: 'Neon Nights',
  heat: 4,
  sizeId: '1080x1080',
};

if (shot) state = applyShot(state, shot, query);
const coverOnly = shot && (state.coverOnly ?? false);
if (coverOnly) document.body.classList.add('shot-cover');

// ---- history (undo / redo) ----
const undoStack = [];
const redoStack = [];
const snapshot = () => JSON.stringify({
  panels: state.panels, selectedPanel: state.selectedPanel, layout: state.layout,
  grade: state.grade, intensity: state.intensity, title: state.title,
  subtitle: state.subtitle, badge: state.badge, heat: state.heat, sizeId: state.sizeId,
});
function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  syncUndoButtons();
}
function applySnapshot(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  syncControls();
  render();
}
function syncUndoButtons() {
  document.getElementById('undo').disabled = undoStack.length === 0;
  document.getElementById('redo').disabled = redoStack.length === 0;
}
document.getElementById('undo').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  applySnapshot(undoStack.pop());
  syncUndoButtons();
});
document.getElementById('redo').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  applySnapshot(redoStack.pop());
  syncUndoButtons();
});

// ---- rendering ----
function render() {
  if (coverOnly) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  } else {
    const size = SIZES.find((s) => s.id === state.sizeId) || SIZES[0];
    const long = 720;
    if (size.w >= size.h) {
      canvas.width = long;
      canvas.height = Math.round((long * size.h) / size.w);
    } else {
      canvas.height = long;
      canvas.width = Math.round((long * size.w) / size.h);
    }
  }
  renderCover(canvas, state);
  syncChips();
}

// ---- controls ----
function chipGroup(el, items, current, onPick) {
  el.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.label ?? item.name;
    b.dataset.id = item.id;
    b.classList.toggle('active', item.id === current);
    b.addEventListener('click', () => { pushHistory(); onPick(item.id); render(); });
    el.appendChild(b);
  }
}
function syncChips() {
  for (const [id, group, current] of [
    ['layouts', LAYOUTS, state.layout],
    ['grades', GRADES, state.grade],
    ['sizes', SIZES, state.sizeId],
  ]) {
    document.querySelectorAll(`#${id} button`).forEach((b) => {
      b.classList.toggle('active', b.dataset.id === current);
    });
  }
  document.querySelectorAll('#heat button').forEach((b, i) => {
    b.classList.toggle('lit', i < state.heat);
  });
  document.querySelectorAll('#thumbs button').forEach((b, i) => {
    b.classList.toggle('active', i === state.panels[state.selectedPanel]?.photo);
  });
}

function buildControls() {
  chipGroup(document.getElementById('layouts'), LAYOUTS, state.layout, (id) => { state.layout = id; });
  chipGroup(document.getElementById('grades'), GRADES, state.grade, (id) => { state.grade = id; });
  chipGroup(document.getElementById('sizes'), SIZES, state.sizeId, (id) => { state.sizeId = id; });
  const heat = document.getElementById('heat');
  heat.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = '★';
    b.setAttribute('aria-label', `${i + 1} star${i ? 's' : ''}`);
    b.addEventListener('click', () => { pushHistory(); state.heat = i + 1; render(); });
    heat.appendChild(b);
  }
}

function syncControls() {
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('badge').value = state.badge;
  document.getElementById('intensity').value = String(state.intensity);
  const slot = state.panels[state.selectedPanel] || { photo: 0, zoom: 1 };
  document.getElementById('zoom').value = String(slot.zoom || 1);
  syncPanelSelect();
  syncChips();
}

function syncPanelSelect() {
  const sel = document.getElementById('panel-photo');
  sel.innerHTML = '';
  state.photos.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = p.name;
    sel.appendChild(o);
  });
  sel.value = String(state.panels[state.selectedPanel]?.photo ?? 0);
}

function syncThumbs() {
  const box = document.getElementById('thumbs');
  box.innerHTML = '';
  state.photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = p.name;
    const img = document.createElement('img');
    img.src = p.img.src;
    img.alt = p.name;
    b.appendChild(img);
    b.addEventListener('click', () => {
      pushHistory();
      state.panels = assignPhoto(state.panels, state.selectedPanel, i);
      render();
      syncPanelSelect();
    });
    box.appendChild(b);
  });
  syncChips();
}

// Text inputs: live render on input, one history entry on change.
for (const [id, key] of [['title', 'title'], ['subtitle', 'subtitle'], ['badge', 'badge']]) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => { state[key] = el.value; render(); });
  el.addEventListener('change', pushHistory);
}
document.getElementById('intensity').addEventListener('input', (e) => {
  state.intensity = Number(e.target.value);
  render();
});
document.getElementById('intensity').addEventListener('change', pushHistory);
document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels = setCrop(state.panels, state.selectedPanel, { zoom: Number(e.target.value) });
  render();
});
document.getElementById('zoom').addEventListener('change', pushHistory);
document.getElementById('panel-photo').addEventListener('change', (e) => {
  pushHistory();
  state.panels = assignPhoto(state.panels, state.selectedPanel, Number(e.target.value));
  render();
});
document.getElementById('reset-crop').addEventListener('click', () => {
  pushHistory();
  state.panels = resetCrop(state.panels, state.selectedPanel);
  render();
  syncControls();
});

// ---- photos ----
/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhoto(img, name) {
  state.photos.push({ img, name });
}

document.getElementById('photo').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  pushHistory();
  for (const file of files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      await addPhoto(img, file.name.replace(/\.[^.]+$/, ''));
    } catch { /* skip unreadable files */ }
  }
  state.panels = state.panels.map((p) => ({
    ...p, photo: Math.min(p.photo, state.photos.length - 1),
  }));
  syncThumbs();
  syncPanelSelect();
  render();
  status.textContent = `${state.photos.length} photos loaded`;
  e.target.value = '';
});

// ---- canvas interaction: pick a panel, drag to pan, scroll to zoom ----
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * canvas.width) / rect.width,
    y: ((e.clientY - rect.top) * canvas.height) / rect.height,
  };
}
function hitPanel(cx, cy) {
  const L = layoutPanels(state.layout, canvas.width, canvas.height);
  for (let i = L.panels.length - 1; i >= 0; i--) {
    const p = L.panels[i];
    if (p.w <= 0) continue;
    if (cx >= p.x && cx <= p.x + p.w && cy >= p.y && cy <= p.y + p.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const { x, y } = canvasPoint(e);
  const hit = hitPanel(x, y);
  if (hit < 0) return;
  pushHistory();
  state.selectedPanel = hit;
  syncControls();
  drag = { x, y, ox: state.panels[hit].ox || 0, oy: state.panels[hit].oy || 0, panel: hit };
  canvas.setPointerCapture(e.pointerId);
  render();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { x, y } = canvasPoint(e);
  const L = layoutPanels(state.layout, canvas.width, canvas.height);
  const p = L.panels[drag.panel];
  if (!p) return;
  state.panels = setCrop(state.panels, drag.panel, {
    ox: drag.ox + (x - drag.x) / p.w,
    oy: drag.oy + (y - drag.y) / p.h,
  });
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });
let wheelPushed = false;
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const { x, y } = canvasPoint(e);
  const hit = hitPanel(x, y);
  if (hit < 0) return;
  if (!wheelPushed) {
    pushHistory();
    wheelPushed = true;
    setTimeout(() => { wheelPushed = false; }, 600);
  }
  const slot = state.panels[hit];
  state.panels = setCrop(state.panels, hit, {
    zoom: (slot.zoom || 1) * Math.exp(-e.deltaY * 0.0012),
  });
  state.selectedPanel = hit;
  render();
  syncControls();
}, { passive: false });

// ---- export ----
document.getElementById('export').addEventListener('click', async () => {
  const size = SIZES.find((s) => s.id === state.sizeId) || SIZES[0];
  status.textContent = 'Rendering…';
  const name = await exportCover(state, size);
  status.textContent = `Saved ${name}`;
});
document.getElementById('export-all').addEventListener('click', async () => {
  status.textContent = 'Rendering 4 sizes…';
  const names = await exportAll(state);
  status.textContent = `Saved ${names.join(', ')}`;
});

window.addEventListener('resize', () => { if (coverOnly) render(); });

// ---- boot ----
window.__coverApp = { get state() { return state; }, render };

async function boot() {
  buildControls();
  syncUndoButtons();
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
      document.fonts.load('100px "Bebas Neue"'),
      document.fonts.ready,
    ]);
  } catch { /* fall back to system fonts */ }
  for (const [file, name] of SAMPLES) {
    try {
      const img = await loadImage(`samples/${file}.jpg`);
      await addPhoto(img, name);
    } catch { /* a missing sample just leaves fewer photos */ }
  }
  state.panels = defaultPanels(state.photos.length);
  syncThumbs();
  syncControls();
  render();
  if (shot) markShotReady();
}

boot();
