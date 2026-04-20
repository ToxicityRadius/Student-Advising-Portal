const { spawnSync } = require('node:child_process');

const command = 'npm';
const args = ['--prefix', 'backend', 'audit', '--omit=dev', '--audit-level=high'];
const maxAttempts = 2;
const softNetworkFail = process.argv.includes('--soft-network-fail');

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: process.env,
    shell: true,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    console.error('[audit:backend:high] Failed to launch npm audit:', result.error.message);
    process.exit(1);
  }

  if (result.status === 0) {
    process.exit(0);
  }

  const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
  const isTransientNetworkError = /ECONNRESET|audit endpoint returned an error|EAI_AGAIN|ETIMEDOUT/i.test(
    combined,
  );

  if (isTransientNetworkError && attempt < maxAttempts) {
    console.warn(`[audit:backend:high] Transient npm audit network error. Retrying (${attempt + 1}/${maxAttempts})...`);
    continue;
  }

  if (isTransientNetworkError && softNetworkFail) {
    console.warn('[audit:backend:high] npm audit endpoint is unreachable. Continuing because soft network fail mode is enabled.');
    process.exit(0);
  }

  process.exit(result.status || 1);
}
