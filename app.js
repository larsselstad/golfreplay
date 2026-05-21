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
  const btSavedRow      = document.getElementById('bt-saved-row');
  const btSavedKeyEl    = document.getElementById('bt-saved-key');
  const btClearBtn      = document.getElementById('bt-clear-btn');
  const btDetectBtn     = document.getElementById('bt-detect-btn');
  const btDetectOverlay = document.getElementById('bt-detect-overlay');
  const btDetectMsg     = document.getElementById('bt-detect-msg');
  const btDetectFound   = document.getElementById('bt-detect-found');
  const btDetectKeyName = document.getElementById('bt-detect-key-name');
  const btDetectSecsEl  = document.getElementById('bt-detect-secs');
  const btCancelBtn     = document.getElementById('bt-cancel-btn');

  // ── Version ────────────────────────────────────────────────────────────────
  const APP_VERSION = 'v2';

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
  let btDetectActive = false;
  let btCountdownTimer = null;
  let btCountdownLeft  = 10;

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

  // Tap anywhere that is NOT a settings or bt-detect element
  document.addEventListener('pointerdown', e => {
    if (e.target.closest('#settings-panel, #settings-btn, #settings-backdrop, #bt-detect-overlay')) return;
    onTrigger();
  });

  function onTrigger() {
    if (btDetectActive)        { closeBtDetect(); return; }
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

  // ── Bluetooth button detection ─────────────────────────────────────────────
  function formatKey(key) {
    const names = { 'AudioVolumeUp': 'Volume Up', 'AudioVolumeDown': 'Volume Down', ' ': 'Space' };
    return names[key] ?? key;
  }

  function updateBtSavedRow() {
    const saved = localStorage.getItem('btTriggerKey');
    if (saved) {
      btSavedKeyEl.textContent = formatKey(saved);
      btSavedRow.classList.remove('hidden');
    } else {
      btSavedRow.classList.add('hidden');
    }
  }

  function openBtDetect() {
    btDetectActive = true;
    btDetectOverlay.classList.remove('hidden');
    btDetectMsg.textContent = 'Press your Bluetooth button now';
    btDetectFound.classList.add('hidden');
    btCountdownLeft = 10;
    btDetectSecsEl.textContent = '10';
    document.addEventListener('keydown', onBtKey, true);
    btCountdownTimer = setInterval(() => {
      btCountdownLeft--;
      btDetectSecsEl.textContent = String(btCountdownLeft);
      if (btCountdownLeft <= 0) {
        clearInterval(btCountdownTimer); btCountdownTimer = null;
        document.removeEventListener('keydown', onBtKey, true);
        btDetectMsg.textContent = 'No key detected. iOS may block volume keys from web apps. Try configuring your button to send a different key (e.g. Space or Enter).';
        btDetectSecsEl.textContent = '';
      }
    }, 1000);
  }

  function onBtKey(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    clearInterval(btCountdownTimer); btCountdownTimer = null;
    document.removeEventListener('keydown', onBtKey, true);
    const key = e.key;
    localStorage.setItem('btTriggerKey', key);
    TRIGGER_KEYS.add(key);
    updateBtSavedRow();
    btDetectMsg.textContent = 'Button detected!';
    btDetectKeyName.textContent = formatKey(key);
    btDetectFound.classList.remove('hidden');
    btDetectSecsEl.textContent = '';
    setTimeout(closeBtDetect, 1800);
  }

  function closeBtDetect() {
    btDetectActive = false;
    btDetectOverlay.classList.add('hidden');
    clearInterval(btCountdownTimer); btCountdownTimer = null;
    document.removeEventListener('keydown', onBtKey, true);
  }

  btDetectBtn.addEventListener('click', e => { e.stopPropagation(); closeSettings(); openBtDetect(); });
  btClearBtn.addEventListener('click', e => {
    e.stopPropagation();
    const saved = localStorage.getItem('btTriggerKey');
    if (saved) TRIGGER_KEYS.delete(saved);
    localStorage.removeItem('btTriggerKey');
    updateBtSavedRow();
  });
  btCancelBtn.addEventListener('click', e => { e.stopPropagation(); closeBtDetect(); });

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  versionBadge.textContent = APP_VERSION;

  const savedBtKey = localStorage.getItem('btTriggerKey');
  if (savedBtKey) { TRIGGER_KEYS.add(savedBtKey); updateBtSavedRow(); }

  setState('idle');
  startCamera();
})();
