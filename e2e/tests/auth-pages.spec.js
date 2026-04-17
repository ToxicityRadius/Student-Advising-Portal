// @ts-check
const { test, expect } = require('@playwright/test');
const { BASE } = require('./helpers');

test.describe('Additional Auth Pages', () => {
  test('forgot-password page renders key controls', async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`);

    await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible();
    await expect(page.getByPlaceholder('Email Address')).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to login/i })).toBeVisible();
  });

  test('reset-password page renders form fields', async ({ page }) => {
    await page.goto(`${BASE}/reset-password/sample-token`);

    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
    await expect(page.getByLabel(/^New Password$/)).toBeVisible();
    await expect(page.getByLabel(/^Confirm New Password$/)).toBeVisible();
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible();
  });

  test('change-password page guards unauthenticated access', async ({ page }) => {
    await page.goto(`${BASE}/change-password`);

    await expect(page.getByRole('heading', { name: /change password/i })).toBeVisible();
    await expect(
      page.getByText(/you must change your password before continuing/i),
    ).toBeVisible();

    await page.locator('input[type="password"]').first().fill('Password123!');
    await page.locator('input[type="password"]').nth(1).fill('Password123!');
    await page.getByRole('button', { name: /update password/i }).click();

    await expect(page.getByText(/session has expired|log in again|original login password/i)).toBeVisible();
  });

  test('change-email page guards unauthenticated access', async ({ page }) => {
    await page.goto(`${BASE}/change-email`);

    await expect(page.getByRole('heading', { name: /set program chair email/i })).toBeVisible();
    await expect(
      page.getByText(/must have a verified institutional email before you can access the portal/i),
    ).toBeVisible();

    await page.getByPlaceholder(/lastname\.cpe@tip\.edu\.ph/i).fill('test.cpe@tip.edu.ph');
    await page.getByRole('button', { name: /send verification code/i }).click();

    await expect(page.getByText(/session has expired|log in again/i)).toBeVisible();
  });

  test('verify-code route redirects to login when state is missing', async ({ page }) => {
    await page.goto(`${BASE}/verify-code`);
    await page.waitForURL('**/login');

    await expect(page.getByRole('button', { name: /login as student/i })).toBeVisible();
  });

  test('activate-account route shows error state for invalid token', async ({ page }) => {
    await page.goto(`${BASE}/activate/invalid-token`);

    await expect(page.getByRole('heading', { name: /account activation/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /back to login/i })).toBeVisible();
  });
});
