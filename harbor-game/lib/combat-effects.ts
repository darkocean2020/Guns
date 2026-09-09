import * as T from 'three';
import type { FX, Point } from './simulation';
export const weaponFeel: Record<
  string,
  { kick: number; flash: number; bass: number; tail: number }
> = {
  glock: { kick: 0.55, flash: 0.8, bass: 115, tail: 0.16 },
  '1911': { kick: 0.75, flash: 0.95, bass: 95, tail: 0.2 },
  revolver: { kick: 1, flash: 1.25, bass: 78, tail: 0.28 },
  ak47: { kick: 0.7, flash: 1, bass: 95, tail: 0.18 },
  ar15: { kick: 0.65, flash: 0.95, bass: 125, tail: 0.17 },
  shotgun: { kick: 1.65, flash: 1.8, bass: 60, tail: 0.38 },
  kar98k: { kick: 1.45, flash: 1.5, bass: 70, tail: 0.42 },
};
type Kind = 'glow' | 'smoke' | 'spark' | 'brass' | 'tracer';
type Particle = {
  kind: Kind;
  position: T.Vector3;
  velocity: T.Vector3;
  scale: T.Vector3;
  rotation: T.Quaternion;
  spin: number;
  life: number;
  total: number;
  gravity: number;
  color: T.Color;
};
// Fixed-size instance batches: sustained automatic fire never creates unbounded draw calls.
export class CombatEffects {
  group = new T.Group();
  particles: Particle[] = [];
  batches = {} as Record<Kind, T.InstancedMesh>;
  dummy = new T.Object3D();
  lights: { light: T.PointLight; life: number; power: number }[] = [];
  overlay: HTMLDivElement;
  reticle: HTMLDivElement;
  confirm: HTMLDivElement;
  labels: {
    node: HTMLDivElement;
    position: T.Vector3;
    life: number;
    total: number;
    amount: number;
    id: number;
  }[] = [];
  flashEnemies = new Map<number, number>();
  recoil = 0;
  shake = 0;
  hitTime = 0;
  killTime = 0;
  shotPulse = 0;
  texture: T.DataTexture;
  constructor(
    public scene: T.Scene,
    public host: HTMLElement,
  ) {
    const size = 32,
      data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(
            ((x + 0.5) / size) * 2 - 1,
            ((y + 0.5) / size) * 2 - 1,
          ),
          i = (y * size + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 255;
        data[i + 3] = Math.round(Math.max(0, 1 - d) ** 2 * 255);
      }
    this.texture = new T.DataTexture(data, size, size);
    this.texture.needsUpdate = true;
    for (const kind of [
      'glow',
      'smoke',
      'spark',
      'brass',
      'tracer',
    ] as Kind[]) {
      const sprite = kind === 'glow' || kind === 'smoke';
      const mat =
        kind === 'brass'
          ? new T.MeshStandardMaterial({
              color: 0xffffff,
              metalness: 0.75,
              roughness: 0.3,
            })
          : new T.MeshBasicMaterial({
              color: 0xffffff,
              map: sprite ? this.texture : null,
              transparent: true,
              opacity: kind === 'smoke' ? 0.28 : 1,
              depthWrite: false,
              blending:
                kind === 'smoke' ? T.NormalBlending : T.AdditiveBlending,
              toneMapped: false,
            });
      const mesh = new T.InstancedMesh(
        sprite ? new T.PlaneGeometry(1, 1) : new T.BoxGeometry(1, 1, 1),
        mat,
        256,
      );
      if (kind === 'smoke') {
        mesh.geometry.setAttribute(
          'instanceFade',
          new T.InstancedBufferAttribute(new Float32Array(256), 1).setUsage(
            T.DynamicDrawUsage,
          ),
        );
        mat.onBeforeCompile = (shader) => {
          shader.vertexShader =
            'attribute float instanceFade; varying float vFxFade;\n' +
            shader.vertexShader.replace(
              '#include <begin_vertex>',
              '#include <begin_vertex>\nvFxFade=instanceFade;',
            );
          shader.fragmentShader =
            'varying float vFxFade;\n' +
            shader.fragmentShader.replace(
              '#include <color_fragment>',
              '#include <color_fragment>\ndiffuseColor.a*=vFxFade;',
            );
        };
      }
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.batches[kind] = mesh;
      this.group.add(mesh);
    }
    for (let i = 0; i < 4; i++) {
      const light = new T.PointLight(0xffb65b, 0, 6, 2);
      this.lights.push({ light, life: 0, power: 0 });
      this.group.add(light);
    }
    scene.add(this.group);
    this.overlay = document.createElement('div');
    this.overlay.className = 'combat-overlay';
    this.reticle = document.createElement('div');
    this.reticle.className = 'combat-reticle';
    this.reticle.innerHTML =
      '<i></i><i></i><i></i><i></i><b></b><span class="hit-cross"></span>';
    this.confirm = document.createElement('div');
    this.confirm.className = 'combat-confirm';
    this.overlay.appendChild(this.reticle);
    this.overlay.appendChild(this.confirm);
    host.appendChild(this.overlay);
  }
  emit(
    kind: Kind,
    p: T.Vector3,
    v: T.Vector3,
    scale: T.Vector3,
    color: number,
    life: number,
    gravity = 0,
    rotation = new T.Quaternion(),
  ) {
    if (this.particles.length >= 800) this.particles.shift();
    this.particles.push({
      kind,
      position: p.clone(),
      velocity: v,
      scale,
      rotation,
      spin: (Math.random() - 0.5) * 18,
      life,
      total: life,
      gravity,
      color: new T.Color(color),
    });
  }
  glow(p: T.Vector3, size: number, color: number, life = 0.12) {
    this.emit(
      'glow',
      p,
      new T.Vector3(),
      new T.Vector3(size, size, size),
      color,
      life,
    );
  }
  burst(p: T.Vector3, count: number, color: number, speed = 4) {
    for (let i = 0; i < count; i++) {
      const v = new T.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.7,
        (Math.random() - 0.5) * speed,
      );
      this.emit(
        'spark',
        p,
        v,
        new T.Vector3(0.035, 0.1 + Math.random() * 0.12, 0.035),
        color,
        0.18 + Math.random() * 0.27,
        8,
      );
    }
  }
  shot(e: FX, id: string, angle: number) {
    if (!e.to) return;
    const enemy = e.type === 'enemy-shot',
      feel = weaponFeel[enemy ? 'glock' : id] ?? weaponFeel.glock;
    const direction = new T.Vector3(e.to.x - e.from.x, 0, e.to.z - e.from.z),
      length = direction.length();
    direction.normalize();
    const from = new T.Vector3(e.from.x, 0.95, e.from.z),
      to = new T.Vector3(e.to.x, 0.95, e.to.z);
    const muzzle = from
      .clone()
      .addScaledVector(
        direction,
        Math.min(
          length * 0.5,
          ['glock', '1911', 'revolver'].includes(id) ? 0.6 : 0.95,
        ),
      );
    const delta = to.clone().sub(muzzle),
      rotation = new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        delta.clone().normalize(),
      );
    const middle = muzzle.clone().add(to).multiplyScalar(0.5);
    const color = enemy ? 0xff6545 : 0xffbc53;
    if (delta.length() > 0.01) {
      this.emit(
        'tracer',
        middle,
        new T.Vector3(),
        new T.Vector3(enemy ? 0.045 : 0.065, delta.length(), 0.045),
        color,
        0.13,
        0,
        rotation,
      );
      this.emit(
        'tracer',
        middle,
        new T.Vector3(),
        new T.Vector3(0.016, delta.length(), 0.016),
        0xfff6d4,
        0.08,
        0,
        rotation,
      );
    }
    if (e.primary === false) return;
    this.glow(muzzle, feel.flash * 2.5, color, 0.1);
    this.glow(muzzle, feel.flash * 0.8, 0xfff6d5, 0.055);
    this.burst(muzzle, enemy ? 3 : 7, color, feel.flash * 3);
    for (let i = 0; i < 3; i++)
      this.emit(
        'smoke',
        muzzle,
        new T.Vector3(
          direction.x * 0.7 + (Math.random() - 0.5) * 0.3,
          0.55 + i * 0.2,
          direction.z * 0.7,
        ),
        new T.Vector3(0.4, 0.4, 0.4),
        0xbfc7bf,
        0.45 + i * 0.12,
      );
    const light = this.lights.reduce((a, b) => (a.life < b.life ? a : b));
    light.light.position.copy(muzzle);
    light.power = enemy ? 18 : 40 * feel.flash;
    light.life = 0.085;
    light.light.intensity = light.power;
    if (!enemy) {
      this.recoil = Math.min(2, this.recoil + feel.kick);
      this.shake = Math.min(1.6, this.shake + feel.kick * 0.65);
      this.shotPulse = 1;
      if (id !== 'revolver') {
        const right = new T.Vector3(Math.cos(angle), 0, Math.sin(angle));
        this.emit(
          'brass',
          from.clone().addScaledVector(right, 0.33),
          right
            .multiplyScalar(2.2 + Math.random())
            .add(new T.Vector3(0, 2.4, 0)),
          new T.Vector3(0.065, 0.15, 0.065),
          id === 'shotgun' ? 0xe57842 : 0xe2b760,
          1.15,
          9,
        );
      }
    }
  }
  event(e: FX, id: string, angle: number) {
    if (e.to) {
      this.shot(e, id, angle);
      return;
    }
    const p = new T.Vector3(e.from.x, 0.9, e.from.z);
    if (e.type === 'impact') {
      const metal = ['container', 'drums'].includes(e.surface ?? '');
      this.burst(p, metal ? 11 : 6, metal ? 0xffc873 : 0xb9c2b5, metal ? 5 : 3);
      this.glow(p, 0.9, 0xffcb81, 0.1);
      this.emit(
        'smoke',
        p,
        new T.Vector3(0, 0.4, 0),
        new T.Vector3(0.7, 0.7, 0.7),
        0xb2afa0,
        0.45,
      );
      return;
    }
    if (e.type === 'hit') {
      this.burst(p, 9, e.enemyId === undefined ? 0xff664b : 0xffde8f, 4);
      this.glow(p, 1.6, e.enemyId === undefined ? 0xff6446 : 0xffdc8c, 0.13);
      if (e.enemyId === undefined) {
        this.shake = Math.min(1.6, this.shake + 0.45);
        return;
      }
      this.flashEnemies.set(e.enemyId, 0.13);
      this.hitTime = 0.2;
      this.label(e.from, e.enemyId, e.damage ?? 0);
      return;
    }
    if (e.type === 'death') {
      this.burst(p, 19, 0xffca73, 5.5);
      this.glow(p, 2.6, 0xffb867, 0.23);
      this.killTime = 0.85;
      this.hitTime = 0.28;
      this.confirm.textContent = '目标已击倒';
      return;
    }
    this.glow(p, 1.8, e.type === 'heal' ? 0x74ffb9 : 0xffdb88, 0.35);
  }
  label(p: Point, id: number, damage: number) {
    const existing = this.labels.find(
      (l) => l.id === id && l.life > l.total - 0.12,
    );
    if (existing) {
      existing.amount += damage;
      existing.node.textContent = String(existing.amount);
      return;
    }
    if (this.labels.length >= 24) this.labels.shift()!.node.remove();
    const node = document.createElement('div');
    node.className = 'combat-damage-number';
    node.textContent = String(damage);
    this.overlay.appendChild(node);
    this.labels.push({
      node,
      position: new T.Vector3(p.x, 1.9, p.z),
      life: 0.65,
      total: 0.65,
      amount: damage,
      id,
    });
  }
  update(dt: number, camera: T.Camera, pointer: T.Vector2, visible: boolean) {
    this.overlay.style.display = visible ? '' : 'none';
    this.group.visible = visible;
    this.recoil *= Math.exp(-dt * 17);
    this.shake *= Math.exp(-dt * 20);
    this.shotPulse *= Math.exp(-dt * 15);
    this.hitTime = Math.max(0, this.hitTime - dt);
    this.killTime = Math.max(0, this.killTime - dt);
    this.reticle.style.left = `${(pointer.x + 1) * 0.5 * 100}%`;
    this.reticle.style.top = `${(1 - pointer.y) * 0.5 * 100}%`;
    this.reticle.style.setProperty('--spread', `${6 + this.shotPulse * 11}px`);
    this.reticle.classList.toggle('hit', this.hitTime > 0);
    this.reticle.classList.toggle('kill', this.killTime > 0);
    this.confirm.style.opacity = String(Math.min(1, this.killTime * 4));
    for (const [id, time] of this.flashEnemies) {
      if (time <= dt) this.flashEnemies.delete(id);
      else this.flashEnemies.set(id, time - dt);
    }
    const counts: Record<Kind, number> = {
      glow: 0,
      smoke: 0,
      spark: 0,
      brass: 0,
      tracer: 0,
    };
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.velocity.y -= p.gravity * dt;
      p.position.addScaledVector(p.velocity, dt);
      if (dt > 0 && p.kind === 'brass' && p.position.y < 0.13) {
        p.position.y = 0.13;
        p.velocity.y = Math.abs(p.velocity.y) * 0.25;
        p.velocity.x *= 0.55;
        p.velocity.z *= 0.55;
      }
      const index = counts[p.kind]++;
      if (index >= 256) continue;
      const fade = p.life / p.total;
      this.dummy.position.copy(p.position);
      this.dummy.quaternion.copy(
        p.kind === 'glow' || p.kind === 'smoke'
          ? camera.quaternion
          : p.rotation,
      );
      this.dummy.scale.copy(p.scale);
      if (p.kind === 'smoke')
        this.dummy.scale.multiplyScalar(1 + (1 - fade) * 2.5);
      else if (p.kind !== 'tracer' && p.kind !== 'brass')
        this.dummy.scale.multiplyScalar(0.3 + fade * 0.7);
      if (p.kind === 'brass') {
        this.dummy.rotateX((p.total - p.life) * p.spin);
        this.dummy.rotateZ((p.total - p.life) * p.spin * 0.7);
      }
      this.dummy.updateMatrix();
      const batch = this.batches[p.kind];
      batch.setMatrixAt(index, this.dummy.matrix);
      if (p.kind === 'smoke')
        (
          batch.geometry.getAttribute(
            'instanceFade',
          ) as T.InstancedBufferAttribute
        ).setX(index, fade);
      batch.setColorAt(
        index,
        p.color
          .clone()
          .multiplyScalar(
            p.kind === 'brass' || p.kind === 'smoke' ? 1 : Math.max(0.01, fade),
          ),
      );
    }
    for (const kind of Object.keys(counts) as Kind[]) {
      const batch = this.batches[kind];
      batch.count = Math.min(256, counts[kind]);
      batch.instanceMatrix.needsUpdate = true;
      if (kind === 'smoke')
        batch.geometry.getAttribute('instanceFade').needsUpdate = true;
      if (batch.instanceColor) batch.instanceColor.needsUpdate = true;
    }
    for (const l of this.lights) {
      l.life = Math.max(0, l.life - dt);
      l.light.intensity = (l.power * l.life) / 0.085;
    }
    for (let i = this.labels.length - 1; i >= 0; i--) {
      const label = this.labels[i];
      label.life -= dt;
      if (label.life <= 0) {
        label.node.remove();
        this.labels.splice(i, 1);
        continue;
      }
      const screen = label.position.clone();
      screen.y += (label.total - label.life) * 1.4;
      screen.project(camera);
      label.node.style.left = `${(screen.x + 1) * 0.5 * 100}%`;
      label.node.style.top = `${(1 - screen.y) * 0.5 * 100}%`;
      label.node.style.opacity = String(Math.min(1, label.life * 4));
    }
  }
  clear() {
    this.particles = [];
    for (const b of Object.values(this.batches)) b.count = 0;
    for (const l of this.labels) l.node.remove();
    this.labels = [];
    this.flashEnemies.clear();
    this.recoil = this.shake = this.hitTime = this.killTime = 0;
    for (const l of this.lights) {
      l.life = 0;
      l.light.intensity = 0;
    }
  }
  dispose() {
    this.clear();
    this.scene.remove(this.group);
    this.overlay.remove();
    this.texture.dispose();
    for (const b of Object.values(this.batches)) {
      b.geometry.dispose();
      (b.material as T.Material).dispose();
      b.dispose();
    }
  }
}
