// @ts-check
const { test, expect } = require('@playwright/test');
const { BASE, uiLogin, waitForStable } = require('./helpers');

test.describe.serial('Role Boundary Smoke @smoke', () => {
  test('Super Admin can access global program and account controls', async ({ page }) => {
    await uiLogin(page, 'superadmin');

    await page.goto(`${BASE}/admin/programs`);
    await waitForStable(page);
    expect(page.url()).toContain('/admin/programs');

    await page.goto(`${BASE}/admin/transfer-ownership`);
    await waitForStable(page);
    expect(page.url()).toContain('/admin/transfer-ownership');

    await page.goto(`${BASE}/admin/users`);
    await waitForStable(page);
    expect(page.url()).toContain('/admin/users');
  });

  test('Program Chair is blocked from Transfer Ownership', async ({ page }) => {
    await uiLogin(page, 'admin');

    await page.goto(`${BASE}/admin/transfer-ownership`);
    await waitForStable(page);

    await expect(page).not.toHaveURL(/\/admin\/transfer-ownership$/);
  });

  test('Program Chair sees insufficient permission for account lifecycle controls', async ({
    page,
  }) => {
    await uiLogin(page, 'admin');

    await page.goto(`${BASE}/admin/users`);
    await waitForStable(page);

    await expect(page.getByText('Insufficient Permission').first()).toBeVisible();
  });

  test('Adviser can access assigned student workflows', async ({ page }) => {
    await uiLogin(page, 'adviser');

    await page.goto(`${BASE}/adviser/students`);
    await waitForStable(page);

    expect(page.url()).toContain('/adviser/students');
  });

  test('Student can access own dashboard and grades', async ({ page }) => {
    await uiLogin(page, 'student');

    await page.goto(`${BASE}/dashboard`);
    await waitForStable(page);
    expect(page.url()).toContain('/dashboard');

    await page.goto(`${BASE}/grades`);
    await waitForStable(page);
    expect(page.url()).toContain('/grades');
  });
});
