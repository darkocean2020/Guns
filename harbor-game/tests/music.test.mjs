import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = ts.transpileModule(fs.readFileSync('lib/background-music.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { renderHarborMusic, BackgroundMusic } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const channels = renderHarborMusic();
for (const samples of channels) {
  assert.equal(samples.length, 24 * 22050);
  let energy = 0, peak = 0;
  for (const sample of samples) {
    assert(Number.isFinite(sample));
    energy += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  assert(peak < 1, 'score does not clip');
  assert(Math.sqrt(energy / samples.length) > 0.01, 'score is not silent');
  assert(Math.abs(samples[0] - samples.at(-1)) < 0.02, 'loop boundary has no abrupt jump');
}
const levels = [];
let stopped = false, disconnected = 0;
const context = {
  currentTime: 0, destination: {},
  createBuffer: () => ({ copyToChannel() {} }),
  createGain: () => ({ gain: { value: 0, setTargetAtTime: (v) => levels.push(v) }, connect() {}, disconnect() { disconnected++; } }),
  createBufferSource: () => ({ connect() {}, start() {}, stop() { stopped = true; }, disconnect() { disconnected++; } }),
};
const music = new BackgroundMusic(context);
music.update(true, false);
music.update(true, true);
assert(levels[1] < levels[0], 'combat ducks music');
music.update(false, false);
assert.equal(levels.at(-1), 0, 'mute/pause fades to silence');
music.dispose();
assert(stopped && disconnected === 2, 'audio nodes are released');
console.log('PASS: audible original score, headroom, loop boundary, combat ducking, mute and cleanup.');
