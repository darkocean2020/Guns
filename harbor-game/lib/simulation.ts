export type Point = { x: number; z: number; y?: number };
export type Rect = Point & {
  w: number;
  d: number;
  h: number;
  name: string;
  base?: number;
};
export type Level = {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  spawn: Point;
  extraction: Point & { radius: number; duration: number };
  colliders: Rect[];
  loot: (Point & { id: string; kind: string })[];
  lights: (Point & { y: number })[];
  enemies: Point[];
};

export type BuildKind = 'wall' | 'floor' | 'stairs';
export const blueprints = {
  wall: { name: '木墙', wood: 6, scrap: 2, hp: 180 },
  floor: { name: '架高地板', wood: 8, scrap: 2, hp: 220 },
  stairs: { name: '楼梯', wood: 10, scrap: 3, hp: 180 },
};
export type BuildPiece = Point & {
  id: number;
  kind: BuildKind;
  rotation: number;
  base: number;
  hp: number;
};
export type ResourcePile = Point & { id: number; remaining: number };
export function buildRect(p: BuildPiece): Rect {
  return {
    x: p.x,
    z: p.z,
    w: p.kind === 'wall' ? (p.rotation % 2 ? 0.22 : 3) : 3,
    d: p.kind === 'wall' ? (p.rotation % 2 ? 3 : 0.22) : 3,
    h: p.kind === 'wall' ? 2.1 : 1.5,
    base: p.base,
    name: 'built-' + p.id,
  };
}
export function surfaceHeight(p: Point, pieces: BuildPiece[]) {
  let height = 0;
  for (const b of pieces) {
    if (
      b.kind === 'wall' ||
      Math.abs(p.x - b.x) > 1.5 ||
      Math.abs(p.z - b.z) > 1.5
    )
      continue;
    if (b.kind === 'floor') height = Math.max(height, 1.5);
    else {
      const a = (b.rotation * Math.PI) / 2,
        localZ = Math.sin(a) * (p.x - b.x) + Math.cos(a) * (p.z - b.z);
      height = Math.max(
        height,
        Math.max(0, Math.min(1.5, (1.5 - localZ) * 0.5)),
      );
    }
  }
  return height;
}

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
    if (a.y !== undefined || b.y !== undefined) {
      const start = (a.y ?? 0) + 0.9,
        delta = (b.y ?? 0) - (a.y ?? 0),
        bottom = r.base ?? 0,
        top = bottom + r.h;
      if (Math.abs(delta) < 1e-8) {
        if (start < bottom || start > top) return false;
      } else {
        let near = (bottom - start) / delta,
          far = (top - start) / delta;
        if (near > far) [near, far] = [far, near];
        t0 = Math.max(t0, near);
        t1 = Math.min(t1, far);
        if (t0 > t1) return false;
      }
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
  buildings: BuildPiece[] = [];
  resources: ResourcePile[] = [];
  wood = 36;
  scrap = 16;
  buildMode = false;
  buildKind: BuildKind = 'wall';
  buildRotation = 0;
  buildTarget: Point = { x: 0, z: 0 };
  buildSerial = 0;
  bag: Item[] = [];
  secure: Item[] = [];
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
  get movementLevel(): Level {
    return {
      ...this.level,
      colliders: [
        ...this.level.colliders,
        ...this.buildings.filter((b) => b.kind === 'wall').map(buildRect),
      ],
    };
  }
  get combatColliders() {
    return [
      ...this.level.colliders,
      ...this.buildings.filter((b) => b.kind !== 'stairs').map(buildRect),
    ];
  }
  get nearbyResource() {
    return this.resources.find(
      (p) =>
        p.remaining > 0 &&
        distance(p, this.player) < 2.3 &&
        (this.player.y ?? 0) < 0.3 &&
        !segmentBlocked(this.player, p, this.level.colliders),
    );
  }
  get selectedBuilding() {
    return this.buildings
      .filter(
        (b) =>
          distance(b, this.buildTarget) < 1.8 && distance(b, this.player) < 7,
      )
      .sort(
        (a, b) => distance(a, this.buildTarget) - distance(b, this.buildTarget),
      )[0];
  }
  plan(
    kind: BuildKind = this.buildKind,
    target: Point = this.buildTarget,
    rotation = this.buildRotation,
  ): BuildPiece {
    const x = Math.round(target.x / 3) * 3,
      z = Math.round(target.z / 3) * 3;
    return {
      id: this.buildSerial,
      kind,
      x,
      z,
      rotation: ((rotation % 4) + 4) % 4,
      base:
        kind === 'wall' &&
        this.buildings.some((b) => b.kind === 'floor' && b.x === x && b.z === z)
          ? 1.5
          : 0,
      hp: blueprints[kind].hp,
    };
  }
  buildReason(plan = this.plan()) {
    if (this.mode !== 'raid') return '仅可在行动中建造';
    if (this.buildings.length >= 40) return '已达到 40 个建筑上限';
    if (distance(plan, this.player) > 7) return '超出建造距离（7 米）';
    if (distance(plan, this.level.extraction) < 5) return '撤离区不能建造';
    const r = buildRect(plan),
      bounds = this.level.bounds;
    if (
      r.x - r.w / 2 < bounds.minX ||
      r.x + r.w / 2 > bounds.maxX ||
      r.z - r.d / 2 < bounds.minZ ||
      r.z + r.d / 2 > bounds.maxZ
    )
      return '超出码头范围';
    const overlap = (a: Rect, b: Rect) =>
      Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.02 &&
      Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 0.02;
    if (this.level.colliders.some((c) => overlap(r, c)))
      return '与港区设施重叠';
    if (
      this.buildings.some(
        (b) =>
          overlap(r, buildRect(b)) &&
          !(plan.kind === 'wall' && b.kind === 'floor'),
      )
    )
      return '与现有建筑重叠';
    if (this.loot.some((c) => c.items.length && inRect(c, r, 0.8)))
      return '请避开物资箱';
    if (this.resources.some((p) => p.remaining > 0 && inRect(p, r, 0.65)))
      return '请避开材料堆';
    if (
      inRect(this.player, r, 0.5) ||
      this.enemies.some((e) => e.hp > 0 && inRect(e, r, 0.5))
    )
      return '位置被角色占用';
    const cost = blueprints[plan.kind];
    if (this.wood < cost.wood || this.scrap < cost.scrap)
      return '木料或废金属不足';
    return '';
  }
  toggleBuild() {
    if (this.mode !== 'raid') return;
    this.buildMode = !this.buildMode;
    this.closeInventory();
    this.mapOpen = false;
    this.search = null;
    this.extracting = false;
  }
  chooseBuild(kind: BuildKind) {
    if (!(kind in blueprints) || this.mode !== 'raid') return;
    this.buildMode = true;
    this.buildKind = kind;
    this.closeInventory();
    this.mapOpen = false;
  }
  rotateBuild() {
    this.buildRotation = (this.buildRotation + 1) % 4;
  }
  placeBuild() {
    if (!this.buildMode || this.inventory || this.openLoot || this.mapOpen)
      return false;
    const plan = this.plan(),
      reason = this.buildReason(plan);
    if (reason) {
      this.notify(reason);
      return false;
    }
    const cost = blueprints[plan.kind];
    this.wood -= cost.wood;
    this.scrap -= cost.scrap;
    this.buildSerial++;
    this.buildings.push(plan);
    this.fx({ type: 'loot', from: plan });
    this.notify('已建造' + cost.name);
    return true;
  }
  demolish() {
    if (this.mode !== 'raid' || !this.buildMode) return false;
    const b = this.selectedBuilding;
    if (!b) {
      this.notify('指向 7 米内的建筑拆除');
      return false;
    }
    if (
      b.kind !== 'wall' &&
      (inRect(this.player, buildRect(b), 0.45) ||
        this.buildings.some(
          (w) => w.kind === 'wall' && w.base > 0 && w.x === b.x && w.z === b.z,
        ))
    ) {
      this.notify('先离开平台并拆掉上方墙体');
      return false;
    }
    this.buildings = this.buildings.filter((p) => p.id !== b.id);
    this.wood += Math.floor(blueprints[b.kind].wood / 2);
    this.scrap += Math.floor(blueprints[b.kind].scrap / 2);
    this.notify('建筑已拆除，返还一半材料');
    return true;
  }
  damageBuilding(id: number, damage: number) {
    const b = this.buildings.find((p) => p.id === id);
    if (!b) return;
    b.hp -= damage;
    this.fx({ type: 'impact', from: { ...b, y: b.base }, surface: 'wood' });
    if (b.hp <= 0) {
      this.buildings = this.buildings.filter((p) => p.id !== id);
      this.notify('木墙被摧毁');
    }
  }
  movePlayer(dx: number, dz: number) {
    let p = { ...this.player };
    for (const [x, z] of [
      [dx, 0],
      [0, dz],
    ]) {
      const next = { ...p, x: p.x + x, z: p.z + z };
      const h = surfaceHeight(next, this.buildings);
      const level = {
        ...this.movementLevel,
        colliders: this.movementLevel.colliders.filter(
          (c) => (c.base ?? 0) < Math.max(h, p.y ?? 0) + 1.3,
        ),
      };
      if (!blocked(next, level) && h - (p.y ?? 0) < 0.3) {
        p = next;
        p.y = h;
      }
    }
    return p;
  }
  get weight() {
    return [...this.bag, ...this.secure].reduce((sum, i) => sum + i.weight, 0);
  }
  get value() {
    return this.bag.reduce((sum, i) => sum + i.value, 0);
  }
  get secureValue() {
    return this.secure.reduce((sum, i) => sum + i.value, 0);
  }
  get hasManifest() {
    return [...this.bag, ...this.secure].some((i) => i.id === 'manifest');
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
    this.player = { ...this.level.spawn, y: 0 };
    this.buildings = [];
    this.buildMode = false;
    this.buildSerial = 0;
    this.wood = 36;
    this.scrap = 16;
    this.buildRotation = 0;
    this.buildKind = 'wall';
    this.resources = [
      [-22, 17],
      [-12, 12],
      [7, 17],
      [-23, -4],
      [0, -10],
      [17, -23],
    ].map(([x, z], id) => ({ id, x, z, remaining: 3 }));
    this.hp = 100;
    this.stamina = 100;
    this.ammo = gun.mag;
    this.reserve = gun.mag * 5;
    this.medkits = 2;
    this.time = 480;
    this.elapsed = 0;
    this.kills = 0;
    this.bag = [];
    this.secure = [];
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
  closeInventory() {
    this.openLoot = null;
    this.inventory = false;
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
    if (!this.buildMode && this.nearbyResource) {
      const pile = this.nearbyResource;
      pile.remaining--;
      this.wood += 12;
      this.scrap += 5;
      this.fx({ type: 'loot', from: pile });
      this.notify('回收木料 +12 / 废金属 +5');
      return;
    }
    if (this.buildMode) return;
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
  take(index: number, destination: 'bag' | 'secure' = 'bag') {
    if (this.mode !== 'raid' || !Number.isInteger(index) || index < 0)
      return false;
    const c = this.loot.find((c) => c.id === this.openLoot);
    const item = c?.items[index];
    if (!item) return false;
    const container = destination === 'secure' ? this.secure : this.bag;
    if (container.length >= (destination === 'secure' ? 2 : 12)) {
      this.notify(
        destination === 'secure' ? '安全箱已满（2 格）' : '背包格子已满',
      );
      return false;
    }
    if (this.weight + item.weight > 12) {
      this.notify('背包负重已满，可丢弃物品腾出空间');
      return false;
    }
    container.push(item);
    c!.items.splice(index, 1);
    this.fx({ type: 'loot', from: this.player });
    if (!c!.items.length) {
      this.openLoot = null;
      this.inventory = true;
    }
    return true;
  }
  takeAll() {
    const c = this.loot.find((c) => c.id === this.openLoot);
    if (!c) return;
    for (let i = c.items.length - 1; i >= 0; i--) this.take(i);
  }
  transfer(
    index: number,
    source: 'bag' | 'secure',
    destination: 'bag' | 'secure',
    targetIndex?: number,
  ) {
    if (this.mode !== 'raid' || !Number.isInteger(index) || index < 0)
      return false;
    const from = source === 'bag' ? this.bag : this.secure,
      to = destination === 'bag' ? this.bag : this.secure;
    const item = from[index];
    if (!item) return false;
    const target =
      targetIndex === undefined
        ? to.length
        : Math.min(Math.max(0, targetIndex), to.length);
    if (!Number.isInteger(target)) return false;
    if (from === to) {
      from.splice(index, 1);
      from.splice(Math.min(target, from.length), 0, item);
      return true;
    }
    if (to.length >= (destination === 'secure' ? 2 : 12)) {
      if (targetIndex === undefined || !to[target]) {
        this.notify(
          destination === 'secure' ? '安全箱已满（2 格）' : '背包格子已满',
        );
        return false;
      }
      from[index] = to[target];
      to[target] = item;
    } else {
      from.splice(index, 1);
      to.splice(target, 0, item);
    }
    this.notify(
      destination === 'secure' ? '已放入安全箱，死亡后仍保留' : '已移回背包',
    );
    return true;
  }
  drop(index: number, source: 'bag' | 'secure' = 'bag') {
    if (this.mode === 'raid' && Number.isInteger(index) && index >= 0)
      (source === 'secure' ? this.secure : this.bag).splice(index, 1);
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
      this.buildMode ||
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
        y: this.player.y ?? 0,
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
          !segmentBlocked(
            { ...this.player, y: this.player.y ?? 0 },
            { ...e, y: 0 },
            this.combatColliders,
          )
        ) {
          hit = e;
          nearest = along;
        }
      }
      let dest = hit ? { x: hit.x, z: hit.z, y: 0 } : end;
      const wall =
        !hit && segmentBlocked(this.player, end, this.combatColliders);
      if (wall) {
        let near = 0,
          far = 1;
        for (let step = 0; step < 16; step++) {
          const t = (near + far) / 2;
          const point = {
            x: this.player.x + (end.x - this.player.x) * t,
            z: this.player.z + (end.z - this.player.z) * t,
            y: this.player.y ?? 0,
          };
          if (segmentBlocked(this.player, point, this.combatColliders)) far = t;
          else near = t;
        }
        dest = {
          x: this.player.x + (end.x - this.player.x) * far,
          z: this.player.z + (end.z - this.player.z) * far,
          y: this.player.y ?? 0,
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
      if (wall) {
        const structure = this.buildings.find(
          (b) => b.kind === 'wall' && inRect(dest, buildRect(b), 0.02),
        );
        if (structure) this.damageBuilding(structure.id, this.gun.damage);
      }
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
    this.buildMode = false;
    this.profile.raids++;
    this.profile.stash.push(...this.secure.map((i) => ({ ...i })));
    if (result === 'extracted') {
      this.profile.extractions++;
      this.profile.stash.push(...this.bag);
      this.questReward = this.hasManifest ? 2500 : 0;
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
      this.player = this.movePlayer(
        (input.x / n) * dt * speed,
        (input.z / n) * dt * speed,
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
          dist < 13 &&
          !segmentBlocked(
            { ...e, y: 0 },
            { ...this.player, y: this.player.y ?? 0 },
            this.combatColliders,
          );
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
      if (!sees && dist < 12 && e.cooldown <= 0) {
        const wall = this.buildings
          .filter(
            (b) =>
              b.kind === 'wall' &&
              segmentBlocked({ ...e, y: 0 }, this.player, [buildRect(b)]) &&
              !segmentBlocked(e, b, this.level.colliders),
          )
          .sort((a, b) => distance(e, a) - distance(e, b))[0];
        if (wall) {
          e.alert = true;
          e.memory = 5;
          e.lastSeen = { ...this.player };
          e.cooldown = 1.4;
          this.fx({ type: 'enemy-shot', from: { x: e.x, z: e.z }, to: wall });
          this.damageBuilding(wall.id, 22);
        }
      }
      const patrol = {
        x: e.home.x + Math.sin(this.elapsed * 0.2 + e.id) * 2,
        z: e.home.z + Math.cos(this.elapsed * 0.2 + e.id) * 2,
      };
      const target = e.alert && e.lastSeen ? e.lastSeen : patrol;
      if (!(sees && dist < 8)) {
        let waypoint = target;
        if (
          segmentBlocked(
            e,
            target,
            [
              ...this.movementLevel.colliders,
              ...this.buildings.filter((b) => b.kind !== 'wall').map(buildRect),
            ],
            0.4,
          )
        ) {
          if (e.repath <= 0) {
            e.path = findPath(e, target, {
              ...this.movementLevel,
              colliders: [
                ...this.movementLevel.colliders,
                ...this.buildings
                  .filter((b) => b.kind !== 'wall')
                  .map(buildRect),
              ],
            });
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
              {
                ...this.movementLevel,
                colliders: [
                  ...this.movementLevel.colliders,
                  ...this.buildings
                    .filter((b) => b.kind !== 'wall')
                    .map(buildRect),
                ],
              },
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
