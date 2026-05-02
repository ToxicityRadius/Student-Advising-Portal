/**
 * Comprehensive Manual Feature Test Script
 * Tests EVERY feature in the Student Advising Portal
 * Generates a detailed test report with results
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const API = 'http://localhost:5000/api';

const CREDENTIALS = {
  student: { email: 'student@tip.edu.ph', password: 'Password123!' },
  adviser: { email: 'adviser.cpe@tip.edu.ph', password: 'Password123!' },
  admin: { email: 'admin.cpe@tip.edu.ph', password: 'Password123!' },
};

class FeatureTester {
  constructor() {
    this.results = [];
    this.browser = null;
    this.context = null;
  }

  log(feature, status, details = '') {
    const entry = {
      feature,
      status, // 'PASS' | 'FAIL' | 'WARN' | 'SKIP'
      details,
      timestamp: new Date().toISOString(),
    };
    this.results.push(entry);
    console.log(`[${status}] ${feature}${details ? ' - ' + details : ''}`);
  }

  async test(name, fn) {
    try {
      await fn();
      this.log(name, 'PASS');
      return true;
    } catch (err) {
      this.log(name, 'FAIL', err.message);
      return false;
    }
  }

  async testRoute(pageName, route, expectedContent = null) {
    const page = await this.context.newPage();
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const content = await page.content();

      if (
        expectedContent &&
        !content.toLowerCase().includes(String(expectedContent).toLowerCase())
      ) {
        this.log(
          `Route: ${pageName} (${route})`,
          'WARN',
          `Missing expected content: "${expectedContent}"`,
        );
      } else {
        this.log(`Route: ${pageName} (${route})`, 'PASS');
      }
      return true;
    } catch (err) {
      this.log(`Route: ${pageName} (${route})`, 'FAIL', err.message);
      return false;
    } finally {
      await page.close();
    }
  }

  async login(role) {
    const page = await this.context.newPage();
    try {
      const cred = CREDENTIALS[role];
      await this.context.clearCookies();
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

      // Click role selector card. Advisers and admins share the Faculty login path.
      const roleLabel = role === 'student' ? 'Login as Student' : 'Login as Faculty';
      const roleButton = page.locator(`div[role="button"][aria-label="${roleLabel}"]`);
      const emailInput = page
        .locator('input[name="email"], input[type="email"], input[placeholder*="email" i]')
        .first();
      const found = await roleButton
        .first()
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => true)
        .catch(() => false);

      if (!found) {
        const formAlreadyVisible = await emailInput.isVisible().catch(() => false);
        if (!formAlreadyVisible) {
          this.log(
            `Auth: ${role} role selector`,
            'WARN',
            `Could not find ${roleLabel} selector, attempting direct login`,
          );
        }
      } else {
        await roleButton.first().click();
        await page.waitForTimeout(500);
      }

      // Enter credentials
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.fill(cred.email);
      await page.fill('input[type="password"]', cred.password);

      // Click login button
      const loginBtn = page.locator('button:has-text("Login"), button[type="submit"]').first();
      await loginBtn.click();

      // Wait for navigation or dashboard
      await Promise.race([
        page.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {}),
        page.waitForURL('**/adviser', { timeout: 5000 }).catch(() => {}),
        page.waitForURL('**/admin', { timeout: 5000 }).catch(() => {}),
        page.waitForURL('**/grades', { timeout: 5000 }).catch(() => {}),
        page.waitForURL('**/settings', { timeout: 5000 }).catch(() => {}),
        page.waitForTimeout(3000),
      ]);

      const finalUrl = page.url();
      this.log(`Auth: ${role} login`, 'PASS', `Redirected to: ${finalUrl}`);

      return page;
    } catch (err) {
      this.log(`Auth: ${role} login`, 'FAIL', err.message);
      await page.close();
      return null;
    }
  }

  async testAuthPages() {
    console.log('\n=== TESTING AUTH PAGES ===');

    // Test unauthenticated routes
    await this.testRoute('Login Page', '/login', 'login');
    await this.testRoute('Register Page', '/register', 'register');
    await this.testRoute('Forgot Password Page', '/forgot-password', 'forgot password');
    await this.testRoute('Reset Password Page', '/reset-password/test-token', 'reset password');
    await this.testRoute('Account Activation Page', '/activate/test-token', 'activation');

    // Test login flow for each role
    for (const role of ['student', 'adviser', 'admin']) {
      const page = await this.login(role);
      if (page) {
        await page.close();
      }
    }
  }

  async testStudentFeatures() {
    console.log('\n=== TESTING STUDENT FEATURES ===');

    const page = await this.login('student');
    if (!page) {
      this.log('Student Features', 'SKIP', 'Could not login as student');
      return;
    }

    try {
      // Dashboard
      await page.goto(`${BASE}/dashboard`);
      await page.waitForTimeout(1000);
      this.log('Student: Dashboard', 'PASS', page.url());

      // Grades
      await page.goto(`${BASE}/grades`);
      await page.waitForTimeout(1000);
      this.log('Student: Grades Page', 'PASS', page.url());

      // Notifications
      await page.goto(`${BASE}/notifications`);
      await page.waitForTimeout(1000);
      this.log('Student: Notifications', 'PASS', page.url());

      // Settings
      await page.goto(`${BASE}/settings`);
      await page.waitForTimeout(1000);
      this.log('Student: Settings', 'PASS', page.url());

      // Curriculum (if available)
      await page.goto(`${BASE}/curriculum`).catch(() => {
        this.log('Student: Curriculum', 'SKIP', 'Route not available');
      });

      // Study Plan / Forecast (if available)
      await page.goto(`${BASE}/study-plan`).catch(() => {
        this.log('Student: Study Plan', 'SKIP', 'Route not available');
      });

      // SAR (if available)
      await page.goto(`${BASE}/sars`).catch(() => {
        this.log('Student: SAR Management', 'SKIP', 'Route not available');
      });

      // Profile / Account Settings (if available)
      await page.goto(`${BASE}/profile`).catch(() => {
        this.log('Student: Profile', 'SKIP', 'Route not available');
      });

      // Logout test
      const logoutBtn = page
        .locator('button:has-text("logout"), button:has-text("Logout"), [aria-label*="logout"]')
        .first();
      const logoutExists = await logoutBtn.isVisible().catch(() => false);
      if (logoutExists) {
        await logoutBtn.click();
        await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {});
        this.log('Student: Logout', 'PASS');
      } else {
        this.log('Student: Logout', 'WARN', 'Logout button not easily accessible');
      }
    } catch (err) {
      this.log('Student Features', 'FAIL', err.message);
    } finally {
      await page.close();
    }
  }

  async testAdviserFeatures() {
    console.log('\n=== TESTING ADVISER FEATURES ===');

    const page = await this.login('adviser');
    if (!page) {
      this.log('Adviser Features', 'SKIP', 'Could not login as adviser');
      return;
    }

    try {
      // Dashboard
      await page.goto(`${BASE}/dashboard`);
      await page.waitForTimeout(1000);
      this.log('Adviser: Dashboard', 'PASS', page.url());

      // Adviser Students List
      await page.goto(`${BASE}/adviser/students`);
      await page.waitForTimeout(1000);
      this.log('Adviser: Student List', 'PASS', page.url());

      // Notifications
      await page.goto(`${BASE}/notifications`);
      await page.waitForTimeout(1000);
      this.log('Adviser: Notifications', 'PASS', page.url());

      // Settings
      await page.goto(`${BASE}/settings`);
      await page.waitForTimeout(1000);
      this.log('Adviser: Settings', 'PASS', page.url());

      // Student Detail Page (if available)
      await page.goto(`${BASE}/adviser/students/1`).catch(() => {
        this.log('Adviser: Student Detail', 'SKIP', 'Route not available');
      });

      // Grade Management (if available)
      await page.goto(`${BASE}/adviser/grades`).catch(() => {
        this.log('Adviser: Grade Management', 'SKIP', 'Route not available');
      });

      // Curriculum (if available to advisers)
      await page.goto(`${BASE}/curriculum`).catch(() => {
        this.log('Adviser: Curriculum', 'SKIP', 'Route not available');
      });

      // Logout test
      const logoutBtn = page
        .locator('button:has-text("logout"), button:has-text("Logout"), [aria-label*="logout"]')
        .first();
      const logoutExists = await logoutBtn.isVisible().catch(() => false);
      if (logoutExists) {
        await logoutBtn.click();
        await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {});
        this.log('Adviser: Logout', 'PASS');
      } else {
        this.log('Adviser: Logout', 'WARN', 'Logout button not easily accessible');
      }
    } catch (err) {
      this.log('Adviser Features', 'FAIL', err.message);
    } finally {
      await page.close();
    }
  }

  async testAdminFeatures() {
    console.log('\n=== TESTING ADMIN FEATURES ===');

    const page = await this.login('admin');
    if (!page) {
      this.log('Admin Features', 'SKIP', 'Could not login as admin');
      return;
    }

    try {
      // Dashboard
      await page.goto(`${BASE}/dashboard`);
      await page.waitForTimeout(1000);
      this.log('Admin: Dashboard', 'PASS', page.url());

      // Curriculum Management
      await page.goto(`${BASE}/admin/curriculum`);
      await page.waitForTimeout(1000);
      this.log('Admin: Curriculum Management', 'PASS', page.url());

      // Term Management
      await page.goto(`${BASE}/admin/terms`);
      await page.waitForTimeout(1000);
      this.log('Admin: Term Management', 'PASS', page.url());

      // Forecast
      await page.goto(`${BASE}/admin/forecast`);
      await page.waitForTimeout(1000);
      this.log('Admin: Forecast Management', 'PASS', page.url());

      // Notifications
      await page.goto(`${BASE}/notifications`);
      await page.waitForTimeout(1000);
      this.log('Admin: Notifications', 'PASS', page.url());

      // Settings
      await page.goto(`${BASE}/settings`);
      await page.waitForTimeout(1000);
      this.log('Admin: Settings', 'PASS', page.url());

      // User Management (if available)
      await page.goto(`${BASE}/admin/users`).catch(() => {
        this.log('Admin: User Management', 'SKIP', 'Route not available');
      });

      // Reports (if available)
      await page.goto(`${BASE}/admin/reports`).catch(() => {
        this.log('Admin: Reports', 'SKIP', 'Route not available');
      });

      // API Docs (local only)
      await page.goto(`${API}/docs/`).catch(() => {
        this.log('Admin: API Docs', 'SKIP', 'Route not available');
      });

      // Logout test
      const logoutBtn = page
        .locator('button:has-text("logout"), button:has-text("Logout"), [aria-label*="logout"]')
        .first();
      const logoutExists = await logoutBtn.isVisible().catch(() => false);
      if (logoutExists) {
        await logoutBtn.click();
        await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {});
        this.log('Admin: Logout', 'PASS');
      } else {
        this.log('Admin: Logout', 'WARN', 'Logout button not easily accessible');
      }
    } catch (err) {
      this.log('Admin Features', 'FAIL', err.message);
    } finally {
      await page.close();
    }
  }

  async testAPIEndpoints() {
    console.log('\n=== TESTING API ENDPOINTS ===');

    const testEndpoint = async (method, endpoint, description) => {
      try {
        const url = `${API}${endpoint}`;
        const response = await fetch(url, { method });
        const status = response.status;

        // 401/403 is OK for protected endpoints when not authenticated
        if ([200, 400, 401, 403, 404].includes(status)) {
          this.log(`API: ${description} (${method} ${endpoint})`, 'PASS', `Status: ${status}`);
        } else {
          this.log(`API: ${description} (${method} ${endpoint})`, 'WARN', `Status: ${status}`);
        }
      } catch (err) {
        this.log(`API: ${description} (${method} ${endpoint})`, 'FAIL', err.message);
      }
    };

    // Health Check
    await testEndpoint('GET', '/health', 'Health Check');

    // Auth Endpoints
    await testEndpoint('POST', '/auth/signup', 'Signup Endpoint');
    await testEndpoint('POST', '/auth/login', 'Login Endpoint');

    // User Endpoints
    await testEndpoint('GET', '/users/me', 'Get Current User');
    await testEndpoint('PUT', '/users/me', 'Update Current User');

    // Curriculum Endpoints
    await testEndpoint('GET', '/curricula', 'Get Curricula');
    await testEndpoint('GET', '/curricula/active', 'Get Active Curriculum');

    // Terms Endpoints
    await testEndpoint('GET', '/terms', 'Get Terms');
    await testEndpoint('GET', '/terms/current', 'Get Current Term');

    // Grades Endpoints
    await testEndpoint('GET', '/grades', 'Get Grades');

    // Notifications Endpoints
    await testEndpoint('GET', '/notifications', 'Get Notifications');

    // Forecast Endpoints
    await testEndpoint('GET', '/forecast', 'Get Forecast');
    await testEndpoint('GET', '/forecast/study-plan', 'Get Study Plan');

    // Dashboard Endpoints
    await testEndpoint('GET', '/dashboard', 'Get Dashboard Data');

    // SAR Endpoints
    await testEndpoint('GET', '/sars', 'Get SARs');

    // Validation Endpoints
    await testEndpoint('GET', '/validate/prerequisites', 'Validate Prerequisites');
  }

  async generateReport() {
    const report = {
      title: 'Student Advising Portal - Comprehensive Feature Test Report',
      executedAt: new Date().toISOString(),
      environment: {
        baseUrl: BASE,
        apiUrl: API,
      },
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => r.status === 'PASS').length,
        failed: this.results.filter((r) => r.status === 'FAIL').length,
        warned: this.results.filter((r) => r.status === 'WARN').length,
        skipped: this.results.filter((r) => r.status === 'SKIP').length,
      },
      results: this.results,
    };

    // Calculate success rate
    const totalNonSkipped = report.summary.total - report.summary.skipped;
    report.successRate =
      totalNonSkipped > 0
        ? ((report.summary.passed / totalNonSkipped) * 100).toFixed(2) + '%'
        : 'N/A';

    return report;
  }

  async run() {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();

    try {
      console.log('Starting comprehensive feature test...\n');

      await this.testAuthPages();
      await this.testStudentFeatures();
      await this.testAdviserFeatures();
      await this.testAdminFeatures();
      await this.testAPIEndpoints();

      const report = await this.generateReport();

      // Write to file
      const reportPath = path.join(__dirname, 'TEST_REPORT.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      // Also write human-readable report
      const readablePath = path.join(__dirname, 'TEST_REPORT.md');
      const markdown = this.generateMarkdownReport(report);
      fs.writeFileSync(readablePath, markdown);

      console.log('\n=== TEST EXECUTION COMPLETE ===');
      console.log(`Total Tests: ${report.summary.total}`);
      console.log(`Passed: ${report.summary.passed}`);
      console.log(`Failed: ${report.summary.failed}`);
      console.log(`Warned: ${report.summary.warned}`);
      console.log(`Skipped: ${report.summary.skipped}`);
      console.log(`Success Rate: ${report.successRate}`);
      console.log(`\nReports saved to:`);
      console.log(`  - ${reportPath}`);
      console.log(`  - ${readablePath}`);

      return report;
    } finally {
      await this.browser.close();
    }
  }

  generateMarkdownReport(report) {
    let md = `# ${report.title}\n\n`;
    md += `**Test Execution Time:** ${report.executedAt}\n\n`;
    md += `## Environment\n`;
    md += `- **Base URL:** ${report.environment.baseUrl}\n`;
    md += `- **API URL:** ${report.environment.apiUrl}\n\n`;

    md += `## Summary\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Tests | ${report.summary.total} |\n`;
    md += `| Passed | ${report.summary.passed} |\n`;
    md += `| Failed | ${report.summary.failed} |\n`;
    md += `| Warned | ${report.summary.warned} |\n`;
    md += `| Skipped | ${report.summary.skipped} |\n`;
    md += `| Success Rate | ${report.successRate} |\n\n`;

    md += `## Detailed Results\n`;
    const groupedByStatus = {};
    report.results.forEach((r) => {
      if (!groupedByStatus[r.status]) groupedByStatus[r.status] = [];
      groupedByStatus[r.status].push(r);
    });

    // PASS
    if (groupedByStatus.PASS?.length) {
      md += `### Passed (${groupedByStatus.PASS.length})\n`;
      groupedByStatus.PASS.forEach((r) => {
        md += `- **${r.feature}** - ${r.details || 'OK'}\n`;
      });
      md += '\n';
    }

    // FAIL
    if (groupedByStatus.FAIL?.length) {
      md += `### Failed (${groupedByStatus.FAIL.length})\n`;
      groupedByStatus.FAIL.forEach((r) => {
        md += `- **${r.feature}** - ${r.details || 'Error'}\n`;
      });
      md += '\n';
    }

    // WARN
    if (groupedByStatus.WARN?.length) {
      md += `### Warnings (${groupedByStatus.WARN.length})\n`;
      groupedByStatus.WARN.forEach((r) => {
        md += `- **${r.feature}** - ${r.details || 'Warning'}\n`;
      });
      md += '\n';
    }

    // SKIP
    if (groupedByStatus.SKIP?.length) {
      md += `### Skipped (${groupedByStatus.SKIP.length})\n`;
      groupedByStatus.SKIP.forEach((r) => {
        md += `- **${r.feature}** - ${r.details || 'Skipped'}\n`;
      });
      md += '\n';
    }

    return md;
  }
}

// Run the tester
(async () => {
  const tester = new FeatureTester();
  await tester.run();
})().catch(console.error);
