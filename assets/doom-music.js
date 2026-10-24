// DOOM's music, played on an emulated OPL3 FM chip as a Sound Blaster would.
// An AudioWorklet that doom.js loads: the synth is wasmdoom's
// wasmdoom.music.wasm (https://github.com/theMagicalKarp/wasmdoom, GPL-2.0),
// and doom.js forwards it the engine's music events as
// [name, ...args] messages, the name being the synth's export without
// its wasmdoom_music_ prefix.
class DoomMusic extends AudioWorkletProcessor {
  constructor() {
    super();
    this.synth = null;
    this.closed = false;
    this.port.onmessage = ({ data: [name, ...args] }) => {
      if (name === 'init') {
        // Compiled here from bytes: modules don't cross into a worklet.
        this.synth = new WebAssembly.Instance(new WebAssembly.Module(args[0]), {}).exports;
        this.synth.wasmdoom_music_init(sampleRate);
      } else if (name === 'close') {
        this.closed = true;
      } else {
        // Lumps go into the synth's memory, and in as a pointer and length.
        this.synth[`wasmdoom_music_${name}`](...args.flatMap(arg => {
          if (!(arg instanceof ArrayBuffer)) return [arg];
          const ptr = this.synth.wasmdoom_music_alloc(arg.byteLength);
          new Uint8Array(this.synth.memory.buffer, ptr, arg.byteLength).set(new Uint8Array(arg));
          return [ptr, arg.byteLength];
        }));
      }
    };
  }

  // The synth renders interleaved stereo; the worklet wants it split.
  process(inputs, [[left, right]]) {
    if (this.closed) return false;
    if (!this.synth) return true;
    const frames = left.length;
    const block = new Float32Array(this.synth.memory.buffer, this.synth.wasmdoom_music_render(frames), frames * 2);
    for (let i = 0; i < frames; i++) {
      left[i] = block[i * 2];
      right[i] = block[i * 2 + 1];
    }
    return true;
  }
}

registerProcessor('doom-music', DoomMusic);
