# Golf Replay

A web app for recording your golf swing and instantly replaying it — first at normal speed, then in slow motion.

**Live app:** <a href="https://larsselstad.github.io/golfreplay/" target="_blank">https://larsselstad.github.io/golfreplay/</a>

---

## How it works

1. Open the app — your camera preview fills the screen
2. **Tap the screen** (or press a keyboard key) to start a countdown — or arm the 👁 face trigger and look at the camera
3. Swing! Recording starts automatically when the countdown ends
4. Tap (or trigger) again to stop recording
5. The clip replays immediately: once at 1× speed, then once at 0.5× slow motion
6. The app returns to live preview, ready for the next swing

---

## Controls

| Action | Input |
|---|---|
| Start countdown / Stop recording / Skip replay | Tap the screen or press a keyboard key (Space, Enter, arrow keys) |
| Hands-free start | Tap 👁 to arm face trigger, then hold eye contact for 1.5 s |
| Hands-free stop | After swing, look back at camera and hold eye contact for 1 s |
| Switch camera on/off | Tap the 📷 button (bottom-right corner) |
| Open settings | Tap the ⚙️ gear icon |

---

## Face trigger

Tap the 👁 button (bottom-right corner, front camera only) to arm face trigger mode. A green dwell ring fills over 1.5 s while you look directly at the camera — when it completes, the countdown starts. The mode stays active across all shots in the session; tap 👁 again to disarm.

**Stopping with face trigger:** Once recording is running, look away to take your swing. After the swing, look back at the camera and hold eye contact for 1 s — recording stops automatically. The app won't trigger the stop while you're still looking at the camera at the start; it waits until your face has turned away (during the swing) before the stop gesture becomes active.

> **Tip:** Position the phone so your face fills a reasonable portion of the frame. Very small faces at long distances may not be detected reliably.

---

## Settings

| Setting | Options |
|---|---|
| Camera | Front / Back |
| Countdown | 3 / 5 / 10 seconds |
| Replay cycles | 1 / 2 / 3 |

---

## Using remotely (GitHub Pages)

Open **https://larsselstad.github.io/golfreplay/** in Safari on your iPad or iPhone.

> **Note:** Camera access requires HTTPS, which GitHub Pages provides automatically.

---

## Node.js version

This project uses [nvm](https://github.com/nvm-sh/nvm) to pin the Node.js version. The required version is specified in `.nvmrc`.

To switch to the correct version:

```bash
nvm use
```

If you don't have that version installed yet:

```bash
nvm install
```

---

## Code quality

[Biome](https://biomejs.dev) is used for linting and formatting.

```bash
npm run lint    # lint js/**/*.js and css/**/*.css
npm run format  # format js/**/*.js and css/**/*.css in place
npm run check   # lint + format together (use before committing)
```

---

## Running locally on Mac

1. Make sure [Node.js](https://nodejs.org) is installed (see above for the pinned version)
2. In the project folder, run:

```bash
npx serve .
```

3. Open **http://localhost:3000** in your browser

> **Note:** `localhost` is treated as a secure context by browsers, so camera access works without HTTPS.

---

## Files

| File | Description |
|---|---|
| `index.html` | HTML structure and asset references (versioned with `?v=N`) |
| `css/base.css` | Design tokens (CSS custom properties) and utility classes |
| `css/video.css` | Video element styles |
| `css/hud.css` | HUD overlay component classes (countdown, rec-dot, badges) |
| `css/controls.css` | Control button component classes (face-ring, cam-off) |
| `css/settings.css` | Settings panel component classes |
| `js/main.js` | Entry point — bootstraps the app and imports all other modules |
| `js/state.js` | Shared DOM refs, config (`cfg`), and mutable state object |
| `js/camera.js` | Camera startup (`startCamera`) |
| `js/ui.js` | `setState`, `showError`, `hideError` |
| `js/countdown.js` | Countdown logic |
| `js/recording.js` | MediaRecorder recording logic |
| `js/replay.js` | Replay playback logic |
| `js/settings.js` | Settings panel, camera toggle, pill button wiring |
| `js/face.js` | Face-trigger detection (face-api.js) |
| `js/input.js` | Keyboard and pointer input handling |
| `package.json` | npm scripts for linting, formatting, and testing |
| `biome.json` | Biome configuration |
| `playwright.config.js` | Playwright test configuration |
| `tests/` | Playwright test files |
| `AGENTS.md` | Project conventions for AI agents and contributors |

## Testing

```bash
npm test            # headless, for CI and quick checks
npm run test:ui     # opens the Playwright UI explorer (interactive, step through tests)
npm run test:slow   # runs in a visible browser window at half-speed (500 ms between actions)
```
