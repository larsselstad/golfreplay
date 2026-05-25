# Idea: White Glove Swipe Trigger

**Problem:** The face-trigger (👁) requires the user to be close enough for face detection to work. When practising golf with the phone on a tripod several metres away, recording cannot be started hands-free.

## Proposed solution

Add a **glove-swipe trigger** (🎯 button). The golfer holds up their **white golf glove** on the left side of the camera frame and sweeps it to the right. The app detects the bright white blob crossing the frame and starts the countdown automatically.

### How the gesture works

1. Tap 🎯 to arm the trigger (button turns active, ring appears)
2. Walk to ball position
3. Raise white glove on the **left** side of the frame
4. Sweep it to the **right** — countdown starts
5. Take the swing; recording begins after countdown
6. Watch the replay, then repeat

### Detection algorithm (no ML, instant)

- Sample a ~160 px wide canvas from the video every **150 ms**
- Convert pixels to grayscale; find all **bright pixels** (brightness > 210 / 255)
- Compute the weighted centroid x-position of the bright cluster (0.0 = left edge, 1.0 = right edge)
- Maintain a **2-second rolling history** of (timestamp, centroid_x)
- **Trigger** when centroid moves from < 0.40 → > 0.60 within the history window
- Visual feedback: the dwell ring fills proportionally as the glove sweeps across the frame

---

## Pros

| # | Pro |
|---|-----|
| 1 | **Works at any distance** — as long as the glove is visible to the camera, it works from 5 m, 10 m, or more |
| 2 | **No model download** — pure canvas pixel maths; available instantly when the button is tapped |
| 3 | **Deliberate gesture** — left-to-right swipe of a bright object is specific enough to avoid most accidental triggers |
| 4 | **Works with both cameras** — front and rear; the face-trigger is front-only |
| 5 | **White glove is a natural prop** — golfers already wear it; no extra hardware needed |
| 6 | **Visual feedback** — the ring fills as the glove moves, so the user knows the gesture is being recognised |
| 7 | **Lightweight** — 160 px canvas + brightness threshold; negligible CPU vs face-api.js |

## Cons

| # | Con |
|---|-----|
| 1 | **Bright backgrounds can cause false positives** — a white sky, white fence, or bright sunlight on the ground may produce enough bright pixels to confuse the centroid |
| 2 | **Glove must be in frame** — if the camera is far away and the field of view is wide, the glove may be too small to register enough bright pixels |
| 3 | **Directional assumption** — fixed left → right; golfers who set up the camera on the opposite side may find it awkward |
| 4 | **Threshold is fixed** — lighting conditions vary; what works indoors or overcast may not work in bright sunlight where the whole scene is bright |
| 5 | **Other bright objects trigger it** — e.g. a white cap, white shirt, or a passing white car could trigger unintentionally |
| 6 | **Only starts recording** — there is no matching "stop" gesture; the user must still walk back to tap the screen to stop |
| 7 | **Requires a white glove** — works best with a white glove; less reliable with a dark or multi-colour glove |
