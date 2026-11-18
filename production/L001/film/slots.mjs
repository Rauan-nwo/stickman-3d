// film/slots.mjs — не больше SLOTS (2) браузерных рендеров на машине одновременно, общие для ВСЕХ агентов (память машины).
// Слот — каталог out/locks/slot<i> (mkdir атомарен); внутри owner.json с pid. Слот мёртвого процесса освобождается сам.
//   программно: const release = await acquire('ch2_3 кусок 1'); ... release();
//   из оболочки: node production/L001/film/slots.mjs -- node engine/tools/render.mjs <html> <out> --stills ...   (рендер кадров для проверки)
//   статус:      node production/L001/film/slots.mjs --status
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const D = dirname(fileURLToPath(import.meta.url)), LOCKS = join(D, 'out', 'locks'), SLOTS = 2;
mkdirSync(LOCKS, { recursive: true });
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
function tryTake(i, who) {
  const dir = join(LOCKS, `slot${i}`);
  try { mkdirSync(dir); } catch {
    try { const o = JSON.parse(readFileSync(join(dir, 'owner.json'), 'utf8')); if (!alive(o.pid)) { rmSync(dir, { recursive: true, force: true }); return tryTake(i, who); } }
    catch { if (!existsSync(join(dir, 'owner.json'))) { /* слот только что взят — владелец ещё пишет owner.json */ } }
    return null;
  }
  writeFileSync(join(dir, 'owner.json'), JSON.stringify({ pid: process.pid, who, since: new Date().toISOString() }));
  return () => rmSync(dir, { recursive: true, force: true });
}
export async function acquire(who = 'render') {
  for (let n = 0; ; n++) {
    for (let i = 0; i < SLOTS; i++) { const r = tryTake(i, who); if (r) { process.once('exit', r); return r; } }
    if (n % 30 === 0) console.log(`[слоты] ${who}: оба слота заняты, жду…`);
    await new Promise(r => setTimeout(r, 2000));
  }
}
// именованная блокировка (сборка и рендер одной 3D-сцены двумя агентами сразу): const rel = await lockNamed('scene_city'); … rel();
export async function lockNamed(name) {
  const dir = join(LOCKS, name);
  for (let n = 0; ; n++) {
    try { mkdirSync(dir); writeFileSync(join(dir, 'owner.json'), JSON.stringify({ pid: process.pid, since: new Date().toISOString() })); const r = () => rmSync(dir, { recursive: true, force: true }); process.once('exit', r); return r; }
    catch { try { const o = JSON.parse(readFileSync(join(dir, 'owner.json'), 'utf8')); if (!alive(o.pid)) rmSync(dir, { recursive: true, force: true }); } catch {} }
    if (n % 30 === 0) console.log(`[блокировка] ${name}: занято, жду…`); await new Promise(r => setTimeout(r, 2000));
  }
}
export function status() {
  return Array.from({ length: SLOTS }, (_, i) => { const f = join(LOCKS, `slot${i}`, 'owner.json'); try { const o = JSON.parse(readFileSync(f, 'utf8')); return `slot${i}: ${o.who} (pid ${o.pid}${alive(o.pid) ? '' : ', мёртв'}) с ${o.since}`; } catch { return `slot${i}: свободен`; } });
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2);
  if (a[0] === '--status') { console.log(status().join('\n')); process.exit(0); }
  const k = a.indexOf('--'), cmd = a.slice(k + 1);
  if (k < 0 || !cmd.length) { console.error('usage: node slots.mjs -- <команда> | --status'); process.exit(1); }
  const release = await acquire(cmd.slice(0, 3).join(' '));
  const p = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit', shell: false });
  p.on('close', c => { release(); process.exit(c ?? 1); });
}
