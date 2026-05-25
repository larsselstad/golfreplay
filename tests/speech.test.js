// @ts-check
const { test, expect } = require('@playwright/test');

// Headless Chromium doesn't expose SpeechRecognition, so we inject a fake
// implementation that satisfies isSpeechSupported() and doesn't throw on start().
// Each call to start() stores the instance in window.fakeRecognitionInstance so
// tests can fire onresult events to simulate voice commands.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class FakeRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      onresult = null;
      onend = null;
      onerror = null;
      start() {
        // @ts-ignore
        window.fakeRecognitionInstance = this;
      }
      abort() {}
      stop() {}
    }
    // @ts-ignore
    window.SpeechRecognition = FakeRecognition;
    // @ts-ignore
    window.webkitSpeechRecognition = FakeRecognition;
  });
  await page.goto('/');
  await page.waitForFunction(
    () => document.getElementById('version-badge')?.textContent !== '',
  );
});

/** Helper: fire a fake speech result with the given transcript */
async function fireSpeechResult(page, transcript) {
  await page.evaluate((t) => {
    // @ts-ignore
    const rec = window.fakeRecognitionInstance;
    if (rec?.onresult) {
      rec.onresult({ results: [{ 0: { transcript: t } }] });
    }
  }, transcript);
}

test('speech trigger button is visible', async ({ page }) => {
  await expect(page.locator('#speech-trigger-btn')).toBeVisible();
});

test('clicking speech trigger activates: stt-listening class added and instruction updated', async ({
  page,
}) => {
  await page.locator('#speech-trigger-btn').click();
  await expect(page.locator('#speech-trigger-btn')).toHaveClass(/stt-listening/);
  await expect(page.locator('#instruction')).toHaveText('Say "start" to start');
});

test('clicking speech trigger again deactivates: class removed and instruction reverts', async ({
  page,
}) => {
  await page.locator('#speech-trigger-btn').click();
  await page.locator('#speech-trigger-btn').click();
  await expect(page.locator('#speech-trigger-btn')).not.toHaveClass(
    /stt-listening/,
  );
  await expect(page.locator('#instruction')).toHaveText(
    'Tap anywhere or press button to start',
  );
});

// --- voice command flow tests ---

test('saying "start" while speech trigger is armed starts the countdown', async ({
  page,
}) => {
  // Wait for camera stream so startCountdown() doesn't bail early
  await page.waitForFunction(
    () => document.getElementById('preview')?.srcObject !== null,
    { timeout: 5000 },
  );
  await page.locator('#speech-trigger-btn').click();
  await fireSpeechResult(page, 'start');
  await expect(page.locator('#status-badge')).toHaveText('Get Ready');
});

test('saying "stop" during recording stops recording and shows replay', async ({
  page,
}) => {
  // Use 1-second countdown so the test doesn't wait 5 seconds
  await page.addInitScript(() => {
    localStorage.setItem(
      'cfg',
      JSON.stringify({ camera: 'user', countdown: 1, replays: 1 }),
    );
  });
  await page.reload();
  await page.waitForFunction(
    () => document.getElementById('version-badge')?.textContent !== '',
  );
  await page.waitForFunction(
    () => document.getElementById('preview')?.srcObject !== null,
    { timeout: 5000 },
  );

  await page.locator('#speech-trigger-btn').click();
  await fireSpeechResult(page, 'start');

  // Wait for recording state (countdown ~1s + GO! flash ~0.6s)
  await expect(page.locator('#rec-indicator')).toBeVisible({ timeout: 4000 });

  await fireSpeechResult(page, 'stop');

  await expect(page.locator('#replay-info')).toBeVisible({ timeout: 3000 });
});
