// ui.js imports face.js and speech.js, which import countdown.js and recording.js,
// which both import ui.js — circular deps are safe because all cross-module calls
// happen inside function bodies, never at module evaluation time.

import { scheduleNextDetection, stopFaceDetection } from './face.js';
import {
  isSpeechSupported,
  resumeSpeechDetection,
  stopSpeechDetection,
} from './speech.js';
import { cfg, state } from './state.js';

const camToggleBtn = document.getElementById('cam-toggle-btn');
const countdownEl = document.getElementById('countdown');
const errorBanner = document.getElementById('error-banner');
const faceTriggerWrap = document.getElementById('face-trigger-wrap');
const instruction = document.getElementById('instruction');
const recIndicator = document.getElementById('rec-indicator');
const replayInfo = document.getElementById('replay-info');
const settingsBtn = document.getElementById('settings-btn');
const speechTriggerBtn = document.getElementById('speech-trigger-btn');
const statusBadge = document.getElementById('status-badge');

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
  speechTriggerBtn.classList.add('hidden');

  switch (s) {
    case 'idle':
      statusBadge.textContent = 'Ready';
      if (state.faceTriggerActive && cfg.camera === 'user') {
        instruction.textContent = 'Look at camera to start';
      } else if (state.speechTriggerActive) {
        instruction.textContent = 'Say "go" to start';
      } else {
        instruction.textContent = 'Tap anywhere or press button to start';
      }
      camToggleBtn.classList.remove('hidden');
      if (isSpeechSupported()) speechTriggerBtn.classList.remove('hidden');
      if (cfg.camera === 'user') {
        faceTriggerWrap.classList.remove('hidden');
        if (state.faceTriggerActive) scheduleNextDetection();
      }
      if (state.speechTriggerActive) resumeSpeechDetection();
      break;
    case 'countdown':
      statusBadge.textContent = 'Get Ready';
      instruction.textContent = 'Press again to cancel';
      settingsBtn.classList.add('hidden');
      stopFaceDetection();
      stopSpeechDetection();
      break;
    case 'recording':
      statusBadge.classList.add('hidden');
      recIndicator.classList.remove('hidden');
      if (state.faceTriggerActive && cfg.camera === 'user') {
        instruction.textContent = 'Look at camera to stop';
      } else if (state.speechTriggerActive) {
        instruction.textContent = 'Say "stop" to stop recording';
      } else {
        instruction.textContent = 'Press to stop recording';
      }
      settingsBtn.classList.add('hidden');
      if (state.faceTriggerActive && cfg.camera === 'user') {
        state.faceRecGone = false;
        scheduleNextDetection();
      } else {
        stopFaceDetection();
      }
      if (state.speechTriggerActive) resumeSpeechDetection();
      break;
    case 'replay':
      statusBadge.classList.add('hidden');
      replayInfo.classList.remove('hidden');
      instruction.classList.add('hidden');
      settingsBtn.classList.add('hidden');
      stopFaceDetection();
      stopSpeechDetection();
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
