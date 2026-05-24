# AGENTS.md — Project conventions for AI agents and contributors

## Project overview

Golf Replay is a single-page web app (plain HTML + CSS + JS, no build tool) that lets golfers record a swing and immediately replay it at normal speed then slow motion. It is hosted as a static site on GitHub Pages at **https://larsselstad.github.io/golfreplay/**.

## File structure

| File | Role |
|---|---|
| `index.html` | All markup, including the HUD, settings panel, and overlay elements |
| `css/base.css` | Design tokens (`:root` CSS custom properties) and all utility classes |
| `css/video.css` | Video element base styles |
| `css/hud.css` | HUD overlay component classes |
| `css/controls.css` | Control button component classes |
| `css/settings.css` | Settings panel component classes |
| `js/main.js` | Entry point — bootstraps app (version badge, `setState('idle')`, `startCamera()`) and imports all modules |
| `js/state.js` | `cfg`, `APP_VERSION`, `saveCfg`, and `state` object (all mutable state) |
| `js/camera.js` | `startCamera` |
| `js/ui.js` | `setState`, `showError`, `hideError` |
| `js/countdown.js` | Countdown logic |
| `js/recording.js` | MediaRecorder recording logic |
| `js/replay.js` | Replay playback logic |
| `js/settings.js` | Settings panel — open/close, pill button wiring, `applyCamera` |
| `js/controls.js` | HUD buttons — camera toggle (`toggleCameraFeed`) and face trigger button |
| `js/face.js` | Face-trigger detection (face-api.js) |
| `js/recordtrigger.js` | Document keyboard and pointer listeners — fires `onTrigger()` to advance state |
| `package.json` | npm scripts for linting and formatting (Biome) |
| `biome.json` | Biome configuration |

There is no build step. Modules are loaded as native ES modules via `<script type="module">`. Editing source files and pushing to `main` is all that is required to deploy.

## Current version: `v14`

### Version number — what it is and where to update it

The version number is a simple string (e.g. `v2`, `v3`) used to bust the browser cache and help users confirm they are running the latest code. It appears in three places and **must be kept in sync**:

| Location | What to change |
|---|---|
| `index.html` CSS links | `href="css/base.css?v=N"` etc. → increment `N` on each link |
| `index.html` line with `main.js` | `src="js/main.js?v=N"` → increment `N` |
| `js/state.js` near the top | `const APP_VERSION = 'vN';` → increment `N` |

The version badge is displayed in the bottom-left corner of the app at runtime.

> **Note on module caching:** Only `main.js` (the entry point) is cache-busted via the query string. Module-to-module imports (e.g. `import './camera.js'`) rely on the browser's ETag/`Last-Modified` revalidation, which is sufficient for this project. A build tool with content-hashed filenames would be required for true per-module cache busting.

**Rule: increment the version whenever any source file changes.**

Example — bumping from `v13` to `v14`:

```html
<!-- index.html -->
<link rel="stylesheet" href="css/base.css?v=14">
<link rel="stylesheet" href="css/video.css?v=14">
<link rel="stylesheet" href="css/hud.css?v=14">
<link rel="stylesheet" href="css/controls.css?v=14">
<link rel="stylesheet" href="css/settings.css?v=14">
<script type="module" src="js/main.js?v=14"></script>
```

```js
// js/state.js
export const APP_VERSION = 'v14';
```

## App states

The app cycles through four states managed by `appState`:

| State | Description |
|---|---|
| `idle` | Camera preview visible, waiting for input |
| `countdown` | Counting down before recording starts |
| `recording` | MediaRecorder active, timer running |
| `replay` | Recorded clip playing back (normal speed then slow motion) |

Any trigger (screen tap, keyboard key, or remote button key) advances the state machine via `onTrigger()`.

## HUD buttons

| Button | Element | Visible when |
|---|---|---|
| Settings | `#settings-btn` | idle, countdown (hidden during recording / replay) |
| Camera toggle | `#cam-toggle-btn` | idle only — turns camera feed on/off; gets `.cam-off` class when off |
| Face trigger | `#face-trigger-wrap` / `#face-trigger-btn` | idle, front camera only |

## Face trigger (hands-free)

The 👁 button (bottom-right, front camera only) enables hands-free operation using face-api.js:

- **Start:** In `idle` state, look at the camera for **1.5 s** (`FACE_DWELL_MS`) — countdown starts automatically.
- **Stop:** In `recording` state with face trigger active, the app waits until the face is no longer frontal (i.e. the golfer looks away during the swing — `faceRecGone = true`). Once the face has looked away, looking back at the camera for **1 s** (`FACE_STOP_DWELL_MS`) stops recording.

The `faceRecGone` flag is the "swing gate": it prevents the stop gesture from firing while the golfer is still facing the camera at the start of the recording. It is reset to `false` whenever recording starts or face detection stops.

## Input / trigger keys

`TRIGGER_KEYS` is a `Set` of `KeyboardEvent.key` values that all fire `onTrigger()`:

- Built-in: `' '`, `'Enter'`, `'ArrowRight'`, `'ArrowLeft'`, `'ArrowUp'`, `'ArrowDown'`, `'AudioVolumeUp'`, `'AudioVolumeDown'`

To add a new built-in trigger key, add it to the `TRIGGER_KEYS` set declaration in `js/recordtrigger.js`.

## Config persistence

User settings (`camera`, `countdown`, `replays`) are persisted to `localStorage` under the key `cfg` as a JSON object. The defaults are `{ camera: 'user', countdown: 5, replays: 1 }`. On startup, `js/state.js` loads and merges saved values over the defaults. `js/settings.js` calls `saveCfg()` after every pill change so settings survive page reloads.

## Tooling

[Biome](https://biomejs.dev) is used for linting and formatting. There is no bundler or transpiler — the plain-file deployment model is unchanged.

```bash
npm run lint    # lint js/**/*.js and css/**/*.css
npm run format  # format js/**/*.js and css/**/*.css in place
npm run check   # lint + format together (use before committing)
npm test        # run Playwright tests headless
```

Run `npm run check` before committing to keep the code consistently formatted and lint-free.

## Testing

[Playwright](https://playwright.dev) is used for integration tests. Tests run against a local `serve` instance of `index.html` with Chromium using fake media streams so `getUserMedia` works headless.

```bash
npm test            # headless, for CI and quick checks
npm run test:ui     # opens the Playwright UI explorer (interactive, step through tests)
npm run test:slow   # runs in a visible browser window at half-speed (500 ms between actions)
```

Run `npm test` before committing to verify no regressions. Add new test files under `tests/` alongside any feature changes.

## CSS architecture

Styles live in `css/` as five focused files loaded in order:

| File | Contents |
|---|---|
| `css/base.css` | `:root` design tokens + all single-purpose utility classes |
| `css/video.css` | Video element base styles |
| `css/hud.css` | HUD overlay component classes |
| `css/controls.css` | Control button component classes |
| `css/settings.css` | Settings panel component classes |

**Utility-first approach:** Elements are styled primarily with small, single-purpose classes (e.g. `flex`, `items-center`, `gap-1`, `glass`, `abs`, `inset-0`). Component classes (e.g. `.rec-dot`, `.settings-panel`) handle only what can't be expressed with utilities.

**No ID selectors.** All CSS rules use class selectors only. IDs remain in HTML for `getElementById` refs in JS but are never targeted in CSS.

**Design tokens** are CSS custom properties defined in `:root` in `base.css`:
- Spacing: `--space-half` (4px) through `--space-4` (32px) on an 8 px grid
- Colours: `--color-white`, `--color-red`, `--color-dim`
- Glass effect: `--glass-bg`, `--glass-blur`, `--glass-border`
- Safe-area helpers, z-index scale, border-radii

**`.hidden` pattern:** JS adds/removes `.hidden` to show/hide elements. `.hidden { display: none !important }` is defined after all layout utilities in `base.css`, so it always wins in the cascade. Elements that display as `flex` carry the `.flex` class permanently; `.hidden` overrides it when present.



## Coding conventions

- **No bundler or transpiler.** Do not introduce webpack, Rollup, Babel, or similar tools.
- **ES modules.** All JS lives in `js/` as native ES modules. `js/main.js` is the entry point.
- **No comments for obvious code.** Only add comments for non-obvious logic or constraints.
- **CSS custom properties throughout.** All spacing, colour, and radius values use tokens from `:root` in `css/base.css`. Do not inline raw values when a token exists.
- **No ID selectors in CSS.** Use class selectors only.
- **DOM refs live in their module.** Each module calls `document.getElementById(...)` locally for the elements it needs. `state.js` holds only shared mutable state — no DOM refs. For elements shared by several modules, each module defines its own local binding.
- **iOS Safari is the primary target.** Test camera, recording, and replay on Safari on iPhone.
