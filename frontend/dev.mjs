import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const frontend = fileURLToPath(new URL('.', import.meta.url));
const backend = fileURLToPath(new URL('../backend/', import.meta.url));
const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && child.pid) {
      if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      else child.kill('SIGTERM');
    }
  }
  process.exitCode = code;
}

function start(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: 'inherit' });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code ?? 1); });
  return child;
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

try {
  const existing = await fetch('http://localhost:5168/api/estado', { signal: AbortSignal.timeout(1000) }).catch(() => null);
  if (existing) throw new Error('El puerto 5168 ya está ocupado. Detén la API antes de usar npm run start:all.');
  console.log('Iniciando API y esperando a PostgreSQL…');
  start('dotnet', ['run', '--project', 'SneakZone.Api.csproj', '--launch-profile', 'http'], backend);
  let ready = false;
  for (let attempt = 0; attempt < 120 && !stopping; attempt++) {
    try {
      const response = await fetch('http://localhost:5168/api/estado', { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch {}
    await delay(1000);
  }
  if (!stopping) {
    if (!ready) throw new Error('La API no respondió. Revisa PostgreSQL y la configuración de conexión del backend.');
    console.log('API lista: http://localhost:5168/swagger · Tienda: http://localhost:4200');
    start(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'serve', '--port', '4200'], frontend);
  }
} catch (error) {
  console.error(error.message);
  stop(1);
}
