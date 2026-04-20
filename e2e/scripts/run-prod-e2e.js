const { spawnSync } = require('node:child_process');
const path = require('node:path');

const defaultBaseUrl = 'https://student-advising-portal.pages.dev';
const defaultApiUrl = 'https://student-advising-backend.onrender.com/api';

process.env.E2E_BASE_URL = process.env.E2E_BASE_URL || defaultBaseUrl;
process.env.E2E_API_URL = process.env.E2E_API_URL || defaultApiUrl;

const command = 'npm';
const forwardedArgs = process.argv.slice(2);
const hasExplicitSpecTarget = forwardedArgs.some(
  (arg) => arg.startsWith('tests/') || /\.spec\.(js|ts)$/.test(arg),
);
const defaultSpecTargets = hasExplicitSpecTarget ? [] : ['tests/auth-pages.spec.js'];
const args = ['exec', '--', 'playwright', 'test', ...defaultSpecTargets, ...forwardedArgs];

const result = spawnSync(command, args, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

if (result.error) {
  console.error('[e2e:test:prod] Failed to launch Playwright:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
