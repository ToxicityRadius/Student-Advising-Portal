const { chromium } = require('@playwright/test');
const assert = require('assert');

const BASE = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

async function login(page, role, email, password) {
  const roleLabel = role === 'student' ? 'Login as Student' : 'Login as Faculty';

  await page.goto(`${BASE}/login`);
  await page.locator(`div[role="button"][aria-label="${roleLabel}"]`).click();
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/auth/login') && response.request().method() === 'POST',
    { timeout: 30000 },
  );

  await page.locator('button[type="submit"].login-button').click();

  const loginResponse = await loginResponsePromise;
  const loginBody = await loginResponse.json().catch(() => ({}));
  assert.strictEqual(
    loginResponse.status(),
    200,
    `Login failed: ${loginBody.message || loginResponse.status()}`,
  );

  await page.waitForURL(/\/(dashboard|admin|adviser|grades|notifications|settings)/, {
    timeout: 30000,
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('pageerror', (error) => {
    console.error('BROWSER ERROR:', error.message);
  });

  try {
    console.log('Logging in as adviser...');
    await login(page, 'faculty', 'adviser.cpe@tip.edu.ph', 'Password123!');

    console.log('Finding linked Sample Student SAR...');
    await page.goto(`${BASE}/adviser/students?scope=all&programId=`);
    await page.waitForSelector('table', { timeout: 30000 });
    await page.fill(
      'input[placeholder="Search by student name or student number"]',
      'Sample Student',
    );

    const sampleStudentRow = page.locator('tr', { hasText: 'Sample Student' }).first();
    await sampleStudentRow.waitFor({ state: 'visible', timeout: 30000 });

    const sampleStudentLink = sampleStudentRow.locator('a[href*="/adviser/students/"]').first();
    await sampleStudentLink.waitFor({ state: 'visible', timeout: 30000 });

    const sarHref = await sampleStudentLink.getAttribute('href');
    assert(sarHref, 'Sample Student SAR link was not found');

    const sarId = sarHref.match(/\/adviser\/students\/(\d+)/)?.[1];
    assert(sarId, `Could not parse SAR id from ${sarHref}`);

    console.log(`Opening grade entry for SAR ${sarId}...`);
    await page.goto(`${BASE}/adviser/students/${sarId}/grades`);
    await page.waitForSelector('.grade-entry-table', { timeout: 30000 });

    const gradeInput = page
      .locator('.grade-entry-table input[type="number"]:not([disabled])')
      .first();
    await gradeInput.waitFor({ state: 'visible', timeout: 30000 });
    await gradeInput.fill('1.50');

    console.log('Saving grades...');
    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/sars/${sarId}/study-plan/active-version/grades`) &&
        response.request().method() === 'PUT',
      { timeout: 60000 },
    );

    await page.getByRole('button', { name: 'Save Grades' }).click();
    const saveResponse = await saveResponsePromise;
    const saveBody = await saveResponse.json().catch(() => ({}));

    assert.strictEqual(
      saveResponse.status(),
      200,
      `Grade save failed: ${saveBody.message || saveResponse.status()}`,
    );

    await page.getByText('Grades saved successfully.').waitFor({
      state: 'visible',
      timeout: 15000,
    });

    console.log(`Grade Entry workflow passed for ${sarHref}.`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('Grade Entry workflow failed:', error);
  process.exitCode = 1;
});
