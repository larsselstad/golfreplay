import { startCountdown } from './countdown.js';
import { stopRecording } from './recording.js';
import { cfg, state } from './state.js';

const faceTriggerBtn = document.getElementById('face-trigger-btn');
const faceTriggerWrap = document.getElementById('face-trigger-wrap');
const instruction = document.getElementById('instruction');
const previewVid = document.getElementById('preview');

const FACE_DWELL_MS = 1500;
const FACE_STOP_DWELL_MS = 1000;
const FACE_DETECT_INTERVAL = 500;

const faceCanvas = document.createElement('canvas');
const faceCtx = faceCanvas.getContext('2d');

function loadFaceApiScript() {
  return new Promise((resolve, reject) => {
    if (window.faceapi) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src =
      'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function loadFaceModels() {
  if (state.faceModelsLoaded || state.faceModelsLoading) return;
  state.faceModelsLoading = true;
  faceTriggerBtn.classList.add('ft-loading');
  try {
    await loadFaceApiScript();
    const MODEL_URL =
      'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    ]);
    state.faceModelsLoaded = true;
    state.faceModelsError = false;
  } catch {
    state.faceModelsError = true;
    faceTriggerBtn.textContent = '⚠';
  }
  state.faceModelsLoading = false;
  faceTriggerBtn.classList.remove('ft-loading');
  if (
    state.faceModelsLoaded &&
    state.faceTriggerActive &&
    state.appState === 'idle' &&
    !state.settingsOpen
  ) {
    scheduleNextDetection();
  }
}

export function scheduleNextDetection() {
  clearTimeout(state.faceDetectTimer);
  state.faceDetectTimer = null;
  if (
    !state.faceModelsLoaded ||
    !state.faceTriggerActive ||
    cfg.camera !== 'user'
  )
    return;
  if (state.appState !== 'idle' && state.appState !== 'recording') return;
  if (state.settingsOpen) return;
  state.faceDetectTimer = setTimeout(runFaceDetection, FACE_DETECT_INTERVAL);
}

export function stopFaceDetection() {
  clearTimeout(state.faceDetectTimer);
  state.faceDetectTimer = null;
  state.faceDwellStart = null;
  state.faceLastDetectTime = null;
  state.faceRecGone = false;
  if (faceTriggerWrap) updateDwellRing(0);
}

async function runFaceDetection() {
  state.faceDetectTimer = null;
  const inActiveState =
    state.appState === 'idle' || state.appState === 'recording';
  if (
    !state.faceModelsLoaded ||
    !state.faceTriggerActive ||
    cfg.camera !== 'user' ||
    !inActiveState ||
    state.settingsOpen
  )
    return;
  if (!faceCtx || !previewVid.videoWidth) {
    scheduleNextDetection();
    return;
  }

  // Downscale to max 320px on the longest dimension for performance
  const scale = Math.min(
    1,
    320 / Math.max(previewVid.videoWidth, previewVid.videoHeight),
  );
  const w = Math.round(previewVid.videoWidth * scale);
  const h = Math.round(previewVid.videoHeight * scale);
  if (faceCanvas.width !== w) faceCanvas.width = w;
  if (faceCanvas.height !== h) faceCanvas.height = h;
  faceCtx.drawImage(previewVid, 0, 0, w, h);

  let detections;
  try {
    detections = await faceapi
      .detectAllFaces(
        faceCanvas,
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }),
      )
      .withFaceLandmarks(true);
  } catch {
    scheduleNextDetection();
    return;
  }

  // Guard: state may have changed during async inference
  const inActiveStatePost =
    state.appState === 'idle' || state.appState === 'recording';
  if (
    !state.faceTriggerActive ||
    cfg.camera !== 'user' ||
    !inActiveStatePost ||
    state.settingsOpen
  )
    return;

  // Use only the largest detected face to avoid triggering on bystanders
  const largest = detections.reduce(
    (best, d) =>
      !best || d.detection.box.area > best.detection.box.area ? d : best,
    null,
  );

  const looking = largest ? isFrontalFace(largest, w) : false;
  const now = Date.now();

  // Reset dwell if there was a long gap (page was throttled or backgrounded)
  if (
    state.faceLastDetectTime &&
    now - state.faceLastDetectTime > FACE_DETECT_INTERVAL * 3
  ) {
    state.faceDwellStart = null;
  }
  state.faceLastDetectTime = now;

  const dwellMs =
    state.appState === 'recording' ? FACE_STOP_DWELL_MS : FACE_DWELL_MS;

  if (looking) {
    if (state.appState === 'recording' && !state.faceRecGone) {
      // Face still frontal at recording start — wait for golfer to look away first
      state.faceDwellStart = null;
    } else {
      if (!state.faceDwellStart) state.faceDwellStart = now;
      const elapsed = now - state.faceDwellStart;
      if (state.appState === 'idle')
        updateDwellRing(Math.min(elapsed / dwellMs, 1));
      if (elapsed >= dwellMs) {
        stopFaceDetection();
        if (state.appState === 'idle') startCountdown();
        else stopRecording();
        return;
      }
    }
  } else {
    if (state.appState === 'recording') state.faceRecGone = true;
    state.faceDwellStart = null;
    if (state.appState === 'idle') updateDwellRing(0);
  }

  scheduleNextDetection();
}

function isFrontalFace(detection, canvasWidth) {
  const box = detection.detection.box;
  if (box.width < canvasWidth * 0.08) return false;

  const pts = detection.landmarks.positions;
  const leftEyeX =
    (pts[36].x + pts[37].x + pts[38].x + pts[39].x + pts[40].x + pts[41].x) / 6;
  const rightEyeX =
    (pts[42].x + pts[43].x + pts[44].x + pts[45].x + pts[46].x + pts[47].x) / 6;
  const noseTipX = pts[30].x;
  const eyeMidX = (leftEyeX + rightEyeX) / 2;
  const eyeSpan = Math.abs(rightEyeX - leftEyeX);
  if (eyeSpan < 1) return false;
  return Math.abs(noseTipX - eyeMidX) / eyeSpan < 0.2;
}

export function updateDwellRing(progress) {
  faceTriggerWrap.style.setProperty(
    '--dwell',
    `${Math.round(progress * 100)}%`,
  );
}

export async function toggleFaceTrigger() {
  if (state.faceModelsLoading) return;
  if (state.faceTriggerActive) {
    state.faceTriggerActive = false;
    stopFaceDetection();
    faceTriggerWrap.classList.remove('ft-watching');
    instruction.textContent = 'Tap anywhere or press button to start';
  } else {
    if (state.faceModelsError) {
      state.faceModelsError = false;
      faceTriggerBtn.textContent = '👁';
    }
    state.faceTriggerActive = true;
    faceTriggerWrap.classList.add('ft-watching');
    instruction.textContent = 'Look at camera to start';
    if (!state.faceModelsLoaded) {
      await loadFaceModels();
    } else {
      scheduleNextDetection();
    }
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    state.faceDwellStart = null;
    state.faceLastDetectTime = null;
    updateDwellRing(0);
  }
});

faceTriggerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleFaceTrigger();
});
