'use strict';

const { spawn } = require('node:child_process');

const sanitizedEnv = { ...process.env };
const preserveDevServerEnv = String(process.env.PRESERVE_DEVSERVER_ENV || '').toLowerCase() === 'true';

// react-scripts + proxy can fail schema validation when these are pre-set by the shell.
if (!preserveDevServerEnv) {
  for (const key of ['HOST', 'WDS_SOCKET_HOST', 'WDS_SOCKET_PATH', 'WDS_SOCKET_PORT']) {
    delete sanitizedEnv[key];
  }
}

const startArgs = [require.resolve('react-scripts/scripts/start'), ...process.argv.slice(2)];

const child = spawn(process.execPath, startArgs, {
  stdio: 'inherit',
  env: sanitizedEnv,
});

child.on('error', (error) => {
  console.error('Failed to start frontend dev server.', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
