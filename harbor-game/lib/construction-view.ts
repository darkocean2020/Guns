import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Raid, BuildKind } from './simulation';
export class ConstructionView {
  group = new T.Group();
  models = new Map<string, T.Group>();
  placed = new Map<number, T.Group>();
  piles = new Map<number, T.Group>();
  ghost = new T.Group();
  ghostKind = '';
  ghostMaterial = new T.MeshBasicMaterial({
    color: 0x8dffb3,
    transparent: true,
    opacity: 0.43,
    depthWrite: false,
  });
  constructor(public scene: T.Scene) {
    scene.add(this.group);
    this.group.add(this.ghost);
  }
  async load(
    loader: GLTFLoader,
    batch: (root: T.Group, target: T.Object3D) => void,
  ) {
    await Promise.all(
      ['wall', 'floor', 'stairs', 'resources'].map(async (kind) => {
        const gltf = await loader.loadAsync('./world/build-' + kind + '.glb');
        const root = new T.Group();
        batch(gltf.scene, root);
        this.models.set(kind, root);
      }),
    );
  }
  update(r: Raid) {
    this.group.visible = r.mode !== 'menu';
    if (!this.models.size) return;
    const ids = new Set(r.buildings.map((b) => b.id));
    for (const [id, o] of this.placed)
      if (!ids.has(id)) {
        this.group.remove(o);
        this.placed.delete(id);
      }
    for (const b of r.buildings) {
      let o = this.placed.get(b.id);
      if (!o) {
        o = this.models.get(b.kind)!.clone(true);
        this.placed.set(b.id, o);
        this.group.add(o);
      }
      o.position.set(b.x, b.base, b.z);
      o.rotation.y = (b.rotation * Math.PI) / 2;
    }
    for (const p of r.resources) {
      let o = this.piles.get(p.id);
      if (!o) {
        o = this.models.get('resources')!.clone(true);
        this.piles.set(p.id, o);
        this.group.add(o);
      }
      o.position.set(p.x, 0.05, p.z);
      o.visible = p.remaining > 0;
    }
    this.ghost.visible =
      r.mode === 'raid' &&
      r.buildMode &&
      !r.inventory &&
      !r.openLoot &&
      !r.mapOpen;
    if (this.ghost.visible) {
      if (this.ghostKind !== r.buildKind) {
        this.ghost.clear();
        this.ghostKind = r.buildKind;
        const model = this.models.get(r.buildKind as BuildKind)!.clone(true);
        model.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.material = this.ghostMaterial;
            o.castShadow = false;
            o.receiveShadow = false;
          }
        });
        this.ghost.add(model);
      }
      const p = r.plan();
      this.ghost.position.set(p.x, p.base + 0.025, p.z);
      this.ghost.rotation.y = (p.rotation * Math.PI) / 2;
      this.ghostMaterial.color.set(r.buildReason() ? 0xff6555 : 0x91ffc0);
    }
  }
  clear() {
    for (const o of this.placed.values()) this.group.remove(o);
    for (const o of this.piles.values()) this.group.remove(o);
    this.placed.clear();
    this.piles.clear();
    this.ghost.visible = false;
  }
  dispose() {
    this.scene.remove(this.group);
    this.ghostMaterial.dispose();
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>();
    for (const model of this.models.values())
      model.traverse((o) => {
        if (o instanceof T.Mesh) {
          geometries.add(o.geometry);
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            materials.add(m);
        }
      });
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
  }
}
