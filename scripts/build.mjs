import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { findIpk, formatBytes, projectRoot, sha256File } from './lib.mjs';

const appDir = path.join(projectRoot, 'app');
const buildDir = path.join(projectRoot, 'build');
const binName = process.platform === 'win32' ? 'ares-package.cmd' : 'ares-package';
const binPath = path.join(projectRoot, 'node_modules', '.bin', binName);

if (!fs.existsSync(path.join(appDir, 'appinfo.json'))) {
  console.error('app/appinfo.json não encontrado');
  process.exit(1);
}

if (!fs.existsSync(binPath)) {
  console.error('ares-package não encontrado. Rode "npm install" primeiro.');
  process.exit(1);
}

fs.rmSync(buildDir, { recursive: true, force: true });
fs.mkdirSync(buildDir, { recursive: true });

console.log('Empacotando app...');
const result = spawnSync(binPath, ['app', '-o', 'build'], {
  cwd: projectRoot,
  stdio: 'inherit'
});

if (result.error) {
  console.error('Falha ao executar ares-package:', result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status || 1);
}

const ipkPath = findIpk();
if (!ipkPath) {
  console.error('O ares-package terminou sem gerar um IPK em build/');
  process.exit(1);
}

const stat = fs.statSync(ipkPath);
console.log('');
console.log('IPK: ' + path.relative(projectRoot, ipkPath));
console.log('Tamanho: ' + formatBytes(stat.size));
console.log('SHA-256: ' + sha256File(ipkPath));
