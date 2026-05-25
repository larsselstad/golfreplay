// @ts-check
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Wait until the JS has run and the version badge is populated
  await page.waitForFunction(
    () => document.getElementById('version-badge')?.textContent !== '',
  );
});

test('version badge shows v17', async ({ page }) => {
  await expect(page.locator('#version-badge')).toHaveText('v17');
});

test('status badge shows Ready', async ({ page }) => {
  await expect(page.locator('#status-badge')).toHaveText('Ready');
});

test('settings button is visible', async ({ page }) => {
  await expect(page.locator('#settings-btn')).toBeVisible();
});

test('rec-indicator is hidden', async ({ page }) => {
  await expect(page.locator('#rec-indicator')).toBeHidden();
});

test('countdown is hidden', async ({ page }) => {
  await expect(page.locator('#countdown')).toBeHidden();
});

test('replay-info is hidden', async ({ page }) => {
  await expect(page.locator('#replay-info')).toBeHidden();
});
