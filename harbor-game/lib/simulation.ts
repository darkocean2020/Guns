export type Point = { x: number; z: number };
export type Rect = Point & { w: number; d: number; h: number; name: string };
export type Level = {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  spawn: Point;
  extraction: Point & { radius: number; duration: number };
  colliders: Rect[];
  loot: (Point & { id: string; kind: string })[];
  lights: (Point & { y: number })[];
  enemies: Point[];
};
export const guns = [
  {
    id: 'glock',
    name: 'Glock 17',
    category: '轻型手枪',
    mag: 17,
    damage: 28,
    interval: 0.22,
    reload: 1.4,
    range: 20,
    cost: 0,
    auto: false,
  },
  {
    id: 'ak47',
    name: 'AK-47',
    category: '自动步枪',
    mag: 30,
    damage: 35,
    interval: 0.13,
    reload: 2.1,
    range: 25,
    cost: 1200,
    auto: true,
  },
  {
    id: 'ar15',
    name: 'AR15',
    category: '精准步枪',
    mag: 30,
    damage: 40,
    interval: 0.19,
    reload: 1.8,
    range: 28,
    cost: 1500,
    auto: false,
  },
  {
    id: 'shotgun',
    name: 'Pump Shotgun',
    category: '泵动霰弹枪',
    mag: 6,
    damage: 18,
    interval: 0.8,
    reload: 2.5,
    range: 14,
    cost: 800,
    auto: false,
  },
  {
    id: 'kar98k',
    name: 'Kar98k',
    category: '栓动步枪',
    mag: 5,
    damage: 100,
    interval: 1.1,
    reload: 2.6,
    range: 34,
    cost: 1800,
    auto: false,
  },
  {
    id: 'revolver',
    name: 'Revolver',
    category: '左轮手枪',
    mag: 6,
    damage: 58,
    interval: 0.43,
    reload: 1.9,
    range: 21,
    cost: 550,
    auto: false,
  },
  {
    id: '1911',
    name: '1911',
    category: '半自动手枪',
    mag: 7,
    damage: 43,
    interval: 0.28,
    reload: 1.5,
    range: 20,
    cost: 450,
    auto: false,
  },
];
export type Item = {
  id: string;
  name: string;
  value: number;
  weight: number;
  rarity: 'common' | 'rare' | 'epic';
  category: string;
};
export const catalog: Item[] = [
  {
    id: 'wire',
    name: '铜线束',
    value: 220,
    weight: 1,
    rarity: 'common',
    category: '材料',
  },
  {
    id: 'parts',
    name: '精密零件',
    value: 580,
    weight: 2,
    rarity: 'rare',
    category: '材料',
  },
  {
    id: 'tea',
    name: '罐装抹茶',
    value: 160,
    weight: 1,
    rarity: 'common',
    category: '食品',
  },
  {
    id: 'radio',
    name: '港务无线电',
    value: 980,
    weight: 2,
    rarity: 'rare',
    category: '电子',
  },
  {
    id: 'chip',
    name: '加密芯片',
    value: 1800,
    weight: 1,
    rarity: 'epic',
    category: '电子',
  },
  {
    id: 'med',
    name: '医疗耗材',
    value: 450,
    weight: 1,
    rarity: 'common',
    category: '医疗',
  },
  {
    id: 'watch',
    name: '潜水腕表',
    value: 1400,
    weight: 1,
    rarity: 'epic',
    category: '贵重',
  },
  {
    id: 'manifest',
    name: '港口货运清单',
    value: 2200,
    weight: 1,
    rarity: 'epic',
    category: '任务',
  },
];
export type Profile = {
  credits: number;
  stash: Item[];
  raids: number;
  extractions: number;
};
export type Enemy = Point & {
  id: number;
  hp: number;
  angle: number;
  home: Point;
  alert: boolean;
  cooldown: number;
  path: Point[];
  repath: number;
  lastSeen: Point | null;
  memory: number;
  deathTime: number;
};
export type Loot = Point & {
  id: string;
  kind: string;
  items: Item[];
  searched: boolean;
};
export type FX = {
  type: 'shot' | 'enemy-shot' | 'hit' | 'death' | 'heal' | 'loot' | 'impact';
  from: Point;
  to?: Point;
  primary?: boolean;
  enemyId?: number;
  damage?: number;
  surface?: string;
};
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export function inRect(p: Point, r: Rect, pad = 0) {
  return (
    Math.abs(p.x - r.x) < r.w / 2 + pad && Math.abs(p.z - r.z) < r.d / 2 + pad
  );
}
export function blocked(p: Point, level: Level, pad = 0.32) {
  return (
    p.x < level.bounds.minX + pad ||
    p.x > level.bounds.maxX - pad ||
    p.z < level.bounds.minZ + pad ||
    p.z > level.bounds.maxZ - pad ||
    level.colliders.some((r) => inRect(p, r, pad))
  );
}
export function segmentBlocked(a: Point, b: Point, rects: Rect[], pad = 0) {
  return rects.some((r) => {
    let t0 = 0,
      t1 = 1;
    for (const axis of ['x', 'z'] as const) {
      const delta = b[axis] - a[axis],
        extent = (axis === 'x' ? r.w : r.d) / 2 + pad,
        min = r[axis] - extent,
        max = r[axis] + extent;
      if (Math.abs(delta) < 1e-8) {
        if (a[axis] < min || a[axis] > max) return false;
        continue;
      }
      let near = (min - a[axis]) / delta,
        far = (max - a[axis]) / delta;
      if (near > far) [near, far] = [far, near];
      t0 = Math.max(t0, near);
      t1 = Math.min(t1, far);
      if (t0 > t1) return false;
    }
    return t1 >= 0 && t0 <= 1;
  });
}
export function move(
  p: Point,
  dx: number,
  dz: number,
  level: Level,
  pad = 0.32,
) {
  const next = { ...p };
  if (!blocked({ x: next.x + dx, z: next.z }, level, pad)) next.x += dx;
  if (!blocked({ x: next.x, z: next.z + dz }, level, pad)) next.z += dz;
  return next;
}
export function findPath(a: Point, b: Point, level: Level): Point[] {
  const size = 1,
    start = { x: Math.round(a.x), z: Math.round(a.z) },
    goal = { x: Math.round(b.x), z: Math.round(b.z) },
    key = (p: Point) => `${p.x},${p.z}`;
  const open = [start],
    came = new Map<string, Point>(),
    cost = new Map([[key(start), 0]]),
    closed = new Set<string>();
  let end: Point | null = null;
  for (let iteration = 0; open.length && iteration < 1800; iteration++) {
    let best = 0;
    for (let i = 1; i < open.length; i++)
      if (
        cost.get(key(open[i]))! + distance(open[i], goal) <
        cost.get(key(open[best]))! + distance(open[best], goal)
      )
        best = i;
    const current = open.splice(best, 1)[0],
      ck = key(current);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (distance(current, goal) < 1.5) {
      end = current;
      break;
    }
    for (const [dx, dz] of [
      [size, 0],
      [-size, 0],
      [0, size],
      [0, -size],
    ]) {
      const next = { x: current.x + dx, z: current.z + dz },
        nk = key(next);
      if (closed.has(nk) || blocked(next, level, 0.4)) continue;
      const g = cost.get(ck)! + 1;
      if (g < (cost.get(nk) ?? Infinity)) {
        cost.set(nk, g);
        came.set(nk, current);
        open.push(next);
      }
    }
  }
  if (!end) return [];
  const path: Point[] = [];
  while (key(end) !== key(start)) {
    path.unshift(end);
    end = came.get(key(end))!;
  }
  return path;
}
export class Raid {
  mode: 'menu' | 'raid' | 'paused' | 'result' = 'menu';
  gun = guns[0];
  player: Point;
  hp = 100;
  stamina = 100;
  angle = 0;
  ammo = 17;
  reserve = 102;
  medkits = 2;
  time = 480;
  elapsed = 0;
  kills = 0;
  bag: Item[] = [];
  enemies: Enemy[] = [];
  loot: Loot[] = [];
  openLoot: string | null = null;
  inventory = false;
  mapOpen = false;
  reloadLeft = 0;
  shotCooldown = 0;
  healLeft = 0;
  search: { id: string; progress: number } | null = null;
  extracting = false;
  extractProgress = 0;
  result: 'extracted' | 'dead' | 'timeout' | null = null;
  message = '';
  messageUntil = 0;
  lastDamage = -10;
  questReward = 0;
  constructor(
    public level: Level,
    public profile: Profile,
    public fx: (fx: FX) => void = () => {},
    public persist: (p: Profile) => void = () => {},
  ) {
    this.player = { ...level.spawn };
  }
  get weight() {
    return this.bag.reduce((sum, i) => sum + i.weight, 0);
  }
  get value() {
    return this.bag.reduce((sum, i) => sum + i.value, 0);
  }
  get nearby() {
    return this.loot
      .filter(
        (c) =>
          c.items.length > 0 &&
          distance(this.player, c) < 2.2 &&
          !segmentBlocked(
            this.player,
            c,
            this.level.colliders.filter((r) => r.name !== 'chest'),
          ),
      )
      .sort((a, b) => distance(a, this.player) - distance(b, this.player))[0];
  }
  get atExit() {
    return (
      distance(this.player, this.level.extraction) <
      this.level.extraction.radius
    );
  }
  notify(message: string) {
    this.message = message;
    this.messageUntil = this.elapsed + 3;
  }
  start(id: string) {
    const gun = guns.find((g) => g.id === id);
    if (!gun || this.profile.credits < gun.cost) return false;
    this.gun = gun;
    this.profile.credits -= gun.cost;
    this.persist(this.profile);
    this.player = { ...this.level.spawn };
    this.hp = 100;
    this.stamina = 100;
    this.ammo = gun.mag;
    this.reserve = gun.mag * 5;
    this.medkits = 2;
    this.time = 480;
    this.elapsed = 0;
    this.kills = 0;
    this.bag = [];
    this.openLoot = null;
    this.inventory = false;
    this.mapOpen = false;
    this.reloadLeft = 0;
    this.shotCooldown = 0;
    this.healLeft = 0;
    this.search = null;
    this.extracting = false;
    this.extractProgress = 0;
    this.result = null;
    this.lastDamage = -10;
    this.questReward = 0;
    this.enemies = this.level.enemies.map((p, i) => ({
      ...p,
      id: i,
      hp: 80,
      angle: 0,
      home: { ...p },
      alert: false,
      cooldown: 1.7 + i * 0.21,
      path: [],
      repath: 0,
      lastSeen: null,
      memory: 0,
      deathTime: 0,
    }));
    this.loot = this.level.loot.map((c, i) => ({
      ...c,
      searched: false,
      items:
        c.id === 'crate-6'
          ? [{ ...catalog[7] }, { ...catalog[4] }]
          : c.kind === 'medical'
            ? [{ ...catalog[5] }, { ...catalog[2] }]
            : c.kind === 'valuable'
              ? [{ ...catalog[3] }, { ...catalog[6] }]
              : [{ ...catalog[i % 4] }, { ...catalog[(i + 2) % 6] }],
    }));
    this.mode = 'raid';
    this.notify('已进入大井码头。海关清单位于北侧仓库。');
    return true;
  }
  togglePause() {
    if (this.mode === 'raid') this.mode = 'paused';
    else if (this.mode === 'paused') this.mode = 'raid';
  }
  interact() {
    if (this.mode !== 'raid') return;
    if (this.openLoot) {
      this.openLoot = null;
      return;
    }
    if (this.atExit) {
      this.extracting = true;
      this.extractProgress = 0;
      this.notify('快艇正在靠岸，守住撤离区域。');
      return;
    }
    const c = this.nearby;
    if (!c) {
      this.notify('靠近补给箱后按 E 搜索');
      return;
    }
    if (c.searched) this.openLoot = c.id;
    else this.search = { id: c.id, progress: 0 };
  }
  take(index: number) {
    const c = this.loot.find((c) => c.id === this.openLoot);
    const item = c?.items[index];
    if (!item) return false;
    if (this.weight + item.weight > 12) {
      this.notify('背包负重已满，可丢弃物品腾出空间');
      return false;
    }
    this.bag.push(item);
    c!.items.splice(index, 1);
    this.fx({ type: 'loot', from: this.player });
    if (!c!.items.length) this.openLoot = null;
    return true;
  }
  takeAll() {
    const c = this.loot.find((c) => c.id === this.openLoot);
    if (!c) return;
    for (let i = c.items.length - 1; i >= 0; i--) this.take(i);
  }
  drop(index: number) {
    if (this.mode === 'raid') this.bag.splice(index, 1);
  }
  reload() {
    if (
      this.mode !== 'raid' ||
      this.reloadLeft ||
      this.ammo === this.gun.mag ||
      !this.reserve
    )
      return;
    this.reloadLeft = this.gun.reload;
    this.healLeft = 0;
    this.search = null;
  }
  heal() {
    if (
      this.mode !== 'raid' ||
      this.healLeft ||
      this.hp >= 100 ||
      !this.medkits
    )
      return;
    this.healLeft = 2;
    this.reloadLeft = 0;
    this.search = null;
    this.notify('正在包扎，保持隐蔽');
  }
  shoot(target: Point) {
    if (
      this.mode !== 'raid' ||
      this.shotCooldown > 0 ||
      this.reloadLeft > 0 ||
      this.healLeft > 0 ||
      this.openLoot ||
      this.inventory ||
      this.mapOpen
    )
      return false;
    if (!this.ammo) {
      this.reload();
      return false;
    }
    this.ammo--;
    this.shotCooldown = this.gun.interval;
    this.search = null;
    this.extracting = false;
    this.extractProgress = 0;
    this.angle = Math.atan2(
      target.x - this.player.x,
      -(target.z - this.player.z),
    );
    const pellets = this.gun.id === 'shotgun' ? 6 : 1;
    for (let i = 0; i < pellets; i++) {
      const a = this.angle + (pellets > 1 ? (i - (pellets - 1) / 2) * 0.04 : 0);
      const end = {
        x: this.player.x + Math.sin(a) * this.gun.range,
        z: this.player.z - Math.cos(a) * this.gun.range,
      };
      let hit: Enemy | null = null;
      let nearest = this.gun.range;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const vx = e.x - this.player.x,
          vz = e.z - this.player.z,
          along = vx * Math.sin(a) - vz * Math.cos(a),
          side = Math.abs(vx * Math.cos(a) + vz * Math.sin(a));
        if (
          along > 0 &&
          along < nearest &&
          side < 0.55 &&
          !segmentBlocked(this.player, e, this.level.colliders)
        ) {
          hit = e;
          nearest = along;
        }
      }
      let dest = hit ? { x: hit.x, z: hit.z } : end;
      const wall =
        !hit && segmentBlocked(this.player, end, this.level.colliders);
      if (wall) {
        let near = 0,
          far = 1;
        for (let step = 0; step < 16; step++) {
          const t = (near + far) / 2;
          const point = {
            x: this.player.x + (end.x - this.player.x) * t,
            z: this.player.z + (end.z - this.player.z) * t,
          };
          if (segmentBlocked(this.player, point, this.level.colliders)) far = t;
          else near = t;
        }
        dest = {
          x: this.player.x + (end.x - this.player.x) * far,
          z: this.player.z + (end.z - this.player.z) * far,
        };
      }
      this.fx({
        type: 'shot',
        from: { ...this.player },
        to: dest,
        primary: i === 0,
      });
      if (wall)
        this.fx({
          type: 'impact',
          from: dest,
          surface: this.level.colliders.find((r) => inRect(dest, r, 0.01))
            ?.name,
        });
      if (hit) {
        hit.hp -= this.gun.damage;
        hit.alert = true;
        hit.lastSeen = { ...this.player };
        hit.memory = 8;
        this.fx({
          type: 'hit',
          from: { x: hit.x, z: hit.z },
          enemyId: hit.id,
          damage: Math.min(this.gun.damage, hit.hp + this.gun.damage),
        });
        if (hit.hp <= 0) {
          this.kills++;
          hit.deathTime = this.elapsed;
          this.fx({
            type: 'death',
            from: { x: hit.x, z: hit.z },
            enemyId: hit.id,
          });
          this.loot.push({
            id: 'enemy-' + hit.id,
            x: hit.x,
            z: hit.z,
            kind: 'enemy',
            searched: false,
            items: [{ ...catalog[hit.id % 4] }],
          });
        }
      }
    }
    for (const e of this.enemies)
      if (e.hp > 0 && distance(e, this.player) < 15) {
        e.lastSeen = { ...this.player };
        e.memory = 5;
      }
    return true;
  }
  damage(amount: number) {
    if (this.mode !== 'raid') return;
    this.hp = Math.max(0, this.hp - amount);
    this.lastDamage = this.elapsed;
    this.healLeft = 0;
    this.search = null;
    this.extracting = false;
    this.extractProgress = 0;
    this.fx({ type: 'hit', from: { ...this.player } });
    if (this.hp === 0) this.finish('dead');
  }
  finish(result: 'extracted' | 'dead' | 'timeout') {
    if (this.mode !== 'raid') return;
    this.result = result;
    this.mode = 'result';
    this.openLoot = null;
    this.inventory = false;
    this.search = null;
    this.extracting = false;
    this.profile.raids++;
    if (result === 'extracted') {
      this.profile.extractions++;
      this.profile.stash.push(...this.bag);
      this.questReward = this.bag.some((i) => i.id === 'manifest') ? 2500 : 0;
      this.profile.credits += this.gun.cost + this.questReward;
    }
    this.persist(this.profile);
  }
  sellStash() {
    if (this.mode !== 'menu') return 0;
    const value = this.profile.stash.reduce((sum, i) => sum + i.value, 0);
    this.profile.credits += value;
    this.profile.stash = [];
    this.persist(this.profile);
    return value;
  }
  update(dt: number, input: { x: number; z: number; sprint: boolean }) {
    if (this.mode !== 'raid') return;
    dt = Math.min(dt, 0.05);
    this.elapsed += dt;
    this.time = Math.max(0, this.time - dt);
    if (!this.time) {
      this.finish('timeout');
      return;
    }
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    if (this.reloadLeft > 0) {
      this.reloadLeft -= dt;
      if (this.reloadLeft <= 0) {
        const count = Math.min(this.gun.mag - this.ammo, this.reserve);
        this.ammo += count;
        this.reserve -= count;
        this.reloadLeft = 0;
      }
    }
    if (this.healLeft > 0) {
      this.healLeft -= dt;
      if (this.healLeft <= 0) {
        this.hp = Math.min(100, this.hp + 55);
        this.medkits--;
        this.healLeft = 0;
        this.fx({ type: 'heal', from: this.player });
      }
    }
    const moving =
      !this.openLoot &&
      !this.inventory &&
      !this.mapOpen &&
      (input.x !== 0 || input.z !== 0);
    const sprint = moving && input.sprint && this.stamina > 1 && !this.healLeft;
    this.stamina = Math.max(
      0,
      Math.min(100, this.stamina + dt * (sprint ? -25 : 16)),
    );
    if (moving) {
      const n = Math.hypot(input.x, input.z),
        speed = (sprint ? 6.2 : 3.6) * (this.healLeft ? 0.3 : 1);
      this.player = move(
        this.player,
        (input.x / n) * dt * speed,
        (input.z / n) * dt * speed,
        this.level,
      );
      this.search = null;
    }
    if (this.search) {
      const c = this.loot.find((c) => c.id === this.search!.id);
      if (!c || distance(c, this.player) > 2.3) this.search = null;
      else {
        this.search.progress += dt;
        if (this.search.progress >= 1.2) {
          c.searched = true;
          this.openLoot = c.id;
          this.search = null;
        }
      }
    }
    if (this.extracting) {
      if (!this.atExit) {
        this.extracting = false;
        this.extractProgress = 0;
      } else {
        this.extractProgress += dt;
        if (this.extractProgress >= this.level.extraction.duration) {
          this.finish('extracted');
          return;
        }
      }
    }
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dist = distance(e, this.player),
        sees =
          dist < 13 && !segmentBlocked(e, this.player, this.level.colliders);
      e.cooldown -= dt;
      e.repath -= dt;
      e.memory = Math.max(0, e.memory - dt);
      if (sees) {
        e.alert = true;
        e.memory = 5;
        e.lastSeen = { ...this.player };
        e.angle = Math.atan2(this.player.x - e.x, -(this.player.z - e.z));
        if (dist < 11 && e.cooldown <= 0) {
          e.cooldown = 1.25 + (e.id % 3) * 0.16;
          this.fx({
            type: 'enemy-shot',
            from: { x: e.x, z: e.z },
            to: { ...this.player },
          });
          if (this.elapsed > 4) this.damage(sprint ? 5 : 9);
        }
      } else e.alert = e.memory > 0;
      const patrol = {
        x: e.home.x + Math.sin(this.elapsed * 0.2 + e.id) * 2,
        z: e.home.z + Math.cos(this.elapsed * 0.2 + e.id) * 2,
      };
      const target = e.alert && e.lastSeen ? e.lastSeen : patrol;
      if (!(sees && dist < 8)) {
        let waypoint = target;
        if (segmentBlocked(e, target, this.level.colliders, 0.4)) {
          if (e.repath <= 0) {
            e.path = findPath(e, target, this.level);
            e.repath = 0.8;
          }
          if (e.path.length && distance(e, e.path[0]) < 0.5) e.path.shift();
          if (!e.path.length) continue;
          waypoint = e.path[0];
        }
        const d = distance(e, waypoint);
        if (d > 0.1) {
          const speed = e.alert ? 2.35 : 1.05,
            p = move(
              e,
              ((waypoint.x - e.x) / d) * dt * speed,
              ((waypoint.z - e.z) / d) * dt * speed,
              this.level,
              0.38,
            );
          if (!sees) e.angle = Math.atan2(p.x - e.x, -(p.z - e.z));
          e.x = p.x;
          e.z = p.z;
        }
      }
      if (this.mode !== 'raid') break;
    }
  }
}
