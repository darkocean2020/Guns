import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';
const js = ts.transpileModule(fs.readFileSync('lib/simulation.ts', 'utf8'), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const {
  Raid,
  blueprints,
  surfaceHeight,
  segmentBlocked,
  blocked,
  findPath,
} = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);
const level = {
  bounds: { minX: -25, maxX: 25, minZ: -24, maxZ: 24 },
  spawn: { x: 0, z: 5 },
  extraction: { x: 21, z: -22, radius: 2.5, duration: 6 },
  colliders: [],
  loot: [],
  lights: [],
  enemies: [],
};
const r = new Raid(level, {
  credits: 6000,
  stash: [],
  raids: 0,
  extractions: 0,
});
r.start('glock');
r.resources = [];
r.toggleBuild();
r.buildTarget = { x: 0.2, z: 0.4 };
assert.equal(r.plan().x, 0);
assert.equal(r.plan().z, 0);
assert(r.placeBuild());
assert.equal(r.wood, 30);
assert.equal(r.scrap, 14);
assert(!r.placeBuild(), 'overlap rejected');
assert.equal(r.wood, 30);
assert(
  segmentBlocked(
    { x: 0, z: 4, y: 0 },
    { x: 0, z: -4, y: 0 },
    r.combatColliders,
  ),
  'wall blocks shots',
);
r.player = { x: 0, z: 0.5, y: 0 };
assert(r.movePlayer(0, -0.3).z > 0.22, 'wall blocks walking');
r.buildTarget = { x: 0, z: 0 };
assert(r.demolish());
assert.equal(r.wood, 33);
assert.equal(r.scrap, 15);
assert.equal(r.buildings.length, 0);
r.start('glock');
r.resources = [];
r.player = { x: 0, z: 4, y: 0 };
r.chooseBuild('stairs');
r.buildTarget = { x: 0, z: 0 };
assert(r.placeBuild());
r.chooseBuild('floor');
r.buildTarget = { x: 0, z: -3 };
assert(r.placeBuild());
r.player = { x: 0, z: 1.65, y: 0 };
for (let i = 0; i < 44; i++) r.player = r.movePlayer(0, -0.1);
assert(Math.abs(r.player.y - 1.5) < 0.001, 'stairs reach platform');
assert(r.player.z < -2.6);
r.buildTarget = { x: 0, z: -3 };
assert(!r.demolish(), 'cannot demolish under player');
r.player = { x: 1.7, z: -3, y: 0 };
assert(r.movePlayer(-0.3, 0).x === 1.7, 'cannot climb vertical platform side');
r.player = { x: 0, z: -4.1, y: 1.5 };
r.chooseBuild('wall');
assert(r.placeBuild(), 'wall can sit on platform');
assert.equal(r.buildings.at(-1).base, 1.5);
r.player = { x: 4, z: -3, y: 0 };
r.buildKind = 'floor';
assert(!r.demolish(), 'platform support remains under elevated wall');
for (let rotation = 0; rotation < 4; rotation++) {
  const p = { id: 100, kind: 'stairs', x: 0, z: 0, rotation, base: 0, hp: 100 },
    a = (rotation * Math.PI) / 2;
  const low = { x: Math.sin(a) * 1.45, z: Math.cos(a) * 1.45 },
    high = { x: -Math.sin(a) * 1.45, z: -Math.cos(a) * 1.45 };
  assert(surfaceHeight(low, [p]) < 0.1);
  assert(surfaceHeight(high, [p]) > 1.4);
}
assert(
  !segmentBlocked({ x: 0, z: 4, y: 2 }, { x: 0, z: -4, y: 2 }, [
    { x: 0, z: 0, w: 3, d: 0.2, h: 2.1, name: 'wall' },
  ]),
  'elevated ray clears low cover',
);
assert(
  segmentBlocked({ x: 0, z: 4, y: 0 }, { x: 0, z: -4, y: 0 }, [
    { x: 0, z: 0, w: 3, d: 0.2, h: 2.1, name: 'wall' },
  ]),
);
r.start('glock');
r.player = { x: -22, z: 17, y: 0 };
const initial = r.wood;
for (let i = 0; i < 3; i++) r.interact();
assert.equal(r.wood, initial + 36);
assert.equal(r.resources[0].remaining, 0);
r.interact();
assert.equal(r.wood, initial + 36, 'depleted pile cannot farm forever');
r.start('glock');
r.resources = [];
r.buildMode = true;
r.wood = 0;
r.buildTarget = { x: 0, z: 0 };
assert(!r.placeBuild());
r.wood = 100;
r.scrap = 100;
r.player = { x: 21, z: -19, y: 0 };
r.buildTarget = { x: 21, z: -21 };
assert(!r.placeBuild(), 'exit protected');
r.player = { x: 0, z: 5, y: 0 };
r.buildTarget = { x: 0, z: 0 };
assert(r.placeBuild());
r.buildMode = false;
assert(r.shoot({ x: 0, z: -4 }));
assert.equal(r.buildings[0].hp, blueprints.wall.hp - r.gun.damage);
r.damageBuilding(r.buildings[0].id, 999);
assert.equal(r.buildings.length, 0);
r.mode = 'paused';
r.buildMode = true;
assert(!r.placeBuild(), 'pause prevents build');
r.mode = 'raid';
r.finish('dead');
r.start('glock');
assert.equal(r.buildings.length, 0);
assert.equal(r.wood, 36);
const map = JSON.parse(fs.readFileSync('public/world/level.json', 'utf8'));
const actual = new Raid(map, {
  credits: 0,
  stash: [],
  raids: 0,
  extractions: 0,
});
actual.start('glock');
assert(
  actual.resources.every(
    (p) => p.x >= map.bounds.minX && p.x <= map.bounds.maxX,
  ),
);
for (const kind of ['wall', 'floor', 'stairs', 'resources']) {
  const b = fs.readFileSync('public/world/build-' + kind + '.glb');
  const g = await new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    '',
  );
  const size = new Box3().setFromObject(g.scene).getSize(new Vector3());
  assert(size.x > 1 && size.x < 3.2, 'model dimensions ' + kind);
  if (kind === 'stairs' || kind === 'floor')
    assert(size.y > 1.4 && size.y < 1.6);
}
const combat = new Raid(
  { ...level, enemies: [{ x: 0, z: -5 }] },
  { credits: 0, stash: [], raids: 0, extractions: 0 },
);
combat.start('glock');
combat.resources = [];
combat.buildMode = true;
combat.buildTarget = { x: 0, z: 0 };
assert(combat.placeBuild());
combat.buildMode = false;
combat.elapsed = 5;
combat.enemies[0].cooldown = 0;
combat.update(0.05, { x: 0, z: 0, sprint: false });
assert.equal(combat.hp, 100, 'wall protects player');
assert(
  combat.buildings[0].hp < blueprints.wall.hp,
  'enemy attacks blocking wall',
);
for (const pile of actual.resources) {
  assert(!blocked(pile, map), 'resource position is walkable');
  assert(findPath(map.spawn, pile, map).length > 0, 'resource pile reachable');
}
console.log(
  'PASS: build cost, grid, collision, stairs in four rotations, platform access, support protection, salvage depletion, ray elevation, durability, pause/reset, model dimensions.',
);

