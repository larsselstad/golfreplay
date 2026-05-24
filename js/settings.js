import { startCamera } from './camera.js';
import { scheduleNextDetection, stopFaceDetection } from './face.js';
import { cfg, saveCfg, state } from './state.js';

const backdrop = document.getElementById('settings-backdrop');
const camToggleBtn = document.getElementById('cam-toggle-btn');
const doneBtn = document.getElementById('done-btn');
const faceTriggerWrap = document.getElementById('face-trigger-wrap');
const instruction = document.getElementById('instruction');
const previewVid = document.getElementById('preview');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');

export function openSettings() {
  state.settingsOpen = true;
  settingsPanel.classList.add('open');
  backdrop.classList.remove('hidden');
  stopFaceDetection();
}

export function closeSettings() {
  state.settingsOpen = false;
  settingsPanel.classList.remove('open');
  backdrop.classList.add('hidden');
  if (
    state.faceTriggerActive &&
    state.appState === 'idle' &&
    cfg.camera === 'user'
  )
    scheduleNextDetection();
}

// Applies a camera facing mode change: restarts stream, syncs pills, manages face-trigger state.
// Only safe to call while idle.
export async function applyCamera(facingMode) {
  cfg.camera = facingMode;
  const grp = document.getElementById('grp-camera');
  grp.querySelectorAll('.pill-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.value === facingMode);
  });
  if (!state.cameraEnabled) return; // camera intentionally off — don't restart
  await startCamera();
  if (cfg.camera === 'environment') {
    if (state.faceTriggerActive) {
      state.faceTriggerActive = false;
      faceTriggerWrap.classList.remove('ft-watching');
    }
    stopFaceDetection();
    faceTriggerWrap.classList.add('hidden');
    instruction.textContent = 'Tap anywhere or press button to start';
  } else {
    faceTriggerWrap.classList.remove('hidden');
    instruction.textContent = state.faceTriggerActive
      ? 'Look at camera to start'
      : 'Tap anywhere or press button to start';
    if (state.faceTriggerActive) scheduleNextDetection();
  }
}

export async function toggleCameraFeed() {
  if (state.appState !== 'idle') return;
  if (state.cameraEnabled) {
    state.cameraEnabled = false;
    if (state.stream) {
      state.stream.getTracks().forEach((t) => {
        t.stop();
      });
      state.stream = null;
    }
    previewVid.srcObject = null;
    camToggleBtn.classList.add('cam-off');
    if (state.faceTriggerActive) {
      state.faceTriggerActive = false;
      faceTriggerWrap.classList.remove('ft-watching');
    }
    stopFaceDetection();
    faceTriggerWrap.classList.add('hidden');
    instruction.textContent = 'Tap 📷 to turn camera on';
  } else {
    state.cameraEnabled = true;
    camToggleBtn.classList.remove('cam-off');
    await startCamera();
    if (cfg.camera === 'user') {
      faceTriggerWrap.classList.remove('hidden');
      instruction.textContent = state.faceTriggerActive
        ? 'Look at camera to start'
        : 'Tap anywhere or press button to start';
      if (state.faceTriggerActive) scheduleNextDetection();
    } else {
      instruction.textContent = 'Tap anywhere or press button to start';
    }
  }
}

settingsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  openSettings();
});
backdrop.addEventListener('click', closeSettings);
doneBtn.addEventListener('click', closeSettings);

// Sync pill UI to match cfg on startup (handles values loaded from localStorage).
function syncPillsFromCfg() {
  for (const key of ['camera', 'countdown', 'replays']) {
    const grp = document.getElementById(`grp-${key}`);
    const val = String(cfg[key]);
    grp.querySelectorAll('.pill-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.value === val);
    });
  }
}
syncPillsFromCfg();

// Pill button groups — camera / countdown / replays
['camera', 'countdown', 'replays'].forEach((key) => {
  const grp = document.getElementById(`grp-${key}`);
  grp.addEventListener('click', async (e) => {
    const btn = e.target.closest('.pill-btn');
    if (!btn) return;
    grp.querySelectorAll('.pill-btn').forEach((b) => {
      b.classList.remove('active');
    });
    btn.classList.add('active');
    const raw = btn.dataset.value;
    if (key === 'camera') {
      if (state.appState === 'idle') await applyCamera(raw);
    } else {
      cfg[key] = parseInt(raw, 10);
    }
    saveCfg();
  });
});

camToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleCameraFeed();
});
