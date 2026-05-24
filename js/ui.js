// ui.js imports face.js, which imports countdown.js and recording.js, which
// both import ui.js — circular deps are safe because all cross-module calls
// happen inside function bodies, never at module evaluation time.

import { scheduleNextDetection, stopFaceDetection } from './face.js';
import {
  camToggleBtn,
  cfg,
  countdownEl,
  errorBanner,
  faceTriggerWrap,
  instruction,
  recIndicator,
  replayInfo,
  settingsBtn,
  state,
  statusBadge,
} from './state.js';

export function setState(s) {
  state.appState = s;
  if (state.cdGoTimeout !== null) {
    clearTimeout(state.cdGoTimeout);
    state.cdGoTimeout = null;
  }

  statusBadge.classList.remove('hidden');
  recIndicator.classList.add('hidden');
  countdownEl.classList.add('hidden');
  countdownEl.classList.remove('cd-go', 'animating');
  replayInfo.classList.add('hidden');
  instruction.classList.remove('hidden');
  settingsBtn.classList.remove('hidden');
  faceTriggerWrap.classList.add('hidden');
  camToggleBtn.classList.add('hidden');

  switch (s) {
    case 'idle':
      statusBadge.textContent = 'Ready';
      instruction.textContent =
        state.faceTriggerActive && cfg.camera === 'user'
          ? 'Look at camera to start'
          : 'Tap anywhere or press button to start';
      camToggleBtn.classList.remove('hidden');
      if (cfg.camera === 'user') {
        faceTriggerWrap.classList.remove('hidden');
        if (state.faceTriggerActive) scheduleNextDetection();
      }
      break;
    case 'countdown':
      statusBadge.textContent = 'Get Ready';
      instruction.textContent = 'Press again to cancel';
      settingsBtn.classList.add('hidden');
      stopFaceDetection();
      break;
    case 'recording':
      statusBadge.classList.add('hidden');
      recIndicator.classList.remove('hidden');
      instruction.textContent =
        state.faceTriggerActive && cfg.camera === 'user'
          ? 'Look at camera to stop'
          : 'Press to stop recording';
      settingsBtn.classList.add('hidden');
      if (state.faceTriggerActive && cfg.camera === 'user') {
        state.faceRecGone = false;
        scheduleNextDetection();
      } else {
        stopFaceDetection();
      }
      break;
    case 'replay':
      statusBadge.classList.add('hidden');
      replayInfo.classList.remove('hidden');
      instruction.classList.add('hidden');
      settingsBtn.classList.add('hidden');
      stopFaceDetection();
      break;
  }
}

export function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.classList.remove('hidden');
  instruction.classList.add('hidden');
}

export function hideError() {
  errorBanner.classList.add('hidden');
}
