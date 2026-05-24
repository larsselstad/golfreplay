import { startReplay } from './replay.js';
import { recTimeEl, state } from './state.js';
import { setState, showError } from './ui.js';

function bestMime() {
  const candidates = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  return (
    candidates.find((t) => {
      try {
        return MediaRecorder.isTypeSupported(t);
      } catch {
        return false;
      }
    }) ?? ''
  );
}

export function startRecording() {
  if (!window.MediaRecorder) {
    showError(
      'Recording is not supported in this browser.\nPlease use iOS 14.5+ Safari or a modern desktop browser.',
    );
    setState('idle');
    return;
  }
  setState('recording');
  state.chunks = [];

  const mime = bestMime();
  try {
    state.recorder = new MediaRecorder(
      state.stream,
      mime ? { mimeType: mime } : {},
    );
  } catch {
    state.recorder = new MediaRecorder(state.stream);
  }

  state.recorder.ondataavailable = (e) => {
    if (e.data?.size > 0) state.chunks.push(e.data);
  };
  state.recorder.onerror = () => {
    if (state.recTimer) {
      clearInterval(state.recTimer);
      state.recTimer = null;
    }
    showError('Recording failed. Please try again.');
    setState('idle');
  };
  state.recorder.onstop = () => {
    const type = state.recorder.mimeType || 'video/mp4';
    state.replayUrl = URL.createObjectURL(new Blob(state.chunks, { type }));
    startReplay();
  };

  state.recorder.start(100); // collect data in 100 ms chunks for reliability on iOS
  state.recSecs = 0;
  updateRecTime();
  state.recTimer = setInterval(() => {
    state.recSecs++;
    updateRecTime();
  }, 1000);
}

export function stopRecording() {
  if (state.recTimer) {
    clearInterval(state.recTimer);
    state.recTimer = null;
  }
  if (state.recorder?.state !== 'inactive') state.recorder.stop();
}

export function updateRecTime() {
  const m = Math.floor(state.recSecs / 60);
  const s = state.recSecs % 60;
  recTimeEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
}
