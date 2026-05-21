# AGENTS.md — Project conventions for AI agents and contributors

## Project overview

Golf Replay is a single-page web app (plain HTML + CSS + JS, no build tool) that lets golfers record a swing and immediately replay it at normal speed then slow motion. It is hosted as a static site on GitHub Pages at **https://larsselstad.github.io/golfreplay/**.

## File structure

| File | Role |
|---|---|
| `index.html` | All markup, including the HUD, settings panel, and overlay elements |
| `style.css` | All styles |
| `app.js` | All application logic — one IIFE, no modules or bundler |

There is no build step. Editing the three source files and pushing to `main` is all that is required to deploy.

## Current version: `v6`

### Version number — what it is and where to update it

The version number is a simple string (e.g. `v2`, `v3`) used to bust the browser cache and help users confirm they are running the latest code. It appears in three places and **must be kept in sync**:

| Location | What to change |
|---|---|
| `index.html` line with `style.css` | `href="style.css?v=N"` → increment `N` |
| `index.html` line with `app.js` | `src="app.js?v=N"` → increment `N` |
| `app.js` near the top of the IIFE | `const APP_VERSION = 'vN';` → increment `N` |

The version badge is displayed in the bottom-left corner of the app at runtime. This lets users (and developers) verify that the latest deployment is actually running in their browser.

**Rule: increment the version whenever any of the three source files change.**

Example — bumping from `v2` to `v3`:

```html
<!-- index.html -->
<link rel="stylesheet" href="style.css?v=3">
<script src="app.js?v=3"></script>
```

```js
// app.js
const APP_VERSION = 'v3';
```

## App states

The app cycles through four states managed by `appState`:

| State | Description |
|---|---|
| `idle` | Camera preview visible, waiting for input |
| `countdown` | Counting down before recording starts |
| `recording` | MediaRecorder active, timer running |
| `replay` | Recorded clip playing back (normal speed then slow motion) |

Any trigger (screen tap, keyboard key, or Bluetooth button key) advances the state machine via `onTrigger()`.

## Face trigger (hands-free)

The 👁 button (bottom-right, front camera only) enables hands-free operation using face-api.js:

- **Start:** In `idle` state, look at the camera for **1.5 s** (`FACE_DWELL_MS`) — countdown starts automatically.
- **Stop:** In `recording` state with face trigger active, the app waits until the face is no longer frontal (i.e. the golfer looks away during the swing — `faceRecGone = true`). Once the face has looked away, looking back at the camera for **1 s** (`FACE_STOP_DWELL_MS`) stops recording.

The `faceRecGone` flag is the "swing gate": it prevents the stop gesture from firing while the golfer is still facing the camera at the start of the recording. It is reset to `false` whenever recording starts or face detection stops.

## Input / trigger keys

`TRIGGER_KEYS` is a `Set` of `KeyboardEvent.key` values that all fire `onTrigger()`:

- Built-in: `' '`, `'Enter'`, `'ArrowRight'`, `'ArrowLeft'`, `'ArrowUp'`, `'ArrowDown'`, `'AudioVolumeUp'`, `'AudioVolumeDown'`
- User-learned: persisted in `localStorage` under the key `btTriggerKey`

To add a new built-in trigger key, add it to the `TRIGGER_KEYS` set declaration in `app.js`.

## Bluetooth button detection

Users can teach the app a new key via **Settings → Bluetooth Button → Detect button press**. The app opens a full-screen overlay, listens for the next `keydown` in capture phase, saves the detected key to `localStorage`, and registers it in `TRIGGER_KEYS`. The saved key survives page reloads.

## Coding conventions

- **No build tool.** Do not introduce npm scripts, bundlers, or transpilers unless absolutely necessary.
- **Single IIFE.** All JS lives inside the immediately-invoked function expression in `app.js`. No ES modules.
- **No comments for obvious code.** Only add comments for non-obvious logic or constraints.
- **CSS custom properties are not used.** Colours and values are inlined; keep that consistent.
- **iOS Safari is the primary target.** Test camera, recording, and replay on Safari on iPhone.
