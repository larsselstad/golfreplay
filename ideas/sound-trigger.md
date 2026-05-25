# Idea: Voice Trigger (Speech Command to Start / Stop)

**Problem:** Both the tap-anywhere trigger and the face trigger require the golfer to be near the phone. When the phone is on a tripod several metres away, there is no hands-free way to start or stop a recording — and the golfer is holding a club, so clapping is not an option.

## Proposed solution

Add a **voice trigger** (🎤 button). The golfer says a short word to start the countdown, and another word to stop the recording. No ML model download is needed — the browser's built-in `SpeechRecognition` API handles transcription.

---

## How it works

1. Tap 🎤 to arm the trigger (button turns active)
2. Walk to ball position
3. Say **"go"** → countdown starts automatically
4. Take the swing; recording begins after countdown
5. Say **"stop"** → recording stops and replay begins
6. Watch the replay, then repeat

---

## iOS Safari compatibility

`window.webkitSpeechRecognition` is available on **iOS Safari 14.1+** (shipped April 2021). As of 2025/2026 with iOS 16–18, it is well-supported. Key characteristics:

| Characteristic | Detail |
|---|---|
| API name | `window.webkitSpeechRecognition` (no unprefixed `SpeechRecognition` on iOS) |
| iOS version | Available since **iOS 14.5 / Safari 14.1** (April 2021) |
| Internet required | Usually; WebKit auto-enables on-device recognition when device supports it for the locale (transparent to the developer) |
| `continuous: true` | Unreliable on iOS; recognition fires `onend` after each utterance (~5–7 s silence timeout) and hits a ~60 s hard session cap |
| `interimResults: true` | Works; allows matching while the user is still speaking |
| Auto-stop | iOS stops recognition after each phrase; `onend` fires reliably |
| Workaround for auto-stop | Restart recognition in the `onend` callback with a 150 ms delay (see below) |
| User gesture required | `start()` must be called directly from a user interaction the **first time** |
| **Siri must be enabled** | **iOS Settings → Siri & Search must be ON.** If Siri is disabled, `onerror` fires with `service-not-allowed` and the API is unavailable — no way to prompt the user from the web |
| Screen lock | **Locking the screen terminates recognition** — `onend` fires. The restart loop cannot resume until the screen is unlocked and the page is back in the foreground |

**Detection approach:** After arming, restart recognition continuously in `onend`. On each `onresult` event, check whether the transcript contains the trigger word (`"go"` or `"stop"`). Case-insensitive substring match is sufficient and tolerates homophones (e.g. "go" matches "okay go").

### Restart loop pattern

```js
function startListening() {
  if (!state.speechTriggerActive) return;
  recognition.start();
}

recognition.onend = () => {
  // iOS always fires onend after each utterance — restart immediately.
  // 150 ms delay prevents the "recognition already started" InvalidStateError on iOS.
  if (state.speechTriggerActive && (state.appState === 'idle' || state.appState === 'recording')) {
    setTimeout(startListening, 150);
  }
};

recognition.onresult = (e) => {
  const transcript = Array.from(e.results)
    .map(r => r[0].transcript)
    .join(' ')
    .toLowerCase();
  if (state.appState === 'idle' && transcript.includes('go')) {
    stopSpeechDetection();
    startCountdown();
  } else if (state.appState === 'recording' && transcript.includes('stop')) {
    stopSpeechDetection();
    stopRecording();
  }
};
```

### Trigger word choices

| Word | Use case | Notes |
|---|---|---|
| `"go"` | Start countdown | Short, distinct, easy to say with a club in hand |
| `"stop"` | Stop recording | Unambiguous; unlikely to appear in casual course chatter |

Alternative pairs: "start" / "done", "ready" / "finish". Single-syllable words with distinct phonemes work best for cloud recognition at distance.

---

## Implementation outline

### New file: `js/speech.js`

| Export | Description |
|---|---|
| `toggleSpeechTrigger()` | Arms / disarms the trigger; creates `SpeechRecognition` instance on first arm |
| `stopSpeechDetection()` | Aborts recognition and clears restart loop |
| `isSpeechSupported()` | Returns `true` if `webkitSpeechRecognition` or `SpeechRecognition` exists in `window` |

### State additions (`js/state.js`)

```js
speechTriggerActive: false,
speechRecognition: null,    // SpeechRecognition instance (reused across restarts)
speechRestarting: false,    // true while the 100 ms restart timeout is pending
```

> **Why no separate mic stream?** `SpeechRecognition` manages its own audio pipeline internally — no `getUserMedia` call required. The browser handles mic permission automatically when `recognition.start()` is first called.

### Button placement (`index.html`)

Add a new button to `#hud-bottom-right`, alongside the face trigger and camera toggle:

```html
<button id="speech-trigger-btn"
  class="size-50 glass rounded-full btn flex items-center justify-center text-dim text-icon line-1 transition-color pointer-auto hidden"
  aria-label="Voice trigger">🎤</button>
```

Visibility rules:
- Shown in `idle` state only (hidden during countdown, recording, replay)
- Shown regardless of which camera is active
- Hidden entirely if `isSpeechSupported()` returns `false`

### Integration with the state machine

```
idle      + "go"   →  startCountdown()
recording + "stop" →  stopRecording()
```

Recognition is only restarted when `speechTriggerActive === true` **and** `appState` is `idle` or `recording`. It stops (and does not restart) in `countdown` and `replay` so stray speech on the course does not restart anything.

### Handling the `onerror` event

| Error code | Cause | Action |
|---|---|---|
| `not-allowed` | Mic permission denied | Show ⚠ on button, disarm |
| `service-not-allowed` | **Siri is disabled** in iOS Settings | Show ⚠ on button, disarm — cannot recover from web |
| `network` | No internet connection | Show ⚠ on button, disarm |
| `no-speech` | Silence timeout | Restart recognition (same as `onend`) |
| `aborted` | `recognition.abort()` called | Do nothing (intentional stop) |

---

## UI / visual feedback

| State | Visual |
|---|---|
| Disarmed | 🎤 icon in dim colour |
| Armed / listening | 🎤 icon in white; button gets `.stt-listening` class |
| Word recognized | Brief green flash on the button before state advances |
| Error / unsupported | Button shows ⚠, disarms automatically |

No dwell ring needed — recognition fires instantly when the word is heard.

---

## Interaction with other triggers

- The voice trigger coexists with the face trigger and tap/key triggers
- When `startCountdown()` or `stopRecording()` is called, recognition is stopped first (`stopSpeechDetection()`) to avoid a double-trigger on the following `onend` restart
- `stopSpeechDetection()` should also be called from `ui.js → setState()` when entering `countdown` or `replay`

---

## Pros

| # | Pro |
|---|-----|
| 1 | **Works at any distance** — speech carries clearly; one short word is enough |
| 2 | **No model download** — browser-native API, no extra assets |
| 3 | **Works with both cameras** — not limited to front camera like face trigger |
| 4 | **Natural for golfers** — no need to clap or gesture while holding the club |
| 5 | **Specific trigger words** — vastly fewer false positives than amplitude detection |
| 6 | **Lightweight** — no audio processing in JS; browser handles everything |
| 7 | **Coexists with existing triggers** — face trigger, tap, and keys still work |

## Cons

| # | Con |
|---|-----|
| 1 | **Requires internet (usually)** — cloud-based by default; on-device works for some locales on iOS 17+ but is not guaranteed |
| 2 | **Siri must be on** — if the user has Siri disabled in iOS Settings, the API is simply unavailable with no web-facing remedy |
| 3 | **Mic permission prompt** — browser will ask for mic access on first use |
| 4 | **iOS auto-stop** — recognition ends after ~5–7 s of silence and hits a ~60 s hard cap; mitigated by `onend` restart loop, but there is a brief ~150 ms deaf window between restarts |
| 5 | **Screen lock kills recognition** — locking the phone stops detection; the golfer must keep the screen on while waiting to swing |
| 6 | **Course chatter** — someone nearby saying "go" could start the countdown |
| 7 | **Wind noise** — strong wind can drown out speech or produce garbled transcripts |
| 8 | **Privacy** — audio is sent to Apple's servers; worth noting in any user-facing help text |
| 9 | **Unsupported browsers** — button should be hidden if `webkitSpeechRecognition` is absent (e.g., Firefox on desktop, older Android Chrome requires unprefixed `SpeechRecognition`) |
