// @ts-check
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(
    () => document.getElementById('version-badge')?.textContent !== '',
  );
  // Wait for the camera stream before any trigger (startCountdown guards on !stream)
  await page.waitForFunction(
    () => document.getElementById('preview')?.srcObject !== null,
    { timeout: 5000 },
  );
});

test('tap advances idle → countdown state', async ({ page }) => {
  await page.locator('#overlay').dispatchEvent('pointerdown');
  await expect(page.locator('#status-badge')).toHaveText('Get Ready');
  await expect(page.locator('#settings-btn')).toBeHidden();
  await expect(page.locator('#countdown')).toBeVisible();
});

test('tap during countdown returns to idle', async ({ page }) => {
  await page.locator('#overlay').dispatchEvent('pointerdown');
  await expect(page.locator('#status-badge')).toHaveText('Get Ready');
  await page.locator('#overlay').dispatchEvent('pointerdown');
  await expect(page.locator('#status-badge')).toHaveText('Ready');
  await expect(page.locator('#settings-btn')).toBeVisible();
});
