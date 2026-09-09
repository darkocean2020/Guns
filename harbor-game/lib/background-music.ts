// Original score: “Harbor After Dark”, 80 BPM, D minor. No external recordings.
export function renderHarborMusic(sampleRate = 22050) {
  const beat = 0.75;
  const length = Math.round(32 * beat * sampleRate);
  const channels = [new Float32Array(length), new Float32Array(length)];
  const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
  function note(start: number, duration: number, midi: number, gain: number, pan: number, bell = false) {
    const hz = frequency(midi);
    for (let i = 0; i < duration * sampleRate; i++) {
      const t = i / sampleRate;
      const envelope = bell
        ? Math.min(1, t / 0.015) * Math.exp(-t * 2.2) * Math.min(1, (duration - t) / 0.2)
        : Math.sin(Math.PI * t / duration) ** 2;
      const wave = Math.sin(2 * Math.PI * hz * t)
        + (bell ? 0.22 : 0.12) * Math.sin(2 * Math.PI * hz * (bell ? 2.002 : 1.003) * t);
      const index = (Math.round(start * sampleRate) + i) % length;
      for (let c = 0; c < 2; c++) {
        const volume = gain * envelope * (c ? 1 + pan : 1 - pan) * 0.5;
        channels[c][index] += wave * volume;
        // Wrapped stereo reflections keep the loop and its reverb continuous.
        channels[1 - c][(index + Math.round(sampleRate * 0.375)) % length] += wave * volume * 0.24;
        channels[c][(index + Math.round(sampleRate * 0.75)) % length] += wave * volume * 0.10;
      }
    }
  }
  const chords = [[50, 57, 60, 64], [46, 53, 57, 60], [48, 53, 57, 64], [48, 55, 62, 67]];
  chords.forEach((chord, bar) => {
    const start = bar * 8 * beat;
    chord.forEach((pitch, i) => note(start, 8 * beat + 1.5, pitch, 0.10, (i - 1.5) * 0.3));
    for (let step = 0; step < 8; step += 2) {
      note(start + step * beat, beat * 1.4, chord[0] - 12, 0.16, 0);
      note(start + (step + 0.5) * beat, 2.4, chord[(step / 2 + bar) % 4] + 24, 0.035, step % 4 ? 0.5 : -0.5, true);
    }
  });
  return channels;
}

export class BackgroundMusic {
  private source: AudioBufferSourceNode;
  private gain: GainNode;
  private level = -1;
  constructor(private context: AudioContext) {
    const channels = renderHarborMusic();
    const buffer = context.createBuffer(2, channels[0].length, 22050);
    channels.forEach((channel, i) => buffer.copyToChannel(channel, i));
    this.gain = context.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(context.destination);
    this.source = context.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;
    this.source.connect(this.gain);
    this.source.start();
  }
  update(enabled: boolean, fighting: boolean) {
    const level = enabled ? (fighting ? 0.16 : 0.32) : 0;
    if (level === this.level) return;
    this.level = level;
    this.gain.gain.setTargetAtTime(level, this.context.currentTime, level === 0 ? 0.06 : 0.4);
  }
  dispose() {
    this.source.stop();
    this.source.disconnect();
    this.gain.disconnect();
  }
}
