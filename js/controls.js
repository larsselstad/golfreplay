import { startCamera } from './camera.js';
import {
  scheduleNextDetection,
  stopFaceDetection,
  toggleFaceTrigger,
} from './face.js';
import { cfg, state } from './state.js';

const camToggleBtn = document.getElementById('cam-toggle-btn');
const faceTriggerBtn = document.getElementById('face-trigger-btn');
const faceTriggerWrap = document.getElementById('face-trigger-wrap');
const instruction = document.getElementById('instruction');
const previewVid = document.getElementById('preview');

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

camToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleCameraFeed();
});

faceTriggerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleFaceTrigger();
});
