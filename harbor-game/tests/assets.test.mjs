import fs from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from 'three';
const b = fs.readFileSync('public/world/harbor.glb');
const gltf = await new GLTFLoader().parseAsync(
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  '',
);
const groups = new Map();
let count = 0;
gltf.scene.updateMatrixWorld(true);
gltf.scene.traverse((o) => {
  if (!o.isMesh) return;
  count++;
  const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
  for (const name of Object.keys(g.attributes))
    if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  if (!g.attributes.uv)
    g.setAttribute(
      'uv',
      new T.BufferAttribute(
        new Float32Array(g.attributes.position.count * 2),
        2,
      ),
    );
  const geo = g.index ? g.toNonIndexed() : g;
  if (!groups.has(o.material)) groups.set(o.material, []);
  groups.get(o.material).push(geo);
});
for (const gs of groups.values())
  if (!mergeGeometries(gs)) throw Error('failed static batching');
console.log(
  'GLB verified: ' +
    count +
    ' meshes batched into ' +
    groups.size +
    ' materials',
);
