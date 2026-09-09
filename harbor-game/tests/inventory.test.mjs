import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';
const js = ts.transpileModule(fs.readFileSync('lib/simulation.ts', 'utf8'), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { Raid, catalog } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);
const level = JSON.parse(fs.readFileSync('public/world/level.json', 'utf8'));
let saved;
const profile = {
  credits: 6000,
  stash: [{ ...catalog[0] }],
  raids: 0,
  extractions: 0,
};
const r = new Raid(
  level,
  profile,
  () => {},
  (p) => {
    saved = JSON.parse(JSON.stringify(p));
  },
);
r.start('glock');
r.enemies = [];
r.bag = [{ ...catalog[4] }, { ...catalog[7] }, { ...catalog[1] }];
assert(r.transfer(0, 'bag', 'secure'));
assert(r.transfer(0, 'bag', 'secure'));
assert.equal(r.secure.length, 2);
assert.equal(r.hasManifest, true);
assert.equal(r.weight, 4);
assert.equal(r.transfer(0, 'bag', 'secure'), false, 'two-slot capacity');
assert.equal(r.bag.length, 1);
const original = r.secure[0];
assert(
  r.transfer(0, 'bag', 'secure', 0),
  'drag onto occupied full secure slot swaps',
);
assert.equal(r.bag[0], original);
assert.equal(r.secure[0].id, 'parts');
assert.equal(r.weight, 4, 'transfer preserves total weight');
assert.equal(
  new Set([...r.bag, ...r.secure]).size,
  3,
  'no duplication on swap',
);
const kept = r.secure.map((i) => i.id);
r.damage(100);
assert.equal(r.result, 'dead');
assert.deepEqual(
  saved.stash.map((i) => i.id),
  ['wire', ...kept],
);
assert(!saved.stash.some((i) => i.id === 'chip'), 'unprotected bag lost');
assert.equal(r.questReward, 0, 'death does not pay extraction quest');
r.finish('dead');
assert.equal(saved.stash.length, 3, 'settle exactly once');
r.start('glock');
assert.equal(
  r.secure.length,
  0,
  'new raid starts empty; recovered items remain in stash',
);
r.secure = [{ ...catalog[4] }];
r.time = 0.01;
r.update(0.05, { x: 0, z: 0, sprint: false });
assert.equal(r.result, 'timeout');
assert.equal(saved.stash.at(-1).id, 'chip');
r.start('ak47');
r.secure = [{ ...catalog[7] }];
r.bag = [{ ...catalog[4] }];
r.finish('extracted');
assert.equal(
  r.questReward,
  2500,
  'secured manifest counts on successful extraction',
);
assert.deepEqual(
  saved.stash.slice(-2).map((i) => i.id),
  ['manifest', 'chip'],
);
assert.equal(profile.credits, 8500, 'deposit returned plus quest once');
r.start('glock');
r.bag = Array.from({ length: 11 }, () => ({ ...catalog[0] }));
r.openLoot = 'crate-1';
assert(r.take(1, 'secure'), 'direct loot into secure');
assert.equal(r.weight, 12);
const before = r.loot.find((c) => c.id === 'crate-1').items.length;
assert.equal(r.take(0, 'secure'), false, 'secure shares carry weight limit');
assert.equal(
  r.loot.find((c) => c.id === 'crate-1').items.length,
  before,
  'failed pickup retains loot',
);
r.drop(0, 'secure');
assert.equal(r.secure.length, 0);
r.bag = [];
r.openLoot = 'crate-6';
assert(r.take(0, 'secure'));
assert(r.take(0, 'secure'));
assert.equal(r.inventory, true, 'empty loot keeps inventory accessible');
assert.equal(r.openLoot, null);
assert.equal(r.secure.length, 2);
r.mode = 'paused';
assert.equal(r.transfer(0, 'secure', 'bag'), false);
r.drop(0, 'secure');
assert.equal(r.secure.length, 2, 'paused inventory cannot mutate');
const b = fs.readFileSync('public/world/military-crate.glb');
const walking = new Raid(level, profile, () => {}, () => {});
walking.start('glock');
walking.enemies = [];
walking.inventory = true;
const startX = walking.player.x;
walking.update(0.05, { x: 1, z: 0, sprint: false });
assert(walking.player.x > startX, 'open backpack permits walking');
const walkDistance = walking.player.x - startX;
const beforeSprint = walking.player.x;
walking.update(0.05, { x: 1, z: 0, sprint: true });
assert(walking.player.x - beforeSprint > walkDistance, 'open backpack permits sprinting');
assert(walking.inventory, 'movement keeps backpack open');
const beforePause = { ...walking.player };
walking.mode = 'paused';
walking.update(0.05, { x: 1, z: 0, sprint: true });
assert.deepEqual(walking.player, beforePause, 'actual pause still stops movement');
const g = await new GLTFLoader().parseAsync(
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  '',
);
const size = new Box3().setFromObject(g.scene).getSize(new Vector3());
assert(
  size.x > 1.3 && size.x < 1.6 && size.y > 0.7 && size.y < 0.9 && size.z < 1.1,
  'visible military case scale, no studio geometry',
);
let meshes = 0;
g.scene.traverse((o) => {
  if (o.isMesh) meshes++;
});
assert(meshes >= 20);
console.log(
  'PASS: secure capacity, swapping, combined weight, protected death/timeout recovery, extraction reward, exactly-once persistence, direct pickup, pause guards, crate GLB scale.',
);
