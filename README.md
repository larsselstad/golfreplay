# Golf Replay

A web app for recording your golf swing and instantly replaying it — first at normal speed, then in slow motion.

**Live app:** https://larsselstad.github.io/golfreplay/

---

## What's new in v4

- **Removed** Bluetooth button detection (iOS Safari intercepts volume key events at the OS level — it never worked reliably on iPhone)
- **Added** face trigger: tap the 👁 button to arm hands-free mode. Hold eye contact with the camera for 1.5 s and the countdown starts automatically. The mode stays active for the whole session — no need to re-arm between shots.

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
| Open settings | Tap the ⚙️ gear icon |

---

## Face trigger

Tap the 👁 button (bottom-right corner, front camera only) to arm face trigger mode. A green dwell ring fills over 1.5 s while you look directly at the camera — when it completes, the countdown starts. The mode stays active across all shots in the session; tap 👁 again to disarm.

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
| `style.css` | All styles |
| `app.js` | All app logic |
| `AGENTS.md` | Project conventions for AI agents and contributors |
