// @ts-check
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(
    () => document.getElementById('version-badge')?.textContent !== '',
  );
  await page.click('#settings-btn');
});

test('default active pills are 5s countdown, 1 replay, Front camera', async ({
  page,
}) => {
  await expect(page.locator('#grp-countdown .pill-btn.active')).toHaveText(
    '5 s',
  );
  await expect(page.locator('#grp-replays .pill-btn.active')).toHaveText('1');
  await expect(page.locator('#grp-camera .pill-btn.active')).toHaveText(
    'Front',
  );
});

test('clicking 3s makes it active and deactivates 5s', async ({ page }) => {
  await page.locator('#grp-countdown .pill-btn[data-value="3"]').click();
  await expect(
    page.locator('#grp-countdown .pill-btn[data-value="3"]'),
  ).toHaveClass(/active/);
  await expect(
    page.locator('#grp-countdown .pill-btn[data-value="5"]'),
  ).not.toHaveClass(/active/);
});

test('clicking 2 replays makes it active and deactivates 1', async ({
  page,
}) => {
  await page.locator('#grp-replays .pill-btn[data-value="2"]').click();
  await expect(
    page.locator('#grp-replays .pill-btn[data-value="2"]'),
  ).toHaveClass(/active/);
  await expect(
    page.locator('#grp-replays .pill-btn[data-value="1"]'),
  ).not.toHaveClass(/active/);
});
