import { startRecording } from './recording.js';
import { cfg, state } from './state.js';
import { setState } from './ui.js';

const countdownEl = document.getElementById('countdown');

export function startCountdown() {
  if (!state.stream) return;
  setState('countdown');
  state.cdValue = cfg.countdown;
  showCd(state.cdValue);
  state.cdTimer = setInterval(() => {
    state.cdValue--;
    if (state.cdValue <= 0) {
      clearInterval(state.cdTimer);
      state.cdTimer = null;
      showCd('GO!');
      startRecording();
    } else {
      showCd(state.cdValue);
    }
  }, 1000);
}

export function cancelCountdown() {
  if (state.cdTimer) {
    clearInterval(state.cdTimer);
    state.cdTimer = null;
  }
  showCd(null);
  setState('idle');
}

export function showCd(n) {
  if (state.cdGoTimeout !== null) {
    clearTimeout(state.cdGoTimeout);
    state.cdGoTimeout = null;
  }
  if (n === null) {
    countdownEl.classList.add('hidden');
    countdownEl.classList.remove('cd-go', 'animating');
  } else {
    countdownEl.textContent = n;
    countdownEl.classList.toggle('cd-go', n === 'GO!');
    // Restart animation so each number pops in fresh
    countdownEl.classList.remove('animating');
    void countdownEl.offsetWidth;
    countdownEl.classList.remove('hidden');
    countdownEl.classList.add('animating');
    if (n === 'GO!') {
      state.cdGoTimeout = setTimeout(() => {
        state.cdGoTimeout = null;
        showCd(null);
      }, 600);
    }
  }
}
