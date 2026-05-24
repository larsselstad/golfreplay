// @ts-check
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(
    () => document.getElementById('version-badge')?.textContent !== '',
  );
});

test('click gear opens panel and shows backdrop', async ({ page }) => {
  await page.click('#settings-btn');
  await expect(page.locator('#settings-panel')).toHaveClass(/open/);
  await expect(page.locator('#settings-backdrop')).toBeVisible();
});

test('click Done closes panel', async ({ page }) => {
  await page.click('#settings-btn');
  await page.click('#done-btn');
  await expect(page.locator('#settings-panel')).not.toHaveClass(/open/);
  await expect(page.locator('#settings-backdrop')).toBeHidden();
});

test('click backdrop closes panel', async ({ page }) => {
  await page.click('#settings-btn');
  await page.locator('#settings-backdrop').dispatchEvent('click');
  await expect(page.locator('#settings-panel')).not.toHaveClass(/open/);
  await expect(page.locator('#settings-backdrop')).toBeHidden();
});

test('tap outside settings closes panel', async ({ page }) => {
  await page.click('#settings-btn');
  // Tap on overlay area (not settings panel / backdrop / hud-bottom-right)
  await page.locator('#overlay').dispatchEvent('pointerdown');
  await expect(page.locator('#settings-panel')).not.toHaveClass(/open/);
  await expect(page.locator('#settings-backdrop')).toBeHidden();
});
