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
const instruction = document.getElementById('instruction');

function startListening() {
  if (!state.speechTriggerActive || !recognition) return;
  console.log('[speech] startListening — appState:', state.appState);
  try {
    recognition.start();
  } catch (err) {
    console.log('[speech] startListening error (ignored):', err?.message);
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
    console.log(
      '[speech] onresult — appState:',
      state.appState,
      '| transcript:',
      transcript,
    );
    if (state.appState === 'idle' && /\bstart\b/.test(transcript)) {
      stopSpeechDetection();
      startCountdown();
    } else if (state.appState === 'recording' && /\bstop\b/.test(transcript)) {
      stopSpeechDetection();
      stopRecording();
    }
  };

  recognition.onend = () => {
    console.log(
      '[speech] onend — appState:',
      state.appState,
      '| speechTriggerActive:',
      state.speechTriggerActive,
    );
    if (
      state.speechTriggerActive &&
      (state.appState === 'idle' || state.appState === 'recording') &&
      !document.hidden
    ) {
      restartTimeoutId = setTimeout(startListening, 150);
    }
  };

  recognition.onerror = (e) => {
    console.log('[speech] onerror — error:', e.error);
    if (e.error === 'aborted') return;
    if (e.error === 'no-speech') return; // onend will handle restart
    const FATAL_ERRORS = new Set([
      'not-allowed',
      'service-not-allowed',
      'network',
    ]);
    if (FATAL_ERRORS.has(e.error)) {
      disarm(true);
    }
    // All other errors (audio-capture, bad-grammar, language-not-supported, etc.)
    // are transient — let onend handle the restart.
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
  console.log(
    '[speech] resumeSpeechDetection — appState:',
    state.appState,
    '| speechTriggerActive:',
    state.speechTriggerActive,
  );
  if (!state.speechTriggerActive || !recognition) return;
  if (state.appState !== 'idle' && state.appState !== 'recording') return;
  if (document.hidden) return;
  startListening();
}

export function toggleSpeechTrigger() {
  if (!isSpeechSupported()) return;
  if (state.speechTriggerActive) {
    disarm();
    instruction.textContent = 'Tap anywhere or press button to start';
  } else {
    if (speechTriggerBtn.textContent === '⚠') {
      speechTriggerBtn.textContent = '🎤';
    }
    if (!recognition) initRecognition();
    state.speechTriggerActive = true;
    speechTriggerBtn.classList.add('stt-listening');
    instruction.textContent = 'Say "start" to start';
    startListening();
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) resumeSpeechDetection();
});
