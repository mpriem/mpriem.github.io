// DOOM.EXE on the PC's monitor: the shareware episode, compiled to
// WebAssembly by https://github.com/jacobenget/doom.wasm (GPL-2.0), with its
// WAD built in. boot.js loads it from the A:\> prompt, prints its startup
// log in text mode, then lets it take over the screen and the keyboard.
(() => {
  'use strict';

  const canvas = document.getElementById('doom');
  const ctx = canvas.getContext('2d');

  // Browser keys DOOM has its own codes for; any other single character is
  // sent as itself.
  const KEYS = {
    ArrowLeft: 'KEY_LEFTARROW', ArrowRight: 'KEY_RIGHTARROW',
    ArrowUp: 'KEY_UPARROW', ArrowDown: 'KEY_DOWNARROW',
    ',': 'KEY_STRAFE_L', '.': 'KEY_STRAFE_R',
    Control: 'KEY_FIRE', ' ': 'KEY_USE', Shift: 'KEY_SHIFT', Alt: 'KEY_ALT',
    Tab: 'KEY_TAB', Escape: 'KEY_ESCAPE', Enter: 'KEY_ENTER', Backspace: 'KEY_BACKSPACE'
  };

  // Compiled once; every run gets a fresh instance, since quitting leaves
  // the old one crashed.
  let compiled = null;

  const text = (memory, ptr, len) => new TextDecoder().decode(new Uint8Array(memory.buffer, ptr, len));

  // Loads DOOM and runs its start-up. Resolves to the game, holding the
  // lines it printed while starting.
  window.loadDoom = async () => {
    compiled ??= fetch('assets/doom.wasm')
      .then(r => {
        if (!r.ok) throw new Error(`doom.wasm: ${r.status}`);
        return r.arrayBuffer();
      })
      .then(bytes => WebAssembly.compile(bytes));
    const module = await compiled.catch(e => {
      compiled = null;
      throw e;
    });

    let memory = null, image = null, pixels = null, playing = false;
    const log = [];

    const { exports: doom } = await WebAssembly.instantiate(module, {
      loading: {
        onGameInit(w, h) {
          canvas.width = w;
          canvas.height = h;
          image = ctx.createImageData(w, h);
          pixels = new Uint32Array(image.data.buffer);
        },
        // No WADs of our own: DOOM falls back to the shareware one.
        wadSizes() {},
        readWads() {}
      },
      ui: {
        // DOOM's pixels are 0xAARRGGBB; ImageData wants the bytes R, G, B, A.
        drawFrame(ptr) {
          const frame = new Uint32Array(memory.buffer, ptr, pixels.length);
          for (let i = 0; i < frame.length; i++) {
            const p = frame[i];
            pixels[i] = 0xff000000 | (p & 0xff00) | ((p >>> 16) & 0xff) | ((p & 0xff) << 16);
          }
          ctx.putImageData(image, 0, 0);
        }
      },
      runtimeControl: {
        timeInMilliseconds: () => BigInt(Math.trunc(performance.now()))
      },
      console: {
        onInfoMessage(ptr, len) {
          const message = text(memory, ptr, len);
          if (playing) console.log(`[DOOM] ${message}`);
          else log.push(message);
        },
        onErrorMessage(ptr, len) {
          console.error(`[DOOM] ${text(memory, ptr, len)}`);
        }
      },
      gameSaving: {
        sizeOfSaveGame: () => 0,
        readSaveGame: () => 0,
        writeSaveGame: () => 0
      }
    });
    memory = doom.memory;
    doom.initGame();

    // Keys held down, by physical key, so a key comes back up as the same
    // DOOM key it went down as, whatever Shift did in between.
    const held = new Map();

    function doomKey(e) {
      if (KEYS[e.key]) return doom[KEYS[e.key]].value;
      if (e.key.length === 1) return e.key.toLowerCase().charCodeAt(0);
      return null;
    }

    function keydown(e) {
      const key = held.get(e.code) ?? doomKey(e);
      if (key === null) return;
      e.preventDefault();
      if (held.has(e.code)) return; // auto-repeat
      held.set(e.code, key);
      doom.reportKeyDown(key);
    }

    function keyup(e) {
      const key = held.get(e.code);
      if (key === undefined) return;
      e.preventDefault();
      held.delete(e.code);
      doom.reportKeyUp(key);
    }

    // The on-screen controls of pad.js hold keys down as a keyboard would.
    function hold(key, down) {
      const e = { key, code: `pad ${key}`, preventDefault() {} };
      if (down) keydown(e);
      else keyup(e);
    }

    function releaseAll() {
      for (const key of held.values()) doom.reportKeyUp(key);
      held.clear();
    }

    let timer = 0;

    function stop() {
      if (!playing) return;
      playing = false;
      clearInterval(timer);
      removeEventListener('keydown', keydown, true);
      removeEventListener('keyup', keyup, true);
      removeEventListener('blur', releaseAll);
      held.clear();
      canvas.hidden = true;
    }

    return {
      log: log.flatMap(message => message.replace(/\r/g, '').split('\n')).filter(line => line.trim()),

      // Shows DOOM and hands it the keyboard, at its 35 tics a second.
      // Quitting from its menu crashes the module, and that ends the game.
      play(onExit) {
        playing = true;
        canvas.hidden = false;
        addEventListener('keydown', keydown, true);
        addEventListener('keyup', keyup, true);
        addEventListener('blur', releaseAll);
        timer = setInterval(() => {
          try {
            doom.tickGame();
          } catch (e) {
            console.log('[DOOM] exited:', e);
            stop();
            onExit();
          }
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
