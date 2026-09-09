import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as T from 'three';
async function source(path) {
  let js = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  js = js.replaceAll("from 'three'", `from '${import.meta.resolve('three')}'`);
  return import(
    'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
  );
}
const { Raid } = await source('lib/simulation.ts');
const level = JSON.parse(fs.readFileSync('public/world/level.json', 'utf8'));
const wall = { x: 0, z: -2, w: 3, d: 1, h: 2, name: 'container' };
const events = [];
const r = new Raid(
  { ...level, colliders: [wall], enemies: [{ x: 0, z: -4 }] },
  { credits: 6000, stash: [], raids: 0, extractions: 0 },
  (e) => events.push(e),
);
r.start('shotgun');
r.player = { x: 0, z: 0 };
r.shoot({ x: 0, z: -5 });
assert.equal(events.filter((e) => e.type === 'shot').length, 6);
assert.equal(
  events.filter((e) => e.type === 'shot' && e.primary).length,
  1,
  'one recoil/audio event per shell',
);
assert.equal(events.filter((e) => e.type === 'impact').length, 6);
for (const e of events.filter((e) => e.type === 'shot'))
  assert(Math.abs(e.to.z + 1.5) < 0.001, 'tracer stops on first wall');
assert.equal(r.enemies[0].hp, 80, 'blocked shots do not damage enemy');
assert.equal(r.ammo, 5, 'pellets consume one shell');
r.level.colliders = [];
r.shotCooldown = 0;
events.length = 0;
r.shoot({ x: 0, z: -4 });
assert.equal(r.kills, 1);
assert.equal(events.filter((e) => e.type === 'death').length, 1);
assert.equal(
  events.filter((e) => e.type === 'hit').reduce((n, e) => n + e.damage, 0),
  80,
  'damage labels report actual health removed',
);
assert(
  events.filter((e) => e.type === 'hit').every((e) => e.enemyId === 0),
  'enemy zero id is preserved',
);
// Exercise particle lifecycle with a minimal DOM adapter; this is not a browser rendering test.
function node() {
  return {
    className: '',
    innerHTML: '',
    textContent: '',
    style: { setProperty() {} },
    classList: { toggle() {} },
    appendChild() {},
    remove() {},
  };
}
Object.defineProperty(globalThis, 'document', {
  value: { createElement: node },
  configurable: true,
});
const { CombatEffects, weaponFeel } = await source('lib/combat-effects.ts');
const scene = new T.Scene(),
  fx = new CombatEffects(scene, node()),
  camera = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
camera.position.set(0, 20, 15);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();
const pointer = new T.Vector2();
const shot = {
  type: 'shot',
  from: { x: 0, z: 0 },
  to: { x: 0, z: -10 },
  primary: true,
};
fx.event(shot, 'shotgun', 0);
assert(fx.particles.some((p) => p.kind === 'smoke'));
assert(fx.particles.some((p) => p.kind === 'brass'));
const recoil = fx.recoil;
fx.event({ ...shot, primary: false }, 'shotgun', 0);
assert.equal(fx.recoil, recoil, 'pellets do not stack recoil');
fx.event(
  { type: 'hit', from: { x: 0, z: -4 }, enemyId: 0, damage: 18 },
  'shotgun',
  0,
);
fx.event(
  { type: 'hit', from: { x: 0, z: -4 }, enemyId: 0, damage: 18 },
  'shotgun',
  0,
);
assert.equal(fx.labels.length, 1);
assert.equal(fx.labels[0].amount, 36, 'same shell damage merges');
for (let i = 0; i < 500; i++) fx.event(shot, 'ak47', 0);
assert(fx.particles.length <= 800);
assert(fx.lights.length === 4);
fx.update(0.016, camera, pointer, true);
for (const batch of Object.values(fx.batches)) {
  assert(batch.count <= 256);
  assert([...batch.instanceMatrix.array].every(Number.isFinite));
}
const life = fx.particles[0].life;
fx.update(0, camera, pointer, true);
assert.equal(fx.particles[0].life, life, 'paused effects freeze');
for (let i = 0; i < 150; i++) fx.update(0.02, camera, pointer, true);
assert.equal(fx.particles.length, 0);
assert.equal(fx.labels.length, 0);
assert(fx.lights.every((l) => l.light.intensity === 0));
assert(weaponFeel.shotgun.kick > weaponFeel.glock.kick);
fx.clear();
fx.event(shot, 'revolver', 0);
assert(
  !fx.particles.some((p) => p.kind === 'brass'),
  'revolver does not eject a case when fired',
);
fx.dispose();
assert.equal(scene.children.length, 0);
console.log(
  'PASS: wall-clipped tracers, per-shell FX, actual damage, merged labels, particle/light caps, pause, cleanup, weapon differences.',
);
