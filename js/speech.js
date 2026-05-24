import { startCountdown } from './countdown.js';
import { stopRecording } from './recording.js';
import { state } from './state.js';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export function isSpeechSupported() {
  return !!SpeechRecognition;
}

let recognition = null;
let restartTimeoutId = null;

const speechTriggerBtn = document.getElementById('speech-trigger-btn');

function startListening() {
  if (!state.speechTriggerActive || !recognition) return;
  try {
    recognition.start();
  } catch {
    // Ignore InvalidStateError if recognition is already starting/started
  }
}

function disarm(showWarning = false) {
  state.speechTriggerActive = false;
  clearTimeout(restartTimeoutId);
  restartTimeoutId = null;
  if (recognition) {
    try {
      recognition.abort();
    } catch {}
  }
  speechTriggerBtn.classList.remove('stt-listening');
  if (showWarning) {
    speechTriggerBtn.textContent = '⚠';
  }
}

function initRecognition() {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = '';

  recognition.onresult = (e) => {
    const transcript = Array.from(e.results)
      .map((r) => r[0].transcript)
      .join(' ')
      .toLowerCase();
    if (state.appState === 'idle' && transcript.includes('go')) {
      stopSpeechDetection();
      startCountdown();
    } else if (state.appState === 'recording' && transcript.includes('stop')) {
      stopSpeechDetection();
      stopRecording();
    }
  };

  recognition.onend = () => {
    if (
      state.speechTriggerActive &&
      (state.appState === 'idle' || state.appState === 'recording') &&
      !document.hidden
    ) {
      restartTimeoutId = setTimeout(startListening, 150);
    }
  };

  recognition.onerror = (e) => {
    if (e.error === 'aborted') return;
    if (e.error === 'no-speech') return; // onend will handle restart
    // Fatal errors: permission denied or service unavailable
    disarm(true);
  };
}

export function stopSpeechDetection() {
  clearTimeout(restartTimeoutId);
  restartTimeoutId = null;
  if (recognition) {
    try {
      recognition.abort();
    } catch {}
  }
}

export function resumeSpeechDetection() {
  if (!state.speechTriggerActive || !recognition) return;
  if (state.appState !== 'idle' && state.appState !== 'recording') return;
  if (document.hidden) return;
  startListening();
}

export function toggleSpeechTrigger() {
  if (state.speechTriggerActive) {
    disarm();
  } else {
    if (speechTriggerBtn.textContent === '⚠') {
      speechTriggerBtn.textContent = '🎤';
    }
    if (!recognition) initRecognition();
    state.speechTriggerActive = true;
    speechTriggerBtn.classList.add('stt-listening');
    startListening();
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) resumeSpeechDetection();
});
