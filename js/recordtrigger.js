import { cancelCountdown, startCountdown } from './countdown.js';
import { stopRecording } from './recording.js';
import { endReplay } from './replay.js';
import { closeSettings } from './settings.js';
import { state } from './state.js';

export const TRIGGER_KEYS = new Set([
  ' ',
  'Enter',
  'ArrowRight',
  'ArrowLeft',
  'ArrowUp',
  'ArrowDown',
  'AudioVolumeUp',
  'AudioVolumeDown',
]);

export function onTrigger() {
  if (state.settingsOpen) {
    closeSettings();
    return;
  }
  if (state.appState === 'idle') startCountdown();
  else if (state.appState === 'countdown') cancelCountdown();
  else if (state.appState === 'recording') stopRecording();
  else if (state.appState === 'replay') endReplay();
}

document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (TRIGGER_KEYS.has(e.key)) {
    e.preventDefault();
    onTrigger();
  }
});

// Tap anywhere that is NOT a settings or bottom-right-controls element
document.addEventListener('pointerdown', (e) => {
  if (
    e.target.closest(
      '#settings-panel, #settings-btn, #settings-backdrop, #hud-bottom-right',
    )
  )
    return;
  onTrigger();
});
