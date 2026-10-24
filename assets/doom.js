// DOOM.EXE on the PC's monitor: the shareware episode, run by
// https://github.com/theMagicalKarp/wasmdoom (GPL-2.0), id's original
// linuxdoom compiled to WebAssembly with no imports at all. boot.js loads it
// from the A:\> prompt, prints its startup log in text mode, then lets it
// take over the screen, the speakers and the keyboard. Music is played by
// doom-music.js.
(() => {
  'use strict';

  const canvas = document.getElementById('doom');
  const ctx = canvas.getContext('2d');

  const WIDTH = 320, HEIGHT = 200;

  // Browser keys DOOM has its own codes for; any other single character is
  // sent as itself.
  const KEYS = {
    ArrowLeft: 0xac, ArrowRight: 0xae, ArrowUp: 0xad, ArrowDown: 0xaf,
    Control: 0x80 + 0x1d, Shift: 0x80 + 0x36, Alt: 0x80 + 0x38,
    Tab: 0x09, Escape: 0x1b, Enter: 0x0d, Backspace: 0x7f
  };
  // Typed characters go in a second time with this bit set, for the things
  // that read text rather than keys: y/n prompts, save names and cheats.
  const TYPECHAR = 0x100;

  // The engine's outbound events: a u16 tag, a u16 length, then the payload.
  const EVENT = {
    INFO: 1, WARNING: 2, ERROR: 3,
    SOUND_START: 10, SOUND_STOP: 11, SOUND_UPDATE: 12,
    MUSIC_SET_GENMIDI: 20, MUSIC_REGISTER: 21
  };
  // Music events that are only numbers, passed on to doom-music.js as they
  // come.
  const MUSIC = { 22: 'play', 23: 'pause', 24: 'resume', 25: 'stop', 26: 'unregister', 27: 'set_volume' };

  // Quitting from the menu only plays one of these and carries on, so a
  // "y" at a prompt followed by one of them is DOOM being quit.
  // sfx_pldeth, dmpain, popain, slop, telept, posit1, posit3, sgtatk.
  const QUIT_SOUNDS = new Set([57, 26, 27, 31, 35, 36, 38, 52]);

  // Where in wd_settings_t the engine says whether its menu is up.
  const MENU_ACTIVE = 40;

  // Compiled and fetched once; every run gets a fresh instance.
  let files = null;

  const fetchBytes = url => fetch(url).then(r => {
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.arrayBuffer();
  });

  // Sound, shared by every run: an AudioContext, the sound effects decoded
  // from the WAD as they are first played, and the music synth's bytes.
  let sound;
  const effects = new Map();

  function soundCard() {
    if (sound !== undefined) return sound;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return sound = null;
    const ctx = new AC();
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(ctx.destination);
    // The synth runs in an AudioWorklet, which only secure pages get.
    const synth = ctx.audioWorklet
      ? Promise.all([fetchBytes('assets/doom-music.wasm'), ctx.audioWorklet.addModule('assets/doom-music.js')])
        .then(([wasm]) => wasm)
        .catch(e => {
          console.error('[DOOM] no music:', e);
          return null;
        })
      : Promise.resolve(null);
    return sound = { ctx, out, synth };
  }

  // Browsers keep sound off until a click or a key, so every key tries.
  function unmute() {
    if (sound?.ctx.state === 'suspended') sound.ctx.resume();
  }

  // DOOM's volume is 0-15, as set in its menu, its separation 0-255 from
  // left to right and its pitch 128 for as recorded.
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const gainOf = vol => clamp(vol / 15, 0, 1);
  const panOf = sep => clamp((sep - 128) / 127, -1, 1);
  const rateOf = pitch => Math.max(pitch, 1) / 128;

  // Loads DOOM and runs its start-up. Resolves to the game, holding the
  // lines it printed while starting.
  window.loadDoom = async () => {
    files ??= Promise.all([
      fetchBytes('assets/doom.wasm').then(bytes => WebAssembly.compile(bytes)),
      fetchBytes('assets/doom1.wad').then(bytes => new Uint8Array(bytes))
    ]);
    const [module, wad] = await files.catch(e => {
      files = null;
      throw e;
    });

    const { exports: doom } = await WebAssembly.instantiate(module);
    const memory = doom.memory;

    // The IWAD goes straight into the engine's memory, and the game mode
    // in as a command line.
    const wadPtr = doom.wasmdoom_wad_alloc(wad.length);
    if (!wadPtr) throw new Error('doom1.wad: out of memory');
    new Uint8Array(memory.buffer, wadPtr, wad.length).set(wad);
    const argv = new TextEncoder().encode('-mode\0shareware\0\0');
    new Uint8Array(memory.buffer, doom.wasmdoom_argv_ptr(), argv.length).set(argv);

    let playing = false, quitSound = false, quitVoice = null;
    const log = [];

    // Each run has its own synth, so its songs are numbered afresh.
    const card = soundCard();
    let music = null;
    const synth = await card?.synth;
    if (synth) {
      music = new AudioWorkletNode(card.ctx, 'doom-music', { numberOfInputs: 0, outputChannelCount: [2] });
      music.connect(card.out);
      music.port.postMessage(['init', synth]);
    }

    function toMusic(...message) {
      music?.port.postMessage(message, message.filter(arg => arg instanceof ArrayBuffer));
    }

    function musicOff() {
      if (!music) return;
      music.port.postMessage(['close']);
      music.disconnect();
      music = null;
    }

    // Sounds playing, by the engine's channel handle.
    const voices = new Map();

    function startSound(handle, sfx, ptr, len, vol, sep, pitch) {
      // Sounds started while the browser holds sound back would all come
      // out at once when it lets go.
      if (card?.ctx.state !== 'running' || len <= 8) return null;
      const { ctx } = card;
      let buffer = effects.get(sfx);
      if (!buffer) {
        // A DMX lump: an 8-byte header, then unsigned 8-bit samples at
        // 11025 Hz.
        const samples = new Uint8Array(memory.buffer, ptr + 8, len - 8);
        buffer = ctx.createBuffer(1, samples.length, 11025);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) data[i] = (samples[i] - 128) / 128;
        effects.set(sfx, buffer);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rateOf(pitch);
      const pan = ctx.createStereoPanner();
      pan.pan.value = panOf(sep);
      const gain = ctx.createGain();
      gain.gain.value = gainOf(vol);
      src.connect(pan).connect(gain).connect(card.out);
      src.onended = () => voices.delete(handle);
      voices.set(handle, { src, pan, gain });
      src.start();
      return src;
    }

    function stopSound(handle) {
      const voice = voices.get(handle);
      if (!voice) return;
      voice.src.onended = null;
      voice.src.stop();
      voices.delete(handle);
    }

    function soundsOff() {
      for (const handle of [...voices.keys()]) stopSound(handle);
    }

    function drain() {
      const view = new DataView(memory.buffer, doom.wasmdoom_events_ptr(), doom.wasmdoom_events_len());
      for (let at = 0; at + 4 <= view.byteLength;) {
        const tag = view.getUint16(at, true), len = view.getUint16(at + 2, true);
        const payload = new DataView(view.buffer, view.byteOffset + at + 4, len);
        at += 4 + len;
        const int = i => payload.getInt32(i * 4, true);
        // Lumps are handed over as a pointer and length into the WAD.
        const lump = i => memory.buffer.slice(int(i), int(i) + int(i + 1));
        switch (tag) {
          case EVENT.INFO: {
            const message = new TextDecoder().decode(payload);
            if (playing) console.log(`[DOOM] ${message}`);
            else log.push(message);
            break;
          }
          case EVENT.WARNING:
          case EVENT.ERROR:
            console.error(`[DOOM] ${new TextDecoder().decode(payload)}`);
            break;
          case EVENT.SOUND_START: {
            const voice = startSound(int(0), int(1), int(2), int(3), int(4), int(5), int(6));
            if (QUIT_SOUNDS.has(int(1))) {
              quitSound = true;
              quitVoice = voice;
            }
            break;
          }
          case EVENT.SOUND_STOP:
            stopSound(int(0));
            break;
          case EVENT.SOUND_UPDATE: {
            const voice = voices.get(int(0));
            if (!voice) break;
            voice.gain.gain.value = gainOf(int(1));
            voice.pan.pan.value = panOf(int(2));
            voice.src.playbackRate.value = rateOf(int(3));
            break;
          }
          case EVENT.MUSIC_SET_GENMIDI:
            toMusic('set_genmidi', lump(0));
            break;
          case EVENT.MUSIC_REGISTER:
            toMusic('register', int(0), lump(1));
            break;
          default:
            if (MUSIC[tag]) toMusic(MUSIC[tag], ...Array.from({ length: len / 4 }, (_, i) => int(i)));
        }
      }
      doom.wasmdoom_events_clear();
    }

    try {
      doom.wasmdoom_init();
    } catch (e) {
      musicOff();
      throw e;
    } finally {
      drain();
    }

    const image = ctx.createImageData(WIDTH, HEIGHT);
    const pixels = new Uint32Array(image.data.buffer);
    const colors = new Uint32Array(256);
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    // DOOM's screen is one palette index a pixel; ImageData wants the bytes
    // R, G, B, A.
    function draw() {
      const palette = new Uint8Array(memory.buffer, doom.wasmdoom_get_palette(), 256 * 3);
      for (let i = 0; i < 256; i++) {
        colors[i] = 0xff000000 | (palette[i * 3 + 2] << 16) | (palette[i * 3 + 1] << 8) | palette[i * 3];
      }
      const frame = new Uint8Array(memory.buffer, doom.wasmdoom_get_framebuffer(), pixels.length);
      for (let i = 0; i < frame.length; i++) pixels[i] = colors[frame[i]];
      ctx.putImageData(image, 0, 0);
    }

    function menuActive() {
      doom.wasmdoom_snapshot_settings();
      return new DataView(memory.buffer).getInt32(doom.wasmdoom_settings_ptr() + MENU_ACTIVE, true) !== 0;
    }

    // Keys held down, by physical key, so a key comes back up as the same
    // DOOM key it went down as, whatever Shift did in between.
    const held = new Map();
    let answeredYes = false;

    function doomKey(e) {
      if (KEYS[e.key]) return KEYS[e.key];
      if (e.key.length === 1) return e.key.toLowerCase().charCodeAt(0);
      return null;
    }

    function keydown(e) {
      const key = held.get(e.code) ?? doomKey(e);
      if (key === null) return;
      e.preventDefault();
      unmute();
      if (held.has(e.code)) return; // auto-repeat
      held.set(e.code, key);
      doom.wasmdoom_keydown(key);
      if (e.key.length === 1 && e.key >= ' ' && e.key <= '~') {
        doom.wasmdoom_keydown(TYPECHAR | e.key.charCodeAt(0));
        if (e.key.toLowerCase() === 'y') answeredYes = true;
      }
    }

    function keyup(e) {
      const key = held.get(e.code);
      if (key === undefined) return;
      e.preventDefault();
      held.delete(e.code);
      doom.wasmdoom_keyup(key);
    }

    // The on-screen controls of pad.js hold keys down as a keyboard would.
    function hold(key, down) {
      const e = { key, code: `pad ${key}`, preventDefault() {} };
      if (down) keydown(e);
      else keyup(e);
    }

    function releaseAll() {
      for (const key of held.values()) doom.wasmdoom_keyup(key);
      held.clear();
    }

    let timer = 0;

    // Stops the clock and lets go of the keyboard.
    function detach() {
      clearInterval(timer);
      removeEventListener('keydown', keydown, true);
      removeEventListener('keyup', keyup, true);
      removeEventListener('blur', releaseAll);
      held.clear();
    }

    // Also for a game that was loaded but never played: its synth is
    // running from the start.
    function stop() {
      musicOff();
      soundsOff();
      if (!playing) return;
      playing = false;
      detach();
      canvas.hidden = true;
    }

    return {
      log: log.flatMap(message => message.replace(/\r/g, '').split('\n')).filter(line => line.trim()),

      // Shows DOOM and hands it the keyboard, at its 35 tics a second.
      // Quitting from its menu, or the engine crashing, ends the game.
      play(onExit) {
        playing = true;
        canvas.hidden = false;
        unmute();
        draw();
        addEventListener('keydown', keydown, true);
        addEventListener('keyup', keyup, true);
        addEventListener('blur', releaseAll);
        timer = setInterval(() => {
          const prompted = answeredYes && menuActive();
          answeredYes = quitSound = false;
          try {
            doom.wasmdoom_tick();
          } catch (e) {
            console.log('[DOOM] exited:', e);
            stop();
            onExit();
            return;
          } finally {
            drain();
          }
          if (prompted && quitSound) {
            // Like DOOM, hear the quit sound out before going back to DOS,
            // unless the PC is switched off first.
            detach();
            musicOff();
            const exit = () => {
              if (!playing) return;
              stop();
              onExit();
            };
            quitVoice?.addEventListener('ended', exit);
            setTimeout(exit, quitVoice ? 3000 : 0);
            return;
          }
          draw();
        }, 1000 / 35);
      },

      stop,

      // pad.js on phones: the stick walks and turns, the button fires, opens
      // doors and picks menu items.
      stick(x, y) {
        hold('ArrowUp', y < -0.4);
        hold('ArrowDown', y > 0.4);
        hold('ArrowLeft', x < -0.4);
        hold('ArrowRight', x > 0.4);
      },
      button(down) {
        for (const key of ['Control', ' ', 'Enter']) hold(key, down);
      }
    };
  };
})();
