(function () {
  'use strict';

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const previewVid   = document.getElementById('preview');
  const replayVid    = document.getElementById('replay');
  const statusBadge  = document.getElementById('status-badge');
  const recIndicator = document.getElementById('rec-indicator');
  const recTimeEl    = document.getElementById('rec-time');
  const countdownEl  = document.getElementById('countdown');
  const replayInfo   = document.getElementById('replay-info');
  const speedBadge   = document.getElementById('speed-badge');
  const cycleCounter = document.getElementById('cycle-counter');
  const instruction  = document.getElementById('instruction');
  const errorBanner  = document.getElementById('error-banner');
  const settingsBtn  = document.getElementById('settings-btn');
  const settingsPanel= document.getElementById('settings-panel');
  const backdrop     = document.getElementById('settings-backdrop');
  const doneBtn      = document.getElementById('done-btn');

  // ── Config (mirrors the settings UI defaults) ──────────────────────────────
  const cfg = { camera: 'user', countdown: 5, replays: 1 };

  // ── App state ──────────────────────────────────────────────────────────────
  let appState     = 'idle';   // idle | countdown | recording | replay
  let stream       = null;
  let recorder     = null;
  let chunks       = [];
  let replayUrl    = null;
  let cdTimer      = null;
  let cdValue      = 0;
  let recTimer     = null;
  let recSecs      = 0;
  let replayCycle  = 0;        // 0 = 1×  1 = 0.5×
  let replayIter   = 0;        // how many full (1× + 0.5×) cycles done
  let cdGoTimeout  = null;     // pending timer to hide the GO! flash
  let settingsOpen = false;

  // ── Camera ─────────────────────────────────────────────────────────────────
  async function startCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cfg.camera },
        audio: false,
      });
      previewVid.srcObject = stream;
      hideError();
    } catch {
      showError('Camera access denied.\nPlease allow camera access and reload the page.');
    }
  }

  // ── MIME-type detection ────────────────────────────────────────────────────
  function bestMime() {
    const candidates = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    return candidates.find(t => {
      try { return MediaRecorder.isTypeSupported(t); } catch { return false; }
    }) ?? '';
  }

  // ── Input handling ─────────────────────────────────────────────────────────
  const TRIGGER_KEYS = new Set([' ', 'Enter', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']);

  document.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (TRIGGER_KEYS.has(e.key)) { e.preventDefault(); onTrigger(); }
  });

  // Tap anywhere that is NOT a settings element
  document.addEventListener('pointerdown', e => {
    if (e.target.closest('#settings-panel, #settings-btn, #settings-backdrop')) return;
    onTrigger();
  });

  function onTrigger() {
    if (settingsOpen) { closeSettings(); return; }
    if      (appState === 'idle')       startCountdown();
    else if (appState === 'countdown')  cancelCountdown();
    else if (appState === 'recording')  stopRecording();
    else if (appState === 'replay')     endReplay();
  }

  // ── Countdown ──────────────────────────────────────────────────────────────
  function startCountdown() {
    if (!stream) return;
    setState('countdown');
    cdValue = cfg.countdown;
    showCd(cdValue);
    cdTimer = setInterval(() => {
      cdValue--;
      if (cdValue <= 0) {
        clearInterval(cdTimer); cdTimer = null;
        showCd('GO!');
        startRecording();
      } else {
        showCd(cdValue);
      }
    }, 1000);
  }

  function cancelCountdown() {
    if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }
    showCd(null);
    setState('idle');
  }

  function showCd(n) {
    if (cdGoTimeout !== null) { clearTimeout(cdGoTimeout); cdGoTimeout = null; }
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
        cdGoTimeout = setTimeout(() => { cdGoTimeout = null; showCd(null); }, 600);
      }
    }
  }

  // ── Recording ──────────────────────────────────────────────────────────────
  function startRecording() {
    if (!window.MediaRecorder) {
      showError('Recording is not supported in this browser.\nPlease use iOS 14.5+ Safari or a modern desktop browser.');
      setState('idle');
      return;
    }
    setState('recording');
    chunks = [];

    const mime = bestMime();
    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    } catch {
      recorder = new MediaRecorder(stream);
    }

    recorder.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data); };
    recorder.onerror = () => {
      if (recTimer) { clearInterval(recTimer); recTimer = null; }
      showError('Recording failed. Please try again.');
      setState('idle');
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || 'video/mp4';
      replayUrl = URL.createObjectURL(new Blob(chunks, { type }));
      startReplay();
    };

    recorder.start(100); // collect data in 100 ms chunks for reliability on iOS
    recSecs = 0;
    updateRecTime();
    recTimer = setInterval(() => { recSecs++; updateRecTime(); }, 1000);
  }

  function stopRecording() {
    if (recTimer) { clearInterval(recTimer); recTimer = null; }
    if (recorder?.state !== 'inactive') recorder.stop();
  }

  function updateRecTime() {
    const m = Math.floor(recSecs / 60);
    const s = recSecs % 60;
    recTimeEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
  }

  // ── Replay ─────────────────────────────────────────────────────────────────
  function startReplay() {
    setState('replay');
    replayIter  = 0;
    replayCycle = 0;
    previewVid.classList.add('hidden');
    replayVid.classList.remove('hidden');
    replayVid.src = replayUrl;
    playSegment();
  }

  function playSegment() {
    replayVid.currentTime  = 0;
    replayVid.playbackRate = replayCycle === 0 ? 1.0 : 0.5;
    speedBadge.textContent = replayCycle === 0 ? '▶ Normal Speed' : '▶ Slow Motion';

    if (cfg.replays > 1) {
      cycleCounter.textContent = `Replay ${replayIter + 1} of ${cfg.replays}`;
      cycleCounter.classList.remove('hidden');
    } else {
      cycleCounter.classList.add('hidden');
    }

    replayVid.play().catch(() => {});
  }

  replayVid.addEventListener('ended', () => {
    if (appState !== 'replay') return;
    if (replayCycle === 0) {
      // Just finished normal speed — switch to slow motion
      replayCycle = 1;
      playSegment();
    } else {
      // Finished slow motion — one full cycle done
      replayIter++;
      if (replayIter < cfg.replays) {
        replayCycle = 0;
        playSegment();
      } else {
        endReplay();
      }
    }
  });

  function endReplay() {
    replayVid.pause();
    replayVid.removeAttribute('src');
    replayVid.load(); // reset element state
    if (replayUrl) { URL.revokeObjectURL(replayUrl); replayUrl = null; }
    replayVid.classList.add('hidden');
    previewVid.classList.remove('hidden');
    setState('idle');
  }

  // ── UI state ───────────────────────────────────────────────────────────────
  function setState(s) {
    appState = s;
    if (cdGoTimeout !== null) { clearTimeout(cdGoTimeout); cdGoTimeout = null; }

    // Reset all HUD elements to hidden/default
    statusBadge.classList.remove('hidden');
    recIndicator.classList.add('hidden');
    countdownEl.classList.add('hidden');
    countdownEl.classList.remove('cd-go', 'animating');
    replayInfo.classList.add('hidden');
    instruction.classList.remove('hidden');
    settingsBtn.classList.remove('hidden');

    switch (s) {
      case 'idle':
        statusBadge.textContent = 'Ready';
        instruction.textContent = 'Tap anywhere or press button to start';
        break;
      case 'countdown':
        statusBadge.textContent = 'Get Ready';
        instruction.textContent = 'Press again to cancel';
        settingsBtn.classList.add('hidden');
        break;
      case 'recording':
        statusBadge.classList.add('hidden');
        recIndicator.classList.remove('hidden');
        instruction.textContent = 'Press to stop recording';
        settingsBtn.classList.add('hidden');
        break;
      case 'replay':
        statusBadge.classList.add('hidden');
        replayInfo.classList.remove('hidden');
        instruction.classList.add('hidden');
        settingsBtn.classList.add('hidden');
        break;
    }
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.remove('hidden');
    instruction.classList.add('hidden');
  }
  function hideError() { errorBanner.classList.add('hidden'); }

  // ── Settings panel ─────────────────────────────────────────────────────────
  function openSettings() {
    settingsOpen = true;
    settingsPanel.classList.add('open');
    backdrop.classList.remove('hidden');
  }
  function closeSettings() {
    settingsOpen = false;
    settingsPanel.classList.remove('open');
    backdrop.classList.add('hidden');
  }

  settingsBtn.addEventListener('click', e => { e.stopPropagation(); openSettings(); });
  backdrop.addEventListener('click', closeSettings);
  doneBtn.addEventListener('click', closeSettings);

  // Pill button groups — camera / countdown / replays
  ['camera', 'countdown', 'replays'].forEach(key => {
    const grp = document.getElementById(`grp-${key}`);
    grp.addEventListener('click', async e => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;
      grp.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const raw = btn.dataset.value;
      cfg[key] = key === 'camera' ? raw : parseInt(raw, 10);
      // Restart camera immediately if the facing mode changed (only safe while idle)
      if (key === 'camera' && appState === 'idle') await startCamera();
    });
  });

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  setState('idle');
  startCamera();
})();
