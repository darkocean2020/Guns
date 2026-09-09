import ts from 'typescript';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync('lib/simulation.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { Raid, blocked, findPath, segmentBlocked, catalog } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);
const level = JSON.parse(fs.readFileSync('public/world/level.json', 'utf8'));
assert(!blocked(level.spawn, level), 'spawn clear');
assert(!blocked(level.extraction, level), 'exit clear');
for (const e of level.enemies)
  assert(!blocked(e, level), 'enemy spawn clear ' + JSON.stringify(e));
const visited = new Set(),
  queue = [{ x: -18, z: 18 }];
for (let i = 0; i < queue.length; i++) {
  const p = queue[i];
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const n = { x: p.x + dx, z: p.z + dz },
      key = `${n.x},${n.z}`;
    if (!visited.has(key) && !blocked(n, level, 0.4)) {
      visited.add(key);
      queue.push(n);
    }
  }
}
for (const c of level.loot) {
  assert(
    queue.some(
      (p) =>
        Math.hypot(p.x - c.x, p.z - c.z) < 2.2 &&
        !segmentBlocked(
          p,
          c,
          level.colliders.filter((r) => r.name !== 'chest'),
        ),
    ),
    'loot reachable ' + c.id,
  );
}
assert(
  queue.some(
    (p) => Math.hypot(p.x - level.extraction.x, p.z - level.extraction.z) < 2,
  ),
  'exit reachable',
);
const p = { credits: 6000, stash: [], raids: 0, extractions: 0 };
let writes = 0;
const r = new Raid(
  level,
  p,
  () => {},
  () => writes++,
);
assert(r.start('ak47'));
assert.equal(p.credits, 4800);
const time = r.time;
r.togglePause();
r.update(0.05, { x: 1, z: 0, sprint: false });
assert.equal(r.time, time);
r.togglePause();
r.enemies = [];
r.ammo = 0;
r.reload();
for (let i = 0; i < 45; i++) r.update(0.05, { x: 0, z: 0, sprint: false });
assert.equal(r.ammo, 30);
assert.equal(r.reserve, 120);
r.player = { x: level.loot[0].x, z: level.loot[0].z + 1.3 };
r.interact();
for (let i = 0; i < 26; i++) r.update(0.05, { x: 0, z: 0, sprint: false });
assert.equal(r.openLoot, 'crate-0');
assert(r.take(0));
assert(r.bag.length === 1);
r.bag = Array.from({ length: 12 }, () => ({ ...catalog[0] }));
r.openLoot = 'crate-1';
assert.equal(r.take(0), false);
r.bag = [{ ...catalog[7] }];
r.player = { ...level.extraction };
r.openLoot = null;
r.interact();
for (let i = 0; i < 122; i++) r.update(0.05, { x: 0, z: 0, sprint: false });
assert.equal(r.result, 'extracted');
assert.equal(p.credits, 8500);
assert.equal(p.stash.length, 1);
assert.equal(p.extractions, 1);
r.finish('extracted');
assert.equal(p.extractions, 1);
r.mode = 'menu';
assert.equal(r.sellStash(), 2200);
assert.equal(p.credits, 10700);
r.start('glock');
r.bag = [{ ...catalog[4] }];
r.damage(100);
assert.equal(r.result, 'dead');
assert.equal(p.stash.length, 0);
assert.equal(p.raids, 2);
const empty = { ...level, colliders: [], enemies: [{ x: 0, z: -4 }] };
const s = new Raid(empty, { credits: 0, stash: [], raids: 0, extractions: 0 });
s.start('glock');
s.player = { x: 0, z: 0 };
for (let i = 0; i < 3; i++) {
  s.shotCooldown = 0;
  s.shoot({ x: 0, z: -4 });
}
assert.equal(s.kills, 1);
assert(s.loot.some((c) => c.kind === 'enemy'));
assert(
  segmentBlocked({ x: 0, z: 0 }, { x: 0, z: -5 }, [
    { x: 0, z: -2, w: 3, d: 1, h: 2, name: 'wall' },
  ]),
);
assert(findPath(level.spawn, level.extraction, level).length > 0);
console.log(
  'PASS: all 12 loot points, exit and enemy spawns; collision, pathfinding, pause, reload, search, capacity, shooting, death, extraction, payout and stash sale. ' +
    writes +
    ' persistence writes.',
);
