/**
 * Shared helpers for E2E tests.
 * Provides login, page navigation, and common assertions.
 */
const { expect } = require('@playwright/test');

const BASE = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const API = (process.env.E2E_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const API_ROOT = API.endsWith('/api') ? API.slice(0, -4) : API;

const CREDENTIALS = {
  student:  { email: 'student@tip.edu.ph',       password: 'Password123!' },
  adviser:  { email: 'adviser.cpe@tip.edu.ph',   password: 'Password123!' },
  admin:    { email: 'admin.cpe@tip.edu.ph',     password: 'Password123!' },
};

/**
 * Login as a given role via the API directly (faster than UI flow).
 * Sets the auth cookie on the browser context.
 */
async function apiLogin(page, role) {
  const { email, password } = CREDENTIALS[role];

  // Step 1: login → get verification code prompt or direct token
  const loginRes = await page.request.post(`${API}/auth/login`, {
    data: { email, password },
  });
  const loginBody = await loginRes.json();

  // If 2FA is required, we need to verify code.
  // In test/seeded accounts, verification may be bypassed or code is returned.
  if (loginRes.status() === 200 && loginBody.token) {
    // Direct login (no 2FA) — set cookie
    await page.context().addCookies([{
      name: 'token',
      value: loginBody.token,
      domain: 'localhost',
      path: '/',
    }]);
    return loginBody;
  }

  // 2FA flow — accounts may need code verification
  // For seeded accounts we'll use UI login as fallback
  return null;
}

/**
 * Login via the UI form — handles role selection cards and 2FA verification code step.
 */
async function uiLogin(page, role) {
  const { email, password } = CREDENTIALS[role];

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');

  // The login page first shows role selection cards:
  //   "Login as Student" and "Login as Faculty"
  // Adviser and admin both use the Faculty card.
  const roleLabel = role === 'student' ? 'Login as Student' : 'Login as Faculty';
  const roleCard = page.locator(`div[role="button"][aria-label="${roleLabel}"]`);
  if (await roleCard.isVisible().catch(() => false)) {
    await roleCard.click();
    await page.waitForLoadState('networkidle');
  }

  // Fill login form
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.locator('button[type="submit"].login-button').click();

  // Wait for post-login state:
  // 1) URL redirect to an authenticated page, OR
  // 2) student onboarding modal displayed on /login.
  const redirected = page
    .waitForURL(/\/(verify-code|dashboard|admin|adviser|grades|notifications|settings)/, {
      timeout: 15000,
    })
    .then(() => true)
    .catch(() => false);

  const onboardingModal = page
    .getByText('Complete Your Academic Profile')
    .waitFor({ state: 'visible', timeout: 15000 })
    .then(() => true)
    .catch(() => false);

  const [didRedirect, hasOnboardingModal] = await Promise.all([redirected, onboardingModal]);

  if (!didRedirect && !hasOnboardingModal) {
    throw new Error('Login did not redirect and no onboarding modal was shown');
  }
}

/**
 * Wait for the page to stabilize (no pending network requests).
 */
async function waitForStable(page) {
  await page.waitForLoadState('networkidle');
}

module.exports = { BASE, API, API_ROOT, CREDENTIALS, apiLogin, uiLogin, waitForStable };
