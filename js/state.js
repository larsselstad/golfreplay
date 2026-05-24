export const APP_VERSION = 'v13';

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

// ── DOM refs ───────────────────────────────────────────────────────────────
export const previewVid = document.getElementById('preview');
export const replayVid = document.getElementById('replay');
export const statusBadge = document.getElementById('status-badge');
export const recIndicator = document.getElementById('rec-indicator');
export const recTimeEl = document.getElementById('rec-time');
export const countdownEl = document.getElementById('countdown');
export const replayInfo = document.getElementById('replay-info');
export const speedBadge = document.getElementById('speed-badge');
export const cycleCounter = document.getElementById('cycle-counter');
export const instruction = document.getElementById('instruction');
export const errorBanner = document.getElementById('error-banner');
export const settingsBtn = document.getElementById('settings-btn');
export const settingsPanel = document.getElementById('settings-panel');
export const backdrop = document.getElementById('settings-backdrop');
export const doneBtn = document.getElementById('done-btn');
export const versionBadge = document.getElementById('version-badge');
export const faceTriggerWrap = document.getElementById('face-trigger-wrap');
export const faceTriggerBtn = document.getElementById('face-trigger-btn');
export const camToggleBtn = document.getElementById('cam-toggle-btn');

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
});
