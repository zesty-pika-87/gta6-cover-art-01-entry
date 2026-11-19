// main.js — the Cover Coast editor.
//
// Wires the controls to the cover state: photos (uploads plus the six
// bundled samples), the nine panel slots, layout / grade / size chips,
// words, heat stars, undo/redo history and PNG export. The preview canvas
// follows the chosen export size's aspect ratio at a 720 px long side; in
// shot-cover mode it renders at viewport size instead.
//
// History is a pair of JSON snapshot stacks (at most 60 entries); text
// inputs render live while typing and record one history entry when the
// edit finishes. Canvas clicks select a panel (a picked thumbnail assigns
// its photo), drags pan the photo inside its panel, and the wheel zooms
// the pointed-at panel (one history entry per 600 ms of scrolling).
//
// State and render are exposed on window.__coverCoast for debugging.

import { LAYOUT_IDS, LAYOUT_NAMES, getLayout } from './layouts.js';
import { GRADE_IDS, GRADE_NAMES } from './grades.js';
import { renderCover } from './cover.js';
import { defaultSlots, shuffleSlots, assignPhoto, setCrop, resetCrop } from './panels.js';
import { applyShot, markShotReady } from './shots.js';
import { EXPORT_SIZES, EXPORT_SIZE_KEYS, exportPng, exportAllSizes } from './export.js';

const HISTORY_LIMIT = 60;
const WHEEL_HISTORY_MS = 600;

const SAMPLE_PHOTOS = [
  ['pier', 'samples/pier.jpg'],
  ['boulevard', 'samples/boulevard.jpg'],
  ['neon', 'samples/neon.jpg'],
  ['rooftop', 'samples/rooftop.jpg'],
  ['boardwalk', 'samples/boardwalk.jpg'],
  ['rain', 'samples/rain.jpg'],
];

const state = {
  photos: [],
  slots: defaultSlots(0),
  pickedPhoto: null,
  selected: 0,
  layout: 'grid9',
  grade: 'vice',
  intensity: 0.85,
  title: 'Sunset Heist',
  subtitle: 'Vice City nights',
  badge: 'Neon Nights',
  heat: 5,
  size: '1080x1080',
  coverOnly: false,
};

let undoStack = [];
let redoStack = [];
let shuffleShift = 0;
let lastWheelHistoryAt = 0;
let pendingSnapshot = null;
let dragSlot = null;
let dragLast = null;

const $ = (id) => document.getElementById(id);
const canvas = $('coverCanvas');

// --- history ---------------------------------------------------------------

function snapshotState() {
  return JSON.stringify({
    slots: state.slots,
    selected: state.selected,
    layout: state.layout,
    grade: state.grade,
    intensity: state.intensity,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
    heat: state.heat,
    size: state.size,
  });
}

function restoreSnapshot(json) {
  const saved = JSON.parse(json);
  state.slots = saved.slots;
  state.selected = saved.selected;
  state.layout = saved.layout;
  state.grade = saved.grade;
  state.intensity = saved.intensity;
  state.title = saved.title;
  state.subtitle = saved.subtitle;
  state.badge = saved.badge;
  state.heat = saved.heat;
  state.size = saved.size;
  syncControls();
  render();
}

function pushHistory(snapshot) {
  undoStack.push(snapshot || snapshotState());
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshotState());
  restoreSnapshot(undoStack.pop());
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshotState());
  restoreSnapshot(redoStack.pop());
}

// --- render ----------------------------------------------------------------

function previewSize() {
  if (state.coverOnly) return { width: window.innerWidth, height: window.innerHeight };
  const size = EXPORT_SIZES[state.size];
  const longSide = 720;
  if (size.width >= size.height) {
    return { width: longSide, height: Math.round((longSide * size.height) / size.width) };
  }
  return { width: Math.round((longSide * size.width) / size.height), height: longSide };
}

function render() {
  const size = previewSize();
  renderCover(canvas, state, size);
  $('undoBtn').disabled = undoStack.length === 0;
  $('redoBtn').disabled = redoStack.length === 0;
  updateThumbnails();
  updatePanelControls();
}

function updateThumbnails() {
  const strip = $('thumbs');
  strip.innerHTML = '';
  state.photos.forEach((photo, index) => {
    const thumb = document.createElement('img');
    thumb.className = 'thumb' + (state.pickedPhoto === index ? ' picked' : '');
    thumb.src = photo.image.src;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    thumb.addEventListener('click', () => {
      state.pickedPhoto = state.pickedPhoto === index ? null : index;
      updateThumbnails();
    });
    strip.appendChild(thumb);
  });
}

function updatePanelControls() {
  const select = $('panelPhoto');
  const current = state.slots[state.selected];
  select.innerHTML = '';
  state.photos.forEach((photo, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = photo.name;
    select.appendChild(option);
  });
  if (current) {
    select.value = String(current.photoIndex);
    $('zoomRange').value = String(current.zoom);
    $('zoomValue').textContent = `${current.zoom.toFixed(2)}×`;
  }
  $('selectedLabel').textContent = `Panel ${state.selected + 1} of ${Math.max(1, getLayout(state.layout, canvas.width || 720, canvas.height || 720).panels.length)}`;
}

// --- chips -----------------------------------------------------------------

function buildChips(containerId, ids, names, current, onPick) {
  const container = $(containerId);
  container.innerHTML = '';
  ids.forEach((id) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (id === current ? ' active' : '');
    chip.textContent = names[id];
    chip.addEventListener('click', () => {
      pushHistory();
      onPick(id);
      buildChips(containerId, ids, names, id, onPick);
      render();
    });
    container.appendChild(chip);
  });
}

function buildSizeChips() {
  const container = $('sizeChips');
  container.innerHTML = '';
  EXPORT_SIZE_KEYS.forEach((key) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (key === state.size ? ' active' : '');
    chip.textContent = EXPORT_SIZES[key].label;
    chip.addEventListener('click', () => {
      pushHistory();
      state.size = key;
      buildSizeChips();
      render();
    });
    container.appendChild(chip);
  });
}

function buildHeatStars() {
  const container = $('heatStars');
  container.innerHTML = '';
  for (let star = 1; star <= 5; star++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'star' + (star <= state.heat ? ' lit' : '');
    button.textContent = '★';
    button.setAttribute('aria-label', `${star} star${star > 1 ? 's' : ''}`);
    button.addEventListener('click', () => {
      pushHistory();
      state.heat = star;
      buildHeatStars();
      render();
    });
    container.appendChild(button);
  }
}

function syncControls() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('badgeInput').value = state.badge;
  $('intensityRange').value = String(state.intensity);
  $('intensityValue').textContent = `${Math.round(state.intensity * 100)}%`;
  buildChips('layoutChips', LAYOUT_IDS, LAYOUT_NAMES, state.layout, (id) => { state.layout = id; });
  buildChips('gradeChips', GRADE_IDS, GRADE_NAMES, state.grade, (id) => { state.grade = id; });
  buildSizeChips();
  buildHeatStars();
}

// --- photos ----------------------------------------------------------------

function loadImage(name, src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ name, image });
    image.onerror = () => reject(new Error(`could not load ${src}`));
    image.src = src;
  });
}

async function loadSamples() {
  const loaded = await Promise.allSettled(SAMPLE_PHOTOS.map(([name, src]) => loadImage(name, src)));
  state.photos = loaded.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  state.slots = defaultSlots(state.photos.length);
}

function addUploads(files) {
  const jobs = [...files].map((file) => {
    const url = URL.createObjectURL(file);
    return loadImage(file.name.replace(/\.[^.]+$/, '') || 'photo', url).catch(() => {
      URL.revokeObjectURL(url);
      return null;
    });
  });
  Promise.all(jobs).then((results) => {
    const added = results.filter(Boolean);
    if (!added.length) return;
    pushHistory();
    state.photos.push(...added);
    render();
    $('statusLine').textContent = `Added ${added.length} photo${added.length > 1 ? 's' : ''}.`;
  });
}

// --- canvas interaction ----------------------------------------------------

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function hitPanel(point) {
  const layout = getLayout(state.layout, canvas.width, canvas.height);
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const panel = layout.panels[i];
    const cx = panel.x + panel.w / 2;
    const cy = panel.y + panel.h / 2;
    const dx = point.x - cx;
    const dy = point.y - cy;
    const cos = Math.cos(-panel.rotation);
    const sin = Math.sin(-panel.rotation);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    if (Math.abs(localX) <= panel.w / 2 && Math.abs(localY) <= panel.h / 2) return i;
  }
  return -1;
}

function bindCanvas() {
  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const index = hitPanel(point);
    if (index < 0) return;
    if (state.pickedPhoto !== null) {
      pushHistory();
      state.slots = assignPhoto(state.slots, index, state.pickedPhoto);
      state.pickedPhoto = null;
      state.selected = index;
      render();
      return;
    }
    state.selected = index;
    dragSlot = index;
    dragLast = point;
    pendingSnapshot = snapshotState();
    canvas.setPointerCapture(event.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (dragSlot === null || !dragLast) return;
    const point = canvasPoint(event);
    const layout = getLayout(state.layout, canvas.width, canvas.height);
    const panel = layout.panels[dragSlot];
    if (!panel) return;
    const slot = state.slots[dragSlot];
    const next = setCrop(
      slot,
      slot.zoom,
      slot.offsetX + ((point.x - dragLast.x) / panel.w) * 2,
      slot.offsetY + ((point.y - dragLast.y) / panel.h) * 2,
    );
    state.slots = state.slots.map((item, i) => (i === dragSlot ? next : item));
    dragLast = point;
    render();
  });
  canvas.addEventListener('pointerup', () => {
    if (dragSlot !== null && pendingSnapshot) {
      undoStack.push(pendingSnapshot);
      if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
      redoStack = [];
      pendingSnapshot = null;
    }
    dragSlot = null;
    dragLast = null;
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const point = canvasPoint(event);
    const index = hitPanel(point);
    if (index < 0) return;
    const now = Date.now();
    if (now - lastWheelHistoryAt > WHEEL_HISTORY_MS) {
      pushHistory();
      lastWheelHistoryAt = now;
    }
    const slot = state.slots[index];
    const next = setCrop(slot, slot.zoom * Math.exp(-event.deltaY * 0.0012), slot.offsetX, slot.offsetY);
    state.slots = state.slots.map((item, i) => (i === index ? next : item));
    state.selected = index;
    render();
  }, { passive: false });
}

// --- controls ---------------------------------------------------------------

function bindControls() {
  $('photoInput').addEventListener('change', (event) => {
    addUploads(event.target.files || []);
    event.target.value = '';
  });
  $('shuffleBtn').addEventListener('click', () => {
    pushHistory();
    shuffleShift += 1;
    state.slots = shuffleSlots(state.slots, state.photos.length, shuffleShift);
    render();
  });
  $('panelPhoto').addEventListener('change', (event) => {
    pushHistory();
    state.slots = assignPhoto(state.slots, state.selected, Number(event.target.value));
    render();
  });
  $('zoomRange').addEventListener('input', (event) => {
    const slot = state.slots[state.selected];
    if (!slot) return;
    state.slots = state.slots.map((item, i) => (i === state.selected ? setCrop(item, Number(event.target.value), item.offsetX, item.offsetY) : item));
    render();
  });
  $('zoomRange').addEventListener('change', () => {
    if (pendingSnapshot) {
      undoStack.push(pendingSnapshot);
      pendingSnapshot = null;
    }
  });
  $('zoomRange').addEventListener('pointerdown', () => { pendingSnapshot = snapshotState(); });
  $('resetCropBtn').addEventListener('click', () => {
    pushHistory();
    state.slots = state.slots.map((item, i) => (i === state.selected ? resetCrop(item) : item));
    render();
  });
  const bindText = (id, key) => {
    const input = $(id);
    input.addEventListener('focus', () => { pendingSnapshot = snapshotState(); });
    input.addEventListener('input', () => {
      state[key] = input.value;
      render();
    });
    input.addEventListener('change', () => {
      if (pendingSnapshot) {
        undoStack.push(pendingSnapshot);
        if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
        redoStack = [];
        pendingSnapshot = null;
      }
    });
  };
  bindText('titleInput', 'title');
  bindText('subtitleInput', 'subtitle');
  bindText('badgeInput', 'badge');
  $('intensityRange').addEventListener('input', (event) => {
    state.intensity = Number(event.target.value);
    $('intensityValue').textContent = `${Math.round(state.intensity * 100)}%`;
    render();
  });
  $('intensityRange').addEventListener('pointerdown', () => { pendingSnapshot = snapshotState(); });
  $('intensityRange').addEventListener('change', () => {
    if (pendingSnapshot) {
      undoStack.push(pendingSnapshot);
      pendingSnapshot = null;
    }
  });
  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  $('exportBtn').addEventListener('click', async () => {
    $('statusLine').textContent = 'Rendering PNG…';
    const name = await exportPng(state, state.size);
    $('statusLine').textContent = `Saved ${name}.`;
  });
  $('exportAllBtn').addEventListener('click', async () => {
    await exportAllSizes(state, (done, total, name) => {
      $('statusLine').textContent = `Rendering ${done} of ${total}… ${name}`;
    });
    $('statusLine').textContent = 'Saved all 4 sizes.';
  });
  window.addEventListener('resize', () => {
    if (state.coverOnly) render();
  });
}

// --- boot -------------------------------------------------------------------

async function boot() {
  bindControls();
  bindCanvas();
  syncControls();
  await loadSamples();
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    applyShot(state, shot, params);
    if (state.coverOnly) document.body.classList.add('shot-cover');
    syncControls();
  }
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.load('40px "Bebas Neue"'),
    ]);
  } catch {
    // Fonts fall back to system sans if a file fails; the cover still draws.
  }
  render();
  if (shot) markShotReady();
}

window.__coverCoast = { state, render, undo, redo, getLayout };
boot();
