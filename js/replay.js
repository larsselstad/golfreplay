import {
  cfg,
  cycleCounter,
  previewVid,
  replayVid,
  speedBadge,
  state,
} from './state.js';
import { setState } from './ui.js';

export function startReplay() {
  setState('replay');
  state.replayIter = 0;
  state.replayCycle = 0;
  previewVid.classList.add('hidden');
  replayVid.classList.remove('hidden');
  replayVid.src = state.replayUrl;
  playSegment();
}

export function playSegment() {
  replayVid.currentTime = 0;
  replayVid.playbackRate = state.replayCycle === 0 ? 1.0 : 0.5;
  speedBadge.textContent =
    state.replayCycle === 0 ? '▶ Normal Speed' : '▶ Slow Motion';

  if (cfg.replays > 1) {
    cycleCounter.textContent = `Replay ${state.replayIter + 1} of ${cfg.replays}`;
    cycleCounter.classList.remove('hidden');
  } else {
    cycleCounter.classList.add('hidden');
  }

  replayVid.play().catch(() => {});
}

export function endReplay() {
  replayVid.pause();
  replayVid.removeAttribute('src');
  replayVid.load(); // reset element state
  if (state.replayUrl) {
    URL.revokeObjectURL(state.replayUrl);
    state.replayUrl = null;
  }
  replayVid.classList.add('hidden');
  previewVid.classList.remove('hidden');
  setState('idle');
}

replayVid.addEventListener('ended', () => {
  if (state.appState !== 'replay') return;
  if (state.replayCycle === 0) {
    // Just finished normal speed — switch to slow motion
    state.replayCycle = 1;
    playSegment();
  } else {
    // Finished slow motion — one full cycle done
    state.replayIter++;
    if (state.replayIter < cfg.replays) {
      state.replayCycle = 0;
      playSegment();
    } else {
      endReplay();
    }
  }
});
