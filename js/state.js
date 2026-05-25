export const APP_VERSION = 'v18';

const CFG_KEY = 'cfg';
const CFG_DEFAULTS = { camera: 'user', countdown: 5, replays: 1 };

function loadCfg() {
  try {
    const saved = JSON.parse(localStorage.getItem(CFG_KEY));
    if (saved && typeof saved === 'object')
      return { ...CFG_DEFAULTS, ...saved };
  } catch {}
  return { ...CFG_DEFAULTS };
}

export const cfg = loadCfg();

export function saveCfg() {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

// Shared mutable state. Always access via state.xxx — never destructure mutable fields.
// Object.seal prevents accidental new property creation during refactors.
export const state = Object.seal({
  appState: 'idle', // idle | countdown | recording | replay
  cameraEnabled: true,
  stream: null,
  recorder: null,
  chunks: [],
  replayUrl: null,
  cdTimer: null,
  cdValue: 0,
  recTimer: null,
  recSecs: 0,
  replayCycle: 0,
  replayIter: 0,
  cdGoTimeout: null,
  settingsOpen: false,
  faceTriggerActive: false,
  faceModelsLoaded: false,
  faceModelsLoading: false,
  faceModelsError: false,
  faceDetectTimer: null,
  faceDwellStart: null,
  faceLastDetectTime: null,
  faceRecGone: false,
  speechTriggerActive: false,
});
