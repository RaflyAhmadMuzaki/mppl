import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const children = [
  spawn(process.execPath, [resolve(projectRoot, 'server', 'index.js')], {
    cwd: projectRoot,
    stdio: 'inherit'
  }),
  spawn(process.execPath, [resolve(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1'], {
    cwd: projectRoot,
    stdio: 'inherit'
  })
];

let stopping = false;
function stopChildren(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
  process.exitCode = exitCode;
}

children.forEach(child => {
  child.on('error', error => {
    console.error('[SIMPEL dev] Gagal menjalankan layanan lokal:', error);
    stopChildren(1);
  });
  child.on('exit', code => {
    if (!stopping) stopChildren(code || 0);
  });
});

process.on('SIGINT', () => stopChildren(0));
process.on('SIGTERM', () => stopChildren(0));
