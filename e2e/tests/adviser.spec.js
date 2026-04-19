// @ts-check
const { test, expect } = require('@playwright/test');
const { BASE, uiLogin, waitForStable } = require('./helpers');

test.describe.serial('Adviser Journey', () => {
  /** @type {import('@playwright/test').Page} */
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('adviser login and see dashboard', async () => {
    await uiLogin(page, 'adviser');
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|verify-code|adviser)/);
  });

  test('adviser can access student list', async () => {
    await page.goto(`${BASE}/adviser/students`);
    await waitForStable(page);
    expect(page.url()).toContain('/adviser/students');
  });

  test('adviser student list shows content', async () => {
    await page.goto(`${BASE}/adviser/students`);
    await waitForStable(page);
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('adviser can navigate to notifications', async () => {
    await page.goto(`${BASE}/notifications`);
    await waitForStable(page);
    expect(page.url()).toContain('/notifications');
  });
});
