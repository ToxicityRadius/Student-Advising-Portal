/**
 * Shared helpers for E2E tests.
 * Provides login, page navigation, and common assertions.
 */
const { expect } = require('@playwright/test');

const BASE = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const API = (process.env.E2E_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const API_ROOT = API.endsWith('/api') ? API.slice(0, -4) : API;
const USE_MOCK_API = process.env.E2E_USE_MOCK_API === 'true';

const CREDENTIALS = {
  superadmin: {
    email: process.env.E2E_SUPERADMIN_EMAIL || process.env.SUPERADMIN_EMAIL || 'superadmin.cpe@tip.edu.ph',
    password: process.env.E2E_SUPERADMIN_PASSWORD || process.env.SUPERADMIN_PASSWORD || 'Password123!',
  },
  student: { email: 'student@tip.edu.ph', password: 'Password123!' },
  adviser: { email: 'adviser.cpe@tip.edu.ph', password: 'Password123!' },
  admin: { email: 'admin.cpe@tip.edu.ph', password: 'Password123!' },
};

const MOCK_USERS = {
  superadmin: {
    id: 1,
    email: CREDENTIALS.superadmin.email,
    role: 'superadmin',
    firstName: 'Sam',
    lastName: 'Superadmin',
    first_name: 'Sam',
    last_name: 'Superadmin',
    department: 'CPE',
    notifInapp: true,
  },
  student: {
    id: 101,
    email: CREDENTIALS.student.email,
    role: 'student',
    firstName: 'Pat',
    lastName: 'Student',
    first_name: 'Pat',
    last_name: 'Student',
    studentId: '2023-0001',
    studentNumber: '2023-0001',
    student_number: '2023-0001',
    program: 'BS Computer Engineering',
    curriculumId: 1,
    curriculum_id: 1,
    studentType: 'regular',
    student_type: 'regular',
    sex: 'Female',
    yearLevel: 2,
    year_level: 2,
    notifInapp: true,
  },
  adviser: {
    id: 201,
    email: CREDENTIALS.adviser.email,
    role: 'adviser',
    firstName: 'Ari',
    lastName: 'Adviser',
    first_name: 'Ari',
    last_name: 'Adviser',
    department: 'CPE',
    notifInapp: true,
  },
  admin: {
    id: 301,
    email: CREDENTIALS.admin.email,
    role: 'admin',
    firstName: 'Ada',
    lastName: 'Admin',
    first_name: 'Ada',
    last_name: 'Admin',
    department: 'CPE',
    notifInapp: true,
  },
};

const MOCK_CURRICULA = [
  { id: 1, name: 'BSCpE 2024 Curriculum', description: 'Mock active curriculum', isActive: true },
];

const MOCK_COURSES = [
  {
    id: 1,
    code: 'MATH101',
    name: 'Calculus 1',
    descriptiveTitle: 'Calculus 1',
    units: 3,
    lectureHours: 3,
    laboratoryHours: 0,
  },
  {
    id: 2,
    code: 'CPE101',
    name: 'Computer Engineering Orientation',
    descriptiveTitle: 'Computer Engineering Orientation',
    units: 1,
    lectureHours: 1,
    laboratoryHours: 0,
  },
];

const MOCK_TERMS = [
  { id: 1, schoolYear: '2025-2026', semester: 1, isCurrent: true },
  { id: 2, schoolYear: '2024-2025', semester: 2, isCurrent: false },
];

const MOCK_PROGRAMS = [
  { id: 1, code: 'BSCPE', name: 'Bachelor of Science in Computer Engineering', isActive: true },
];

const MOCK_SARS = [
  {
    id: 1,
    studentName: 'Pat Student',
    studentNumber: '2023-0001',
    email: CREDENTIALS.student.email,
    yearLevel: 2,
    isLinkedToAccount: true,
    Curriculum: MOCK_CURRICULA[0],
    Student: {
      id: 101,
      profile_picture: null,
    },
  },
];

const paged = (items) => ({
  success: true,
  data: items,
  items,
  meta: {
    page: 1,
    pageSize: Math.max(items.length, 1),
    totalItems: items.length,
    totalPages: 1,
  },
});

const jsonHeaders = () => {
  let origin = '*';
  try {
    origin = new URL(BASE).origin;
  } catch {
    origin = '*';
  }

  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-csrf-token',
  };
};

const roleForEmail = (email = '') => {
  const normalized = String(email).toLowerCase();
  return Object.entries(CREDENTIALS).find(([, credentials]) => credentials.email === normalized)?.[0];
};

const currentUser = (state) => (state.role ? MOCK_USERS[state.role] : null);

async function requestJson(request) {
  const raw = request.postData();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function setupMockApi(page) {
  const state = { role: null };

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const apiPath = url.pathname.replace(/^\/api(?=\/)/, '');

    const fulfillJson = (payload, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });

    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: jsonHeaders() });
    }

    if (apiPath === '/auth/login' && method === 'POST') {
      const body = await requestJson(request);
      state.role = roleForEmail(body.email) || (body.selectedRole === 'student' ? 'student' : 'adviser');
      const user = currentUser(state);
      return fulfillJson({
        success: true,
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
        user,
      });
    }

    if (apiPath === '/auth/me') {
      const user = currentUser(state);
      if (!user) {
        return fulfillJson({ success: false, message: 'Unauthenticated' }, 401);
      }
      return fulfillJson({ success: true, user });
    }

    if (apiPath === '/auth/refresh-token' || apiPath === '/auth/refresh') {
      const user = currentUser(state);
      if (!user) {
        return fulfillJson({ success: false, message: 'Session expired' }, 401);
      }
      return fulfillJson({ success: true, token: 'mock-token', refreshToken: 'mock-refresh-token' });
    }

    if (apiPath === '/auth/logout') {
      state.role = null;
      return fulfillJson({ success: true });
    }

    if (apiPath === '/auth/change-password' || apiPath === '/auth/initiate-email-change') {
      if (!currentUser(state)) {
        return fulfillJson({ success: false, message: 'Authentication required' }, 401);
      }
      return fulfillJson({ success: true, message: 'Accepted' });
    }

    if (apiPath === '/auth/activate/invalid-token') {
      return fulfillJson({ success: false, message: 'Invalid or expired activation token' }, 400);
    }

    if (apiPath.startsWith('/auth/')) {
      return fulfillJson({ success: true, message: 'Accepted' });
    }

    if (apiPath === '/dashboard/summary') {
      return fulfillJson({
        success: true,
        data: {
          currentTerm: MOCK_TERMS[0],
          sar: {
            id: 1,
            kpis: {
              completedUnits: 4,
              totalUnits: 150,
              gwa: '1.75',
              completedSubjects: 2,
              remainingSubjects: 48,
            },
            semesterSummary: [
              {
                yearLevel: 1,
                semester: 1,
                status: 'Completed',
                courses: [
                  { code: 'MATH101', name: 'Calculus 1', units: 3, grade: '1.75', status: 'passed' },
                  { code: 'CPE101', name: 'Computer Engineering Orientation', units: 1, grade: '1.50', status: 'passed' },
                ],
              },
            ],
          },
        },
      });
    }

    if (apiPath === '/users/me/dashboard') {
      return fulfillJson({
        success: true,
        sarId: 1,
        unitsCredited: 4,
        totalUnits: 150,
        gwa: '1.75',
        adviserReviewWorkflow: { status: 'approved' },
        semesterSummary: [
          {
            yearLevel: 1,
            semester: 1,
            status: 'Completed',
            courses: MOCK_COURSES.map((course, index) => ({
              ...course,
              grade: index === 0 ? '1.75' : '1.50',
              status: 'passed',
            })),
          },
        ],
      });
    }

    if (apiPath === '/notifications/unread-count') {
      return fulfillJson({ success: true, data: { count: 0 } });
    }

    if (apiPath.startsWith('/notifications')) {
      return fulfillJson(paged([]));
    }

    if (apiPath === '/terms/current') {
      return fulfillJson({ success: true, data: MOCK_TERMS[0] });
    }

    if (apiPath.startsWith('/programs')) {
      return fulfillJson({ success: true, data: MOCK_PROGRAMS });
    }

    if (apiPath.startsWith('/terms')) {
      return fulfillJson(paged(MOCK_TERMS));
    }

    if (apiPath === '/curriculums') {
      return fulfillJson(paged(MOCK_CURRICULA));
    }

    if (/^\/curriculums\/\d+$/.test(apiPath)) {
      return fulfillJson({ success: true, data: MOCK_CURRICULA[0] });
    }

    if (apiPath.includes('/curriculums/') && apiPath.endsWith('/courses')) {
      return fulfillJson(paged(MOCK_COURSES.map((course) => ({ ...course, Course: course }))));
    }

    if (apiPath.includes('/curriculums/') && apiPath.endsWith('/prerequisites')) {
      return fulfillJson(paged([]));
    }

    if (apiPath.includes('/curriculums/') && apiPath.endsWith('/corequisites')) {
      return fulfillJson(paged([]));
    }

    if (apiPath.includes('/curriculums/') && apiPath.endsWith('/elective-tracks')) {
      return fulfillJson(paged([]));
    }

    if (apiPath.startsWith('/courses')) {
      return fulfillJson(paged(MOCK_COURSES));
    }

    if (apiPath.startsWith('/equivalencies')) {
      return fulfillJson(paged([]));
    }

    if (apiPath === '/sars') {
      return fulfillJson(paged(MOCK_SARS));
    }

    if (apiPath === '/sars/autofill') {
      return fulfillJson({ success: true, data: MOCK_SARS[0] });
    }

    if (/^\/sars\/\d+$/.test(apiPath)) {
      return fulfillJson({
        success: true,
        data: {
          ...MOCK_SARS[0],
          studentName: 'Pat Student',
          curriculumId: 1,
        },
      });
    }

    if (apiPath.includes('/sars/') && apiPath.includes('/study-plan/versions')) {
      return fulfillJson({
        success: true,
        data: [
          {
            id: 1,
            status: 'active',
            versionNumber: 1,
            courses: MOCK_COURSES.map((course) => ({
              id: course.id,
              courseId: course.id,
              Course: course,
              grade: null,
              gradeStatus: 'pending',
              yearLevel: 1,
              semester: 1,
            })),
          },
        ],
      });
    }

    if (apiPath.includes('/sars/') && apiPath.includes('/study-plan')) {
      return fulfillJson({
        success: true,
        data: {
          id: 1,
          status: 'active',
          courses: MOCK_COURSES.map((course) => ({
            id: course.id,
            courseId: course.id,
            Course: course,
            grade: null,
            gradeStatus: 'pending',
            yearLevel: 1,
            semester: 1,
          })),
        },
      });
    }

    if (apiPath.startsWith('/forecast/current')) {
      return fulfillJson(paged([{ courseCode: 'MATH101', courseName: 'Calculus 1', enrolledCount: 25 }]));
    }

    if (apiPath.startsWith('/forecast/next')) {
      return fulfillJson(paged([{ courseCode: 'CPE101', courseName: 'Computer Engineering Orientation', studentCount: 30 }]));
    }

    if (apiPath.startsWith('/forecast/comparison')) {
      return fulfillJson(paged([{ courseCode: 'MATH101', forecastedDemand: 28, actualDemand: 25, delta: 3 }]));
    }

    if (apiPath.startsWith('/forecast/history')) {
      return fulfillJson(paged([{ id: 1, termLabel: '2025-2026 1st Semester', nextSemesterForecastCount: 1, createdAt: new Date().toISOString(), snapshotData: { nextSemesterForecast: [] } }]));
    }

    if (apiPath.startsWith('/users/curriculum-options')) {
      return fulfillJson({ success: true, data: MOCK_CURRICULA });
    }

    if (/^\/users\/\d+/.test(apiPath)) {
      return fulfillJson({ success: true, user: currentUser(state) || MOCK_USERS.student });
    }

    if (apiPath.startsWith('/users')) {
      return fulfillJson(paged(Object.values(MOCK_USERS)));
    }

    return fulfillJson({ success: true, data: [], items: [], meta: { page: 1, pageSize: 1, totalItems: 0, totalPages: 1 } });
  });
}

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

  if (USE_MOCK_API) {
    await setupMockApi(page);
  }

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

  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST',
    { timeout: 20000 },
  );

  await page.locator('button[type="submit"].login-button').click();

  const loginResponse = await loginResponsePromise.catch(() => null);
  let loginBody = null;
  if (loginResponse) {
    try {
      loginBody = await loginResponse.json();
    } catch {
      loginBody = null;
    }
  }

  if (loginBody?.token) {
    await page.context().addCookies([
      {
        name: 'token',
        value: loginBody.token,
        domain: 'localhost',
        path: '/',
      },
    ]);

    if (loginBody.refreshToken) {
      await page.context().addCookies([
        {
          name: 'refreshToken',
          value: loginBody.refreshToken,
          domain: 'localhost',
          path: '/api/auth',
        },
      ]);
    }

    await page.evaluate(({ user, token, refreshToken }) => {
      try {
        if (user) {
          window.localStorage.setItem('user', JSON.stringify(user));
        }
        if (token) {
          window.localStorage.setItem('auth_token', token);
        }
        if (refreshToken) {
          window.localStorage.setItem('auth_refresh_token', refreshToken);
        }
      } catch {
        // Ignore storage failures in restrictive browser contexts.
      }
    }, {
      user: loginBody.data?.user || loginBody.user || null,
      token: loginBody.token,
      refreshToken: loginBody.refreshToken || null,
    });
  }

  // Wait for post-login state:
  // 1) URL redirect to an authenticated page, OR
  // 2) student onboarding modal displayed on /login.
  const redirected = page
    .waitForURL(/\/(verify-code|dashboard|admin|adviser|grades|notifications|settings|change-password)/, {
      timeout: 20000,
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

module.exports = {
  BASE,
  API,
  API_ROOT,
  USE_MOCK_API,
  CREDENTIALS,
  apiLogin,
  uiLogin,
  setupMockApi,
  waitForStable,
};
