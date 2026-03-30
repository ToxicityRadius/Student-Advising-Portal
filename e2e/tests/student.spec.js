// @ts-check
const { test, expect } = require('@playwright/test');
const { BASE, uiLogin, waitForStable } = require('./helpers');

test.describe.serial('Student Journey', () => {
  /** @type {import('@playwright/test').Page} */
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('can access login page', async () => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator('div[role="button"][aria-label="Login as Student"]')).toBeVisible();
  });

  test('student login and see dashboard', async () => {
    await uiLogin(page, 'student');
    // Should arrive at an authenticated route
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|complete-profile|verify-code|grades|notifications|settings)/);
  });

  test('student dashboard shows key sections', async () => {
    await page.goto(`${BASE}/dashboard`);
    await waitForStable(page);
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(100);
  });

  test('student can navigate to grades page', async () => {
    await page.goto(`${BASE}/grades`);
    await waitForStable(page);
    expect(page.url()).toContain('/grades');
  });

  test('student can navigate to notifications', async () => {
    await page.goto(`${BASE}/notifications`);
    await waitForStable(page);
    expect(page.url()).toContain('/notifications');
  });

  test('student can navigate to settings', async () => {
    await page.goto(`${BASE}/settings`);
    await waitForStable(page);
    expect(page.url()).toContain('/settings');
  });
});
