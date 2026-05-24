import { startCamera } from './camera.js';
import { APP_VERSION } from './state.js';
import { setState } from './ui.js';
// Import controls.js to register HUD button listeners (camera toggle, face trigger).
// Import recordtrigger.js to register keyboard/pointer listeners and transitively
// pull in all other modules (settings, face, countdown, recording, replay).
import './controls.js';
import './recordtrigger.js';

const versionBadge = document.getElementById('version-badge');

versionBadge.textContent = APP_VERSION;
setState('idle');
startCamera();
