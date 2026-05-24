// @ts-check
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(
    () => document.getElementById('version-badge')?.textContent !== '',
  );
  await page.click('#settings-btn');
});

test('default checked radios are 5s countdown, 1 replay, Front camera', async ({
  page,
}) => {
  await expect(
    page.locator('input[name="countdown"][value="5"]'),
  ).toBeChecked();
  await expect(
    page.locator('input[name="replays"][value="1"]'),
  ).toBeChecked();
  await expect(
    page.locator('input[name="camera"][value="user"]'),
  ).toBeChecked();
});

test('selecting 3s makes it checked and deselects 5s', async ({ page }) => {
  await page.locator('input[name="countdown"][value="3"]').check();
  await expect(
    page.locator('input[name="countdown"][value="3"]'),
  ).toBeChecked();
  await expect(
    page.locator('input[name="countdown"][value="5"]'),
  ).not.toBeChecked();
});

test('selecting 2 replays makes it checked and deselects 1', async ({
  page,
}) => {
  await page.locator('input[name="replays"][value="2"]').check();
  await expect(page.locator('input[name="replays"][value="2"]')).toBeChecked();
  await expect(
    page.locator('input[name="replays"][value="1"]'),
  ).not.toBeChecked();
});

test('countdown selection persists across page reload', async ({ page }) => {
  await page.locator('input[name="countdown"][value="3"]').check();
  await page.click('#done-btn');
  await page.reload();
  await page.waitForFunction(
    () => document.getElementById('version-badge')?.textContent !== '',
  );
  await page.click('#settings-btn');
  await expect(
    page.locator('input[name="countdown"][value="3"]'),
  ).toBeChecked();
});

test('replays selection persists across page reload', async ({ page }) => {
  await page.locator('input[name="replays"][value="2"]').check();
  await page.click('#done-btn');
  await page.reload();
  await page.waitForFunction(
    () => document.getElementById('version-badge')?.textContent !== '',
  );
  await page.click('#settings-btn');
  await expect(page.locator('input[name="replays"][value="2"]')).toBeChecked();
});
