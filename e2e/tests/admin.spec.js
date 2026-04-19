// @ts-check
const { test, expect } = require('@playwright/test');
const { BASE, uiLogin, waitForStable } = require('./helpers');

test.describe.serial('Admin Journey', () => {
  /** @type {import('@playwright/test').Page} */
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('admin login and see dashboard', async () => {
    await uiLogin(page, 'admin');
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|verify-code|admin)/);
  });

  test('admin can access curriculum management', async () => {
    await page.goto(`${BASE}/admin/curriculum`);
    await waitForStable(page);
    expect(page.url()).toContain('/admin/curriculum');
  });

  test('admin can access term management', async () => {
    await page.goto(`${BASE}/admin/terms`);
    await waitForStable(page);
    expect(page.url()).toContain('/admin/terms');
  });

  test('admin can access forecast', async () => {
    await page.goto(`${BASE}/admin/forecast`);
    await waitForStable(page);
    expect(page.url()).toContain('/admin/forecast');
  });

  test('API docs page is accessible', async () => {
    await page.goto('http://localhost:5000/api/docs/');
    await waitForStable(page);
    const title = await page.title();
    expect(title).toContain('Student Advising Portal');
  });

  test('health endpoint returns OK', async () => {
    const response = await page.request.get('http://localhost:5000/api/health');
    expect(response.ok()).toBeTruthy();
  });
});
