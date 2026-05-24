import { startCamera } from './camera.js';
import { scheduleNextDetection, stopFaceDetection } from './face.js';
import { cfg, saveCfg, state } from './state.js';

const backdrop = document.getElementById('settings-backdrop');
const faceTriggerWrap = document.getElementById('face-trigger-wrap');
const instruction = document.getElementById('instruction');
const settingsBtn = document.getElementById('settings-btn');
const settingsForm = document.getElementById('settings-form');
const settingsPanel = document.getElementById('settings-panel');

export function openSettings() {
  state.settingsOpen = true;
  syncRadiosFromCfg();
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

// Applies a camera facing mode change: restarts stream, manages face-trigger state.
// Only safe to call while idle.
export async function applyCamera(facingMode) {
  cfg.camera = facingMode;
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

settingsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  openSettings();
});
backdrop.addEventListener('click', closeSettings);

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(settingsForm);
  const newCamera = data.get('camera');
  const cameraChanged = newCamera !== cfg.camera;
  cfg.countdown = parseInt(data.get('countdown'), 10);
  cfg.replays = parseInt(data.get('replays'), 10);
  if (cameraChanged && state.appState === 'idle') await applyCamera(newCamera);
  saveCfg();
  closeSettings();
});

function syncRadiosFromCfg() {
  for (const key of ['camera', 'countdown', 'replays']) {
    const val = String(cfg[key]);
    const radio = settingsForm.querySelector(
      `input[name="${key}"][value="${val}"]`,
    );
    if (radio) radio.checked = true;
  }
}
