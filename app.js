(function () {
  'use strict';

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const previewVid      = document.getElementById('preview');
  const replayVid       = document.getElementById('replay');
  const statusBadge     = document.getElementById('status-badge');
  const recIndicator    = document.getElementById('rec-indicator');
  const recTimeEl       = document.getElementById('rec-time');
  const countdownEl     = document.getElementById('countdown');
  const replayInfo      = document.getElementById('replay-info');
  const speedBadge      = document.getElementById('speed-badge');
  const cycleCounter    = document.getElementById('cycle-counter');
  const instruction     = document.getElementById('instruction');
  const errorBanner     = document.getElementById('error-banner');
  const settingsBtn     = document.getElementById('settings-btn');
  const settingsPanel   = document.getElementById('settings-panel');
  const backdrop        = document.getElementById('settings-backdrop');
  const doneBtn         = document.getElementById('done-btn');
  const versionBadge    = document.getElementById('version-badge');
  const faceTriggerWrap = document.getElementById('face-trigger-wrap');
  const faceTriggerBtn  = document.getElementById('face-trigger-btn');

  // ── Version ────────────────────────────────────────────────────────────────
  const APP_VERSION = 'v4';

  // ── Config (mirrors the settings UI defaults) ──────────────────────────────
  const cfg = { camera: 'user', countdown: 5, replays: 1 };

  // ── App state ──────────────────────────────────────────────────────────────
  let appState      = 'idle';   // idle | countdown | recording | replay
  let stream        = null;
  let recorder      = null;
  let chunks        = [];
  let replayUrl     = null;
  let cdTimer       = null;
  let cdValue       = 0;
  let recTimer      = null;
  let recSecs       = 0;
  let replayCycle   = 0;
  let replayIter    = 0;
  let cdGoTimeout   = null;
  let settingsOpen  = false;

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
  const TRIGGER_KEYS = new Set([' ', 'Enter', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'AudioVolumeUp', 'AudioVolumeDown']);

  document.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (TRIGGER_KEYS.has(e.key)) { e.preventDefault(); onTrigger(); }
  });

  // Tap anywhere that is NOT a settings or face-trigger element
  document.addEventListener('pointerdown', e => {
    if (e.target.closest('#settings-panel, #settings-btn, #settings-backdrop, #face-trigger-wrap')) return;
    onTrigger();
  });

  function onTrigger() {
    if (settingsOpen)          { closeSettings(); return; }
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
    faceTriggerWrap.classList.add('hidden');

    switch (s) {
      case 'idle':
        statusBadge.textContent = 'Ready';
        instruction.textContent = (faceTriggerActive && cfg.camera === 'user')
          ? 'Look at camera to start'
          : 'Tap anywhere or press button to start';
        if (cfg.camera === 'user') {
          faceTriggerWrap.classList.remove('hidden');
          if (faceTriggerActive) scheduleNextDetection();
        }
        break;
      case 'countdown':
        statusBadge.textContent = 'Get Ready';
        instruction.textContent = 'Press again to cancel';
        settingsBtn.classList.add('hidden');
        stopFaceDetection();
        break;
      case 'recording':
        statusBadge.classList.add('hidden');
        recIndicator.classList.remove('hidden');
        instruction.textContent = 'Press to stop recording';
        settingsBtn.classList.add('hidden');
        stopFaceDetection();
        break;
      case 'replay':
        statusBadge.classList.add('hidden');
        replayInfo.classList.remove('hidden');
        instruction.classList.add('hidden');
        settingsBtn.classList.add('hidden');
        stopFaceDetection();
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
    stopFaceDetection();
  }
  function closeSettings() {
    settingsOpen = false;
    settingsPanel.classList.remove('open');
    backdrop.classList.add('hidden');
    if (faceTriggerActive && appState === 'idle' && cfg.camera === 'user') scheduleNextDetection();
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
      if (key === 'camera' && appState === 'idle') {
        await startCamera();
        if (cfg.camera === 'environment') {
          if (faceTriggerActive) {
            faceTriggerActive = false;
            faceTriggerWrap.classList.remove('ft-watching');
          }
          stopFaceDetection();
          faceTriggerWrap.classList.add('hidden');
          instruction.textContent = 'Tap anywhere or press button to start';
        } else {
          faceTriggerWrap.classList.remove('hidden');
          instruction.textContent = faceTriggerActive ? 'Look at camera to start' : 'Tap anywhere or press button to start';
        }
      }
    });
  });

  // ── Face trigger ───────────────────────────────────────────────────────────
  let faceTriggerActive  = false;
  let faceModelsLoaded   = false;
  let faceModelsLoading  = false;
  let faceModelsError    = false;
  let faceDetectTimer    = null;
  let faceDwellStart     = null;
  let faceLastDetectTime = null;

  const FACE_DWELL_MS        = 1500;
  const FACE_DETECT_INTERVAL = 500;

  const faceCanvas = document.createElement('canvas');
  const faceCtx    = faceCanvas.getContext('2d');

  function loadFaceApiScript() {
    return new Promise((resolve, reject) => {
      if (window.faceapi) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function loadFaceModels() {
    if (faceModelsLoaded || faceModelsLoading) return;
    faceModelsLoading = true;
    faceTriggerBtn.classList.add('ft-loading');
    try {
      await loadFaceApiScript();
      const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      ]);
      faceModelsLoaded = true;
      faceModelsError  = false;
    } catch {
      faceModelsError = true;
      faceTriggerBtn.textContent = '⚠';
    }
    faceModelsLoading = false;
    faceTriggerBtn.classList.remove('ft-loading');
    if (faceModelsLoaded && faceTriggerActive && appState === 'idle' && !settingsOpen) {
      scheduleNextDetection();
    }
  }

  function scheduleNextDetection() {
    clearTimeout(faceDetectTimer);
    faceDetectTimer = null;
    if (!faceModelsLoaded || !faceTriggerActive || appState !== 'idle' || settingsOpen) return;
    faceDetectTimer = setTimeout(runFaceDetection, FACE_DETECT_INTERVAL);
  }

  function stopFaceDetection() {
    clearTimeout(faceDetectTimer);
    faceDetectTimer    = null;
    faceDwellStart     = null;
    faceLastDetectTime = null;
    if (faceTriggerWrap) updateDwellRing(0);
  }

  async function runFaceDetection() {
    faceDetectTimer = null;
    if (!faceModelsLoaded || !faceTriggerActive || appState !== 'idle' || settingsOpen) return;
    if (!faceCtx || !previewVid.videoWidth) { scheduleNextDetection(); return; }

    // Downscale to max 320px on the longest dimension for performance
    const scale = Math.min(1, 320 / Math.max(previewVid.videoWidth, previewVid.videoHeight));
    const w = Math.round(previewVid.videoWidth  * scale);
    const h = Math.round(previewVid.videoHeight * scale);
    if (faceCanvas.width !== w)  faceCanvas.width  = w;
    if (faceCanvas.height !== h) faceCanvas.height = h;
    faceCtx.drawImage(previewVid, 0, 0, w, h);

    let detections;
    try {
      detections = await faceapi
        .detectAllFaces(faceCanvas, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks(true);
    } catch {
      scheduleNextDetection();
      return;
    }

    // Guard: state may have changed during async inference
    if (!faceTriggerActive || appState !== 'idle' || settingsOpen) return;

    // Use only the largest detected face to avoid triggering on bystanders
    const largest = detections.reduce(
      (best, d) => (!best || d.detection.box.area > best.detection.box.area) ? d : best, null
    );

    const looking = largest ? isFrontalFace(largest, w) : false;
    const now = Date.now();

    // Reset dwell if there was a long gap (page was throttled or backgrounded)
    if (faceLastDetectTime && now - faceLastDetectTime > FACE_DETECT_INTERVAL * 3) {
      faceDwellStart = null;
    }
    faceLastDetectTime = now;

    if (looking) {
      if (!faceDwellStart) faceDwellStart = now;
      const elapsed = now - faceDwellStart;
      updateDwellRing(Math.min(elapsed / FACE_DWELL_MS, 1));
      if (elapsed >= FACE_DWELL_MS) {
        stopFaceDetection();
        startCountdown();
        return;
      }
    } else {
      faceDwellStart = null;
      updateDwellRing(0);
    }

    scheduleNextDetection();
  }

  function isFrontalFace(detection, canvasWidth) {
    const box = detection.detection.box;
    if (box.width < canvasWidth * 0.08) return false;

    const pts = detection.landmarks.positions;
    const leftEyeX  = (pts[36].x + pts[37].x + pts[38].x + pts[39].x + pts[40].x + pts[41].x) / 6;
    const rightEyeX = (pts[42].x + pts[43].x + pts[44].x + pts[45].x + pts[46].x + pts[47].x) / 6;
    const noseTipX  = pts[30].x;
    const eyeMidX   = (leftEyeX + rightEyeX) / 2;
    const eyeSpan   = Math.abs(rightEyeX - leftEyeX);
    if (eyeSpan < 1) return false;
    return Math.abs(noseTipX - eyeMidX) / eyeSpan < 0.20;
  }

  function updateDwellRing(progress) {
    faceTriggerWrap.style.setProperty('--dwell', `${Math.round(progress * 100)}%`);
  }

  async function toggleFaceTrigger() {
    if (faceModelsLoading) return;
    if (faceTriggerActive) {
      faceTriggerActive = false;
      stopFaceDetection();
      faceTriggerWrap.classList.remove('ft-watching');
      instruction.textContent = 'Tap anywhere or press button to start';
    } else {
      if (faceModelsError) {
        faceModelsError = false;
        faceTriggerBtn.textContent = '👁';
      }
      faceTriggerActive = true;
      faceTriggerWrap.classList.add('ft-watching');
      instruction.textContent = 'Look at camera to start';
      if (!faceModelsLoaded) {
        await loadFaceModels();
      } else {
        scheduleNextDetection();
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      faceDwellStart     = null;
      faceLastDetectTime = null;
      updateDwellRing(0);
    }
  });

  faceTriggerBtn.addEventListener('click', e => { e.stopPropagation(); toggleFaceTrigger(); });

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  versionBadge.textContent = APP_VERSION;

  setState('idle');
  startCamera();
})();
