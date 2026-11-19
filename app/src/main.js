// Cover Coast — the editor.
//
// Wires the controls to the cover renderer: the photo list, the nine
// panel slots, the undo/redo history, the canvas interactions (click a
// panel to select it, drag to move its photo, scroll to zoom it) and the
// exports. With ?shot= in the URL it runs a fixed scene instead, for
// screenshots, and raises window.__shotReady once the scene is drawn.
//
// The state is kept in one object and exposed on window.CoverCoast for
// debugging, next to render.

import { LAYOUTS, layoutPanels } from './layouts.js';
import { GRADES } from './grades.js';
import { renderCover } from './cover.js';
import { createSlots, assignPhoto, setCrop, resetCrop, shuffleSlots } from './panels.js';
import { EXPORT_SIZES, exportSizeById, exportSize, exportAllSizes } from './export.js';
import { applyShotToState, markShotReady } from './shots.js';

const SAMPLE_NAMES = ['pier', 'boulevard', 'neon', 'rooftop', 'boardwalk', 'rain'];
const SAMPLE_LABELS = {
  pier: 'Pier',
  boulevard: 'Boulevard',
  neon: 'Neon street',
  rooftop: 'Rooftop dusk',
  boardwalk: 'Boardwalk day',
  rain: 'Rainy night',
};
const HISTORY_LIMIT = 60;
const WHEEL_HISTORY_MS = 600;
const PREVIEW_LONG_SIDE = 720;

const state = {
  photos: [],
  slots: createSlots(0),
  selectedSlot: 0,
  layout: 'grid9',
  grade: 'vice',
  intensity: 0.85,
  title: 'Sunset Heist',
  subtitle: 'Vice City nights',
  badge: 'Neon Nights',
  heat: 5,
  sizeId: 'square',
};

const stage = document.getElementById('stage');
const stageCtx = stage.getContext('2d');
const statusLine = document.getElementById('statusLine');
const params = new URLSearchParams(window.location.search);
const shotMode = params.has('shot');

let undoStack = [];
let redoStack = [];
let pendingPhoto = -1;
let lastWheelPush = 0;

function setStatus(text) {
  if (statusLine) statusLine.textContent = text;
}

// --- history ---------------------------------------------------------------

function snapshotState() {
  return JSON.parse(
    JSON.stringify({
      layout: state.layout,
      grade: state.grade,
      intensity: state.intensity,
      title: state.title,
      subtitle: state.subtitle,
      badge: state.badge,
      heat: state.heat,
      sizeId: state.sizeId,
      selectedSlot: state.selectedSlot,
      slots: state.slots,
    }),
  );
}

function restoreSnapshot(snap) {
  state.layout = snap.layout;
  state.grade = snap.grade;
  state.intensity = snap.intensity;
  state.title = snap.title;
  state.subtitle = snap.subtitle;
  state.badge = snap.badge;
  state.heat = snap.heat;
  state.sizeId = snap.sizeId;
  state.selectedSlot = snap.selectedSlot;
  state.slots = JSON.parse(JSON.stringify(snap.slots));
}

function pushHistory() {
  undoStack.push(snapshotState());
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
  syncControls();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshotState());
  restoreSnapshot(undoStack.pop());
  syncControls();
  render();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshotState());
  restoreSnapshot(redoStack.pop());
  syncControls();
  render();
}

// --- render ----------------------------------------------------------------

function previewSize() {
  const size = exportSizeById(state.sizeId);
  const scale = PREVIEW_LONG_SIDE / Math.max(size.width, size.height);
  return { width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
}

export function render() {
  let width;
  let height;
  if (shotMode && document.body.classList.contains('shot-cover')) {
    // A cover-only scene fills the screen: render at the viewport size
    // so the screenshot is sharp at whatever size it is taken.
    width = window.innerWidth;
    height = window.innerHeight;
  } else {
    ({ width, height } = previewSize());
  }
  if (stage.width !== width) stage.width = width;
  if (stage.height !== height) stage.height = height;
  renderCover(stageCtx, state, width, height);
}

// --- controls --------------------------------------------------------------

function buildChips(container, items, currentId, onPick) {
  container.innerHTML = '';
  items.forEach((item) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (item.id === currentId ? ' active' : '');
    chip.textContent = item.name || item.label;
    chip.title = item.blurb || item.label || '';
    chip.addEventListener('click', () => onPick(item.id));
    container.appendChild(chip);
  });
}

function syncChips() {
  buildChips(document.getElementById('layoutChips'), LAYOUTS, state.layout, (id) => {
    pushHistory();
    state.layout = id;
    syncControls();
    render();
  });
  buildChips(document.getElementById('gradeChips'), GRADES, state.grade, (id) => {
    pushHistory();
    state.grade = id;
    syncControls();
    render();
  });
  buildChips(document.getElementById('sizeChips'), EXPORT_SIZES, state.sizeId, (id) => {
    pushHistory();
    state.sizeId = id;
    syncControls();
    render();
  });
}

function syncHeatStars() {
  const wrap = document.getElementById('heatStars');
  wrap.innerHTML = '';
  for (let star = 1; star <= 5; star++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'star' + (star <= state.heat ? ' lit' : '');
    button.textContent = '★';
    button.setAttribute('aria-label', `${star} star${star > 1 ? 's' : ''}`);
    button.addEventListener('click', () => {
      pushHistory();
      state.heat = star;
      syncControls();
      render();
    });
    wrap.appendChild(button);
  }
}

function syncThumbs() {
  const wrap = document.getElementById('thumbs');
  wrap.innerHTML = '';
  state.photos.forEach((photo, index) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb' + (index === pendingPhoto ? ' picked' : '');
    thumb.title = photo.label;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.label;
    thumb.appendChild(img);
    thumb.addEventListener('click', () => {
      pendingPhoto = pendingPhoto === index ? -1 : index;
      syncThumbs();
      setStatus(pendingPhoto >= 0 ? `Photo picked: ${photo.label} — now click a panel.` : '');
    });
    wrap.appendChild(thumb);
  });
}

function syncPanelControls() {
  const select = document.getElementById('panelPhoto');
  select.innerHTML = '';
  state.photos.forEach((photo, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = photo.label;
    select.appendChild(option);
  });
  const slot = state.slots[state.selectedSlot];
  if (slot) {
    select.value = String(slot.photo);
    document.getElementById('zoomRange').value = String(slot.zoom);
  }
}

function syncControls() {
  document.getElementById('titleInput').value = state.title;
  document.getElementById('subtitleInput').value = state.subtitle;
  document.getElementById('badgeInput').value = state.badge;
  document.getElementById('intensityRange').value = String(state.intensity);
  document.getElementById('undoBtn').disabled = undoStack.length === 0;
  document.getElementById('redoBtn').disabled = redoStack.length === 0;
  syncChips();
  syncHeatStars();
  syncThumbs();
  syncPanelControls();
}

function bindTextInput(id, key) {
  const input = document.getElementById(id);
  input.addEventListener('input', () => {
    state[key] = input.value;
    render();
  });
  input.addEventListener('change', () => {
    pushHistory();
    render();
  });
}

function bindControls() {
  bindTextInput('titleInput', 'title');
  bindTextInput('subtitleInput', 'subtitle');
  bindTextInput('badgeInput', 'badge');

  const intensity = document.getElementById('intensityRange');
  intensity.addEventListener('input', () => {
    state.intensity = Number(intensity.value);
    render();
  });
  intensity.addEventListener('change', () => pushHistory());

  const zoom = document.getElementById('zoomRange');
  zoom.addEventListener('input', () => {
    const slot = state.slots[state.selectedSlot];
    if (slot) {
      setCrop(slot, Number(zoom.value), slot.ox, slot.oy);
      render();
    }
  });
  zoom.addEventListener('change', () => pushHistory());

  document.getElementById('panelPhoto').addEventListener('change', (event) => {
    pushHistory();
    assignPhoto(state.slots, state.selectedSlot, Number(event.target.value));
    render();
  });

  document.getElementById('resetCropBtn').addEventListener('click', () => {
    pushHistory();
    resetCrop(state.slots[state.selectedSlot]);
    syncControls();
    render();
  });

  document.getElementById('shuffleBtn').addEventListener('click', () => {
    pushHistory();
    shuffleSlots(state.slots, state.photos.length);
    render();
  });

  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);

  document.getElementById('exportBtn').addEventListener('click', async () => {
    const size = exportSizeById(state.sizeId);
    setStatus(`Rendering ${size.width}×${size.height}…`);
    const filename = await exportSize(state, size);
    setStatus(`Saved ${filename}`);
  });

  document.getElementById('exportAllBtn').addEventListener('click', async () => {
    setStatus('Rendering 1 of 4…');
    const saved = await exportAllSizes(state, (done, total) => {
      setStatus(done < total ? `Rendering ${done + 1} of ${total}…` : `Saved ${total} sizes`);
    });
    setStatus(`Saved ${saved.length} sizes — ${saved.join(', ')}`);
  });

  document.getElementById('photoInput').addEventListener('change', (event) => {
    const files = [...event.target.files];
    files.forEach((file) => addUserPhoto(file));
    event.target.value = '';
  });
}

function addUserPhoto(file) {
  if (!file.type.startsWith('image/')) return;
  const src = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    state.photos.push({ name: file.name, label: file.name.replace(/\.[^.]+$/, ''), src, image });
    state.slots = createSlots(state.photos.length);
    syncControls();
    render();
  };
  image.onerror = () => URL.revokeObjectURL(src);
  image.src = src;
}

// --- canvas interaction ----------------------------------------------------

function canvasPoint(event) {
  const rect = stage.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * stage.width,
    y: ((event.clientY - rect.top) / rect.height) * stage.height,
  };
}

function panelAt(point) {
  const layout = layoutPanels(state.layout, stage.width, stage.height);
  for (let index = layout.panels.length - 1; index >= 0; index--) {
    const panel = layout.panels[index];
    if (point.x >= panel.x && point.x <= panel.x + panel.w && point.y >= panel.y && point.y <= panel.y + panel.h) {
      return { index, panel };
    }
  }
  return null;
}

function bindCanvas() {
  let dragging = null;

  stage.addEventListener('pointerdown', (event) => {
    const hit = panelAt(canvasPoint(event));
    if (!hit) return;
    state.selectedSlot = Math.min(hit.index, state.slots.length - 1);
    if (pendingPhoto >= 0) {
      pushHistory();
      assignPhoto(state.slots, state.selectedSlot, pendingPhoto);
      pendingPhoto = -1;
    }
    const before = snapshotState();
    dragging = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, before };
    stage.setPointerCapture(event.pointerId);
    syncControls();
    render();
  });

  stage.addEventListener('pointermove', (event) => {
    if (!dragging || event.pointerId !== dragging.pointerId) return;
    const slot = state.slots[state.selectedSlot];
    const layout = layoutPanels(state.layout, stage.width, stage.height);
    const panel = layout.panels[Math.min(state.selectedSlot, layout.panels.length - 1)];
    if (!slot || !panel) return;
    const dx = event.clientX - dragging.startX;
    const dy = event.clientY - dragging.startY;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragging.moved = true;
    const rect = stage.getBoundingClientRect();
    const scaleX = stage.width / rect.width;
    const scaleY = stage.height / rect.height;
    setCrop(slot, slot.zoom, slot.ox + (dx * scaleX) / (panel.w * 0.5), slot.oy + (dy * scaleY) / (panel.h * 0.5));
    dragging.startX = event.clientX;
    dragging.startY = event.clientY;
    render();
  });

  stage.addEventListener('pointerup', (event) => {
    if (!dragging || event.pointerId !== dragging.pointerId) return;
    if (dragging.moved) {
      undoStack.push(dragging.before);
      if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
      redoStack = [];
    }
    dragging = null;
    syncControls();
    render();
  });

  stage.addEventListener('wheel', (event) => {
    event.preventDefault();
    const hit = panelAt(canvasPoint(event));
    if (!hit) return;
    const slot = state.slots[Math.min(hit.index, state.slots.length - 1)];
    if (!slot) return;
    const now = Date.now();
    if (now - lastWheelPush > WHEEL_HISTORY_MS) {
      pushHistory();
      lastWheelPush = now;
    }
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    setCrop(slot, slot.zoom * factor, slot.ox, slot.oy);
    state.selectedSlot = Math.min(hit.index, state.slots.length - 1);
    syncControls();
    render();
  }, { passive: false });
}

// --- photos ------------------------------------------------------------------

function loadSamplePhotos() {
  const loaded = [];
  let settled = 0;
  SAMPLE_NAMES.forEach((name) => {
    const image = new Image();
    image.onload = () => {
      loaded.push({ name, label: SAMPLE_LABELS[name], src: `samples/${name}.jpg`, image });
      finishOne();
    };
    image.onerror = () => finishOne();
    image.src = `samples/${name}.jpg`;
  });
  function finishOne() {
    settled++;
    if (settled < SAMPLE_NAMES.length) return;
    loaded.sort((a, b) => SAMPLE_NAMES.indexOf(a.name) - SAMPLE_NAMES.indexOf(b.name));
    state.photos = loaded;
    let coverOnly = false;
    if (shotMode) {
      coverOnly = applyShotToState(state, params);
      if (coverOnly) document.body.classList.add('shot-cover');
    }
    state.slots = createSlots(state.photos.length);
    syncControls();
    render();
    document.fonts.ready.then(() => {
      render();
      if (shotMode) markShotReady();
    });
  }
}

// --- boot --------------------------------------------------------------------

bindControls();
bindCanvas();
syncControls();
loadSamplePhotos();

window.CoverCoast = { state, render, undo, redo, exportAllSizes };
