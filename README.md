# Golf Replay

A web app for recording your golf swing and instantly replaying it — first at normal speed, then in slow motion.

**Live app:** https://larsselstad.github.io/golfreplay/

---

## How it works

1. Open the app — your camera preview fills the screen
2. Press your Bluetooth remote button (or tap the screen) to start a countdown
3. Swing! Recording starts automatically when the countdown ends
4. Press again (or tap) to stop recording
5. The clip replays immediately: once at 1× speed, then once at 0.5× slow motion
6. The app returns to live preview, ready for the next swing

---

## Controls

| Action | Input |
|---|---|
| Start countdown / Stop recording / Skip replay | Bluetooth remote (Space, Enter, arrow keys) or tap the screen |
| Open settings | Tap the ⚙️ gear icon |

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
| `index.html` | HTML structure |
| `style.css` | All styles |
| `app.js` | All app logic |
