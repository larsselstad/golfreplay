import { startCamera } from './camera.js';
import { APP_VERSION, versionBadge } from './state.js';
import { setState } from './ui.js';
// Import input.js to register keyboard/pointer listeners and transitively
// pull in all other modules (settings, face, countdown, recording, replay).
import './input.js';

versionBadge.textContent = APP_VERSION;
setState('idle');
startCamera();
