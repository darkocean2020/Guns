import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CombatEffects, weaponFeel } from './combat-effects';
import { Raid, type Level, type Profile, type FX } from './simulation';
export class Engine {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.OrthographicCamera();
  raid!: Raid;
  player = new T.Group();
  enemies: T.Group[] = [];
  keys = new Set<string>();
  pointer = new T.Vector2();
  target = new T.Vector3();
  mouse = false;
  muted = false;
  ready = false;
  disposed = false;
  frame = 0;
  last = 0;
  tick = 0;
  loader = new GLTFLoader();
  gunCache = new Map<string, T.Group>();
  held = new T.Group();
  selected = 'glock';
  combat: CombatEffects;
  cameraShake = new T.Vector3();
  motionScale = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 0
    : 1;
  audioBus: DynamicsCompressorNode | null = null;
  noise: AudioBuffer | null = null;
  markers = new Map<string, T.Mesh>();
  audio: AudioContext | null = null;
  resizeObserver: ResizeObserver;
  water!: T.Mesh;
  exit!: T.Mesh;
  character!: T.Group;
  gunRequest = 0;
  constructor(
    public host: HTMLElement,
    public refresh: () => void,
    public progress: (s: string) => void,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    host.appendChild(this.renderer.domElement);
    this.combat = new CombatEffects(this.scene, host);
    this.scene.background = new T.Color('#172f3b');
    this.scene.fog = new T.FogExp2('#203c48', 0.006);
    const pm = new T.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pm.fromScene(room, 0.04).texture;
    room.dispose();
    pm.dispose();
    this.scene.add(new T.HemisphereLight(0xb3daef, 0x39444a, 2));
    const sun = new T.DirectionalLight(0xffd9a7, 3.3);
    sun.position.set(-20, 35, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -40,
      right: 40,
      top: 40,
      bottom: -40,
      near: 1,
      far: 100,
    });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun);
    this.camera.position.set(32, 46, 43);
    this.camera.lookAt(0, 0, 0);
    this.camera.near = 0.1;
    this.camera.far = 250;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup);
    window.addEventListener('blur', this.blur);
    this.renderer.domElement.addEventListener('pointermove', this.pointermove);
    this.renderer.domElement.addEventListener('pointerdown', this.pointerdown);
    window.addEventListener('pointerup', this.pointerup);
    this.frame = requestAnimationFrame(this.loop);
  }
  async load() {
    this.progress('读取港区地形');
    const [map, bird, level] = await Promise.all([
      this.loader.loadAsync('/world/harbor.glb'),
      this.loader.loadAsync('/world/scavenger.glb'),
      fetch('/world/level.json').then((r) => r.json() as Promise<Level>),
    ]);
    if (this.disposed) return;
    this.batch(map.scene);
    this.character = bird.scene;
    this.player = bird.scene.clone(true);
    this.player.add(this.held);
    const halo = new T.Mesh(
      new T.RingGeometry(0.43, 0.48, 40),
      new T.MeshBasicMaterial({
        color: 0xc3f7db,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.8,
        side: T.DoubleSide,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.15;
    halo.renderOrder = 10;
    this.player.add(halo);
    this.player.traverse((o) => {
      if (o instanceof T.Mesh) o.castShadow = true;
    });
    this.scene.add(this.player);
    let profile: Profile = {
      credits: 6000,
      stash: [],
      raids: 0,
      extractions: 0,
    };
    try {
      const p = JSON.parse(localStorage.getItem('harbor-zero-v1') || 'null');
      if (
        p &&
        Number.isFinite(p.credits) &&
        p.credits >= 0 &&
        Array.isArray(p.stash) &&
        p.stash.every(
          (i: Record<string, unknown>) =>
            typeof i.name === 'string' &&
            typeof i.value === 'number' &&
            typeof i.weight === 'number',
        )
      )
        profile = p;
    } catch {}
    this.raid = new Raid(
      level as Level,
      profile,
      (e) => this.fx(e),
      (p) => {
        try {
          localStorage.setItem('harbor-zero-v1', JSON.stringify(p));
        } catch {}
      },
    );
    this.player.position.set(level.spawn.x, 0, level.spawn.z);
    const waterMaterial = new T.MeshStandardMaterial({
      color: 0x0e4652,
      metalness: 0.55,
      roughness: 0.24,
    });
    this.water = new T.Mesh(
      new T.PlaneGeometry(400, 400, 100, 100),
      waterMaterial,
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = -0.45;
    this.scene.add(this.water);
    this.exit = new T.Mesh(
      new T.RingGeometry(2.2, 2.45, 64),
      new T.MeshBasicMaterial({
        color: 0x83f7ca,
        transparent: true,
        opacity: 0.9,
        side: T.DoubleSide,
      }),
    );
    this.exit.rotation.x = -Math.PI / 2;
    this.exit.position.set(level.extraction.x, 0.15, level.extraction.z);
    this.scene.add(this.exit);
    for (const l of level.lights) {
      const light = new T.PointLight(0xffb767, 25, 9, 2);
      light.position.set(l.x, l.y, l.z);
      this.scene.add(light);
    }
    for (let i = 0; i < 26; i++) {
      const h = 3 + ((i * 17) % 11),
        mesh = new T.Mesh(
          new T.BoxGeometry(4, h, 4),
          new T.MeshStandardMaterial({ color: 0x31454d, roughness: 0.8 }),
        );
      mesh.position.set(-70 + i * 6, h / 2 - 1, -65);
      this.scene.add(mesh);
    }
    this.progress('装配保留的枪械模型');
    await this.selectGun('glock');
    this.ready = true;
    this.progress('');
    this.refresh();
  }
  batch(root: T.Group) {
    root.updateMatrixWorld(true);
    const groups = new Map<T.Material, T.BufferGeometry[]>();
    root.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      if (materials.length !== 1) {
        this.scene.add(o.clone());
        return;
      }
      const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      for (const name of Object.keys(g.attributes))
        if (!['position', 'normal', 'uv'].includes(name))
          g.deleteAttribute(name);
      if (!g.attributes.uv)
        g.setAttribute(
          'uv',
          new T.BufferAttribute(
            new Float32Array(g.attributes.position.count * 2),
            2,
          ),
        );
      const geom = g.index ? g.toNonIndexed() : g;
      const mat = materials[0];
      if (!groups.has(mat)) groups.set(mat, []);
      groups.get(mat)!.push(geom);
    });
    for (const [mat, geoms] of groups) {
      const geom = mergeGeometries(geoms);
      if (geom) {
        const mesh = new T.Mesh(geom, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
      }
      for (const g of geoms) g.dispose();
    }
  }
  async selectGun(id: string) {
    const token = ++this.gunRequest;
    this.selected = id;
    if (!this.gunCache.has(id)) {
      const gltf = await this.loader.loadAsync(`/weapons/${id}.glb`);
      if (this.disposed) return;
      const model = gltf.scene;
      const box = new T.Box3().setFromObject(model);
      const center = box.getCenter(new T.Vector3());
      model.position.sub(center);
      const wrapper = new T.Group();
      wrapper.add(model);
      const size = box.getSize(new T.Vector3());
      wrapper.scale.setScalar(
        (['glock', '1911', 'revolver'].includes(id) ? 0.55 : 1.15) /
          Math.max(size.x, size.y, size.z),
      );
      wrapper.rotation.y = Math.PI / 2;
      this.gunCache.set(id, wrapper);
    }
    if (token !== this.gunRequest) return;
    this.held.clear();
    this.held.add(this.gunCache.get(id)!.clone(true));
    this.held.position.set(0.26, 0.88, -0.32);
  }
  start() {
    if (!this.ready || !this.raid.start(this.selected)) return;
    this.unlockAudio();
    this.combat.clear();
    this.keys.clear();
    this.mouse = false;
    for (const e of this.enemies) {
      e.traverse((o) => {
        if (o instanceof T.Mesh && o.userData.originalEmission)
          o.material.dispose();
      });
      this.scene.remove(e);
    }
    this.enemies = this.raid.enemies.map(() => {
      const bird = this.character.clone(true);
      bird.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.castShadow = true;
          o.material = o.material.clone();
          if (o.material.name.includes('vest')) o.material.color.set(0x96533d);
          if (o.material instanceof T.MeshStandardMaterial) {
            o.userData.originalEmission = o.material.emissive.clone();
            o.userData.originalIntensity = o.material.emissiveIntensity;
          }
        }
      });
      const gun = this.gunCache.get('glock')!.clone(true);
      gun.position.set(0.26, 0.88, -0.32);
      bird.add(gun);
      this.scene.add(bird);
      return bird;
    });
    for (const m of this.markers.values()) this.scene.remove(m);
    this.markers.clear();
    this.refresh();
  }
  menu() {
    this.raid.mode = 'menu';
    this.combat.clear();
    this.keys.clear();
    this.mouse = false;
    this.refresh();
  }
  setMuted(value: boolean) {
    this.muted = value;
    this.unlockAudio();
  }
  unlockAudio() {
    if (!this.audio) {
      this.audio = new AudioContext();
      this.audioBus = this.audio.createDynamicsCompressor();
      this.audioBus.threshold.value = -12;
      this.audioBus.ratio.value = 6;
      this.audioBus.attack.value = 0.003;
      this.audioBus.release.value = 0.18;
      this.audioBus.connect(this.audio.destination);
      this.noise = this.audio.createBuffer(
        1,
        this.audio.sampleRate * 0.6,
        this.audio.sampleRate,
      );
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    void this.audio.resume();
  }
  sound(e: FX) {
    if (
      this.muted ||
      !this.audio ||
      !this.audioBus ||
      e.primary === false ||
      e.type === 'impact'
    )
      return;
    const ctx = this.audio,
      now = ctx.currentTime,
      shot = e.type === 'shot' || e.type === 'enemy-shot';
    const enemy = e.type === 'enemy-shot';
    const feel =
      weaponFeel[enemy ? 'glock' : this.raid.gun.id] ?? weaponFeel.glock;
    const spatial = enemy
      ? Math.max(
          0.12,
          1 -
            Math.hypot(
              e.from.x - this.raid.player.x,
              e.from.z - this.raid.player.z,
            ) /
              26,
        )
      : 1;
    const pan = ctx.createStereoPanner();
    pan.pan.value = enemy
      ? T.MathUtils.clamp((e.from.x - this.raid.player.x) / 15, -0.8, 0.8)
      : 0;
    pan.connect(this.audioBus);
    const osc = ctx.createOscillator(),
      body = ctx.createGain();
    osc.type = shot ? 'triangle' : 'sine';
    const freq = shot
      ? feel.bass
      : e.type === 'death'
        ? 880
        : e.type === 'loot'
          ? 720
          : e.type === 'heal'
            ? 520
            : e.enemyId !== undefined
              ? 1400
              : 150;
    const duration = shot ? feel.tail : e.type === 'death' ? 0.2 : 0.08;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(
      shot ? 35 : freq * 0.6,
      now + duration,
    );
    body.gain.setValueAtTime(0.001, now);
    body.gain.linearRampToValueAtTime(
      (shot ? 0.32 : 0.07) * spatial,
      now + 0.003,
    );
    body.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(body).connect(pan);
    osc.start(now);
    osc.stop(now + duration + 0.015);
    if (shot && this.noise) {
      const noise = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter(),
        crack = ctx.createGain();
      noise.buffer = this.noise;
      noise.playbackRate.value = 0.9 + Math.random() * 0.2;
      filter.type = 'bandpass';
      filter.frequency.value = enemy ? 1300 : feel.bass * 21;
      filter.Q.value = 0.65;
      crack.gain.setValueAtTime(0.001, now);
      crack.gain.linearRampToValueAtTime(0.4 * spatial, now + 0.0015);
      crack.gain.exponentialRampToValueAtTime(0.001, now + feel.tail * 0.65);
      noise.connect(filter).connect(crack).connect(pan);
      const delay = ctx.createDelay(0.2),
        echo = ctx.createGain(),
        low = ctx.createBiquadFilter();
      delay.delayTime.value = 0.075;
      echo.gain.value = 0.19;
      low.type = 'lowpass';
      low.frequency.value = 1100;
      crack.connect(delay).connect(low).connect(echo).connect(pan);
      noise.start(now, Math.random() * 0.1);
      noise.stop(now + feel.tail);
      noise.onended = () => {
        noise.disconnect();
        filter.disconnect();
      };
      osc.onended = () => {
        osc.disconnect();
        body.disconnect();
      };
      // Disconnect the short reflection after its tail, without accumulating audio nodes.
      const cleanup = ctx.createOscillator(),
        silent = ctx.createGain();
      silent.gain.value = 0;
      cleanup.connect(silent).connect(ctx.destination);
      cleanup.start(now);
      cleanup.stop(now + feel.tail + 0.21);
      cleanup.onended = () => {
        crack.disconnect();
        delay.disconnect();
        low.disconnect();
        echo.disconnect();
        pan.disconnect();
        cleanup.disconnect();
        silent.disconnect();
      };
    } else
      osc.onended = () => {
        osc.disconnect();
        body.disconnect();
        pan.disconnect();
      };
  }
  fx(e: FX) {
    this.sound(e);
    this.combat.event(e, this.raid.gun.id, this.raid.angle);
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.renderer.setSize(w, h);
    const size = this.raid?.mode === 'menu' ? 37 : 14;
    this.camera.left = (-size * w) / h;
    this.camera.right = (size * w) / h;
    this.camera.top = size;
    this.camera.bottom = -size;
    this.camera.updateProjectionMatrix();
  }
  pointermove = (e: PointerEvent) => {
    const rect = this.host.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
  };
  pointerdown = (e: PointerEvent) => {
    if (e.button !== 0 || !this.ready) return;
    this.pointermove(e);
    this.unlockAudio();
    this.mouse = true;
    this.aim();
    this.raid.shoot(this.target);
  };
  pointerup = () => {
    this.mouse = false;
  };
  blur = () => {
    this.keys.clear();
    this.mouse = false;
    if (this.raid?.mode === 'raid') {
      this.raid.mode = 'paused';
      this.refresh();
    }
  };
  keydown = (e: KeyboardEvent) => {
    if (!this.ready || e.target instanceof HTMLInputElement) return;
    const r = this.raid;
    if (r.mode === 'menu' || r.mode === 'result') return;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'Escape'].includes(e.code))
      e.preventDefault();
    this.keys.add(e.code);
    if (e.repeat) return;
    if (e.code === 'Escape') {
      if (r.openLoot) r.openLoot = null;
      else if (r.inventory) r.inventory = false;
      else if (r.mapOpen) r.mapOpen = false;
      else r.togglePause();
    }
    if (r.mode === 'raid') {
      if (e.code === 'KeyE') r.interact();
      if (e.code === 'KeyR') r.reload();
      if (e.code === 'KeyH') r.heal();
      if (e.code === 'Tab') {
        r.inventory = !r.inventory;
        r.openLoot = null;
      }
      if (e.code === 'KeyM') r.mapOpen = !r.mapOpen;
    }
    this.refresh();
  };
  keyup = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  aim() {
    this.camera.updateMatrixWorld();
    const ray = new T.Raycaster();
    ray.setFromCamera(this.pointer, this.camera);
    ray.ray.intersectPlane(
      new T.Plane(new T.Vector3(0, 1, 0), -0.8),
      this.target,
    );
    if (this.raid?.mode === 'raid')
      this.raid.angle = Math.atan2(
        this.target.x - this.raid.player.x,
        -(this.target.z - this.raid.player.z),
      );
  }
  loop = (now: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min((now - (this.last || now)) / 1000, 0.05);
    this.last = now;
    const r = this.raid;
    this.camera.position.sub(this.cameraShake);
    this.cameraShake.set(0, 0, 0);
    if (r) {
      this.aim();
      const input = {
        x: Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')),
        z: Number(this.keys.has('KeyS')) - Number(this.keys.has('KeyW')),
        sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      };
      r.update(dt, input);
      if (this.mouse && r.gun.auto) r.shoot(this.target);
      this.player.position.set(r.player.x, 0, r.player.z);
      this.player.rotation.y = -r.angle;
      this.held.position.z = -0.32 + this.combat.recoil * 0.12;
      this.held.rotation.x = this.combat.recoil * 0.14;
      this.held.rotation.z = -this.combat.recoil * 0.035;
      this.player.visible = r.mode !== 'menu';
      const walking = r.mode === 'raid' && (input.x !== 0 || input.z !== 0);
      this.player.traverse((o) => {
        if (o.name.startsWith('leg')) {
          if (o.userData.baseY === undefined) o.userData.baseY = o.position.y;
          o.position.y =
            o.userData.baseY +
            (walking
              ? Math.max(
                  0,
                  Math.sin(now * 0.013 + (o.name.includes('_R') ? Math.PI : 0)),
                ) * 0.1
              : 0);
        }
      });
      this.enemies.forEach((bird, i) => {
        const e = r.enemies[i];
        if (!e) return;
        bird.position.set(e.x, e.hp > 0 ? 0 : 0.15, e.z);
        bird.rotation.set(e.hp > 0 ? 0 : Math.PI / 2, -e.angle, 0);
        bird.visible = r.mode !== 'menu';
        const flash = this.combat.flashEnemies.has(e.id);
        bird.traverse((o) => {
          if (
            o instanceof T.Mesh &&
            o.material instanceof T.MeshStandardMaterial &&
            o.userData.originalEmission
          ) {
            o.material.emissive.copy(
              flash ? new T.Color(0xffd9a1) : o.userData.originalEmission,
            );
            o.material.emissiveIntensity = flash
              ? 2
              : o.userData.originalIntensity;
          }
        });
      });
      for (const c of r.loot) {
        let marker = this.markers.get(c.id);
        if (!marker) {
          marker = new T.Mesh(
            new T.OctahedronGeometry(0.14),
            new T.MeshBasicMaterial({
              color: c.kind === 'valuable' ? 0x82f5ce : 0xffd790,
            }),
          );
          this.markers.set(c.id, marker);
          this.scene.add(marker);
        }
        marker.visible = c.items.length > 0 && r.mode !== 'menu';
        marker.position.set(c.x, 1.4 + Math.sin(now * 0.002) * 0.12, c.z);
        marker.rotation.y = now * 0.001;
      }
      const menu = r.mode === 'menu';
      const desired = menu
        ? new T.Vector3(27, 43, 40)
        : new T.Vector3(r.player.x, 24, r.player.z + 20);
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 5));
      const focus = menu
        ? new T.Vector3(1, 0, -3)
        : new T.Vector3(r.player.x, 0, r.player.z - 1);
      if (r.mode === 'raid') {
        const strength = this.combat.shake * 0.09 * this.motionScale;
        this.cameraShake.set(
          Math.sin(now * 0.083) * strength,
          Math.cos(now * 0.067) * strength * 0.4,
          Math.cos(now * 0.097) * strength * 0.65,
        );
        this.camera.position.add(this.cameraShake);
        focus.add(this.cameraShake);
      }
      this.camera.lookAt(focus);
      const size = menu ? 34 : 13;
      const aspect = this.host.clientWidth / this.host.clientHeight;
      this.camera.top += (size - this.camera.top) * Math.min(1, dt * 6);
      this.camera.bottom = -this.camera.top;
      this.camera.right = this.camera.top * aspect;
      this.camera.left = -this.camera.right;
      this.camera.updateProjectionMatrix();
      if (this.exit)
        (this.exit.material as T.MeshBasicMaterial).opacity =
          0.65 + Math.sin(now * 0.003) * 0.3;
      this.tick += dt;
      if (this.tick > 0.09) {
        this.tick = 0;
        this.refresh();
      }
    }
    this.combat.update(
      r?.mode === 'paused' ? 0 : dt,
      this.camera,
      this.pointer,
      r?.mode === 'raid' || r?.mode === 'paused',
    );
    this.renderer.render(this.scene, this.camera);
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.keydown);
    window.removeEventListener('keyup', this.keyup);
    window.removeEventListener('blur', this.blur);
    window.removeEventListener('pointerup', this.pointerup);
    this.renderer.domElement.removeEventListener(
      'pointermove',
      this.pointermove,
    );
    this.renderer.domElement.removeEventListener(
      'pointerdown',
      this.pointerdown,
    );
    this.combat.dispose();
    this.scene.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    void this.audio?.close();
  }
}
