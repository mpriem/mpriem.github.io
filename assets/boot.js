// The PC in PC.webp starts switched off. Its power button boots it the way a
// late-90s PC did: video BIOS, Award POST with memory test, drive detection
// and the speaker beep, then MS-DOS from the floppy in drive A:. At the A:\>
// prompt, ADVENTURE.EXE starts the island in game.js. Pressing the button
// again switches it off, whatever it was doing.
(() => {
  'use strict';

  const COLS = 80, ROWS = 25;
  const GRAY = '#aaaaaa', WHITE = '#ffffff', CYAN = '#55ffff', YELLOW = '#ffff55';
  const PROMPT = 'A:\\>';
  const DEBUG = new URLSearchParams(location.search).has('debug');

  // VT323 is drawn this many cell heights tall, its baseline this far down
  // the cell, and the picture keeps this much black border inside the tube.
  const FONT_SCALE = 1.2, BASELINE = 0.8, BORDER = { x: 0.05, y: 0.06 };

  const crt = document.getElementById('dos');
  const input = document.getElementById('dos-input');
  const powerButtons = [...document.querySelectorAll('.power')];
  const ctx = crt.getContext('2d');

  // Switching off abandons whatever the PC was doing: every wait begun
  // before then rejects with OFF instead of resolving.
  const OFF = Symbol('off');
  let generation = 0;
  const wait = ms => {
    const g = generation;
    return new Promise((resolve, reject) => setTimeout(() => (g === generation ? resolve() : reject(OFF)), ms));
  };
  const ignoreOff = e => { if (e !== OFF) throw e; };
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);

  // ---------------------------------------------------------------- sound

  // Everything is synthesised: switch clicks, fan, disk heads, floppy
  // stepper, the CRT's degauss coil and the PC speaker.
  const sound = (() => {
    let ac = null, out = null, ambient = null, noise = null, spinners = [];

    function start() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      out = ac.createGain();
      out.gain.value = 0.7;
      out.connect(ac.destination);
      ambient = ac.createGain();
      ambient.connect(out);
      noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }

    const filter = (type, freq, q = 1) => {
      const f = ac.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      return f;
    };

    // A short burst of filtered noise: clicks, ticks and clunks.
    function burst(freq, q, gain, decay, at = 0) {
      if (!ac) return;
      const t = ac.currentTime + at;
      const src = ac.createBufferSource();
      src.buffer = noise;
      const g = ac.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      src.connect(filter('bandpass', freq, q)).connect(g).connect(out);
      src.start(t, Math.random() * 1.5, decay + 0.02);
    }

    function tone(type, freq, gain, at, dur, dest = out) {
      const t = ac.currentTime + at;
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ac.createGain();
      g.gain.setValueAtTime(gain, t);
      o.connect(g).connect(dest);
      o.start(t);
      if (dur) o.stop(t + dur);
      return { o, g, t };
    }

    function loopNoise(dest) {
      const src = ac.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      src.connect(dest);
      src.start();
      return src;
    }

    return {
      start,

      power() {
        burst(2200, 1, 0.7, 0.03);
        burst(250, 1, 0.6, 0.08);
        burst(3000, 1, 0.3, 0.02, 0.14);
      },

      // Power supply fan, mains hum and the hard disk spinning up to speed.
      fan() {
        if (!ac) return;
        const t = ac.currentTime;
        ambient.gain.setValueAtTime(0.0001, t);
        ambient.gain.exponentialRampToValueAtTime(1, t + 1.2);
        const fanGain = ac.createGain();
        fanGain.gain.value = 0.06;
        const lp = filter('lowpass', 650, 0.5);
        loopNoise(lp);
        lp.connect(fanGain).connect(ambient);
        tone('sine', 100, 0.012, 0, 0, ambient);
        const spin = tone('triangle', 15, 0.0001, 0.3, 0, ambient);
        spin.o.frequency.exponentialRampToValueAtTime(90, spin.t + 4);
        spin.g.gain.exponentialRampToValueAtTime(0.03, spin.t + 1.5);
        spin.g.gain.exponentialRampToValueAtTime(0.01, spin.t + 6);
        const whine = tone('sine', 140, 0.0001, 0.3, 0, ambient);
        whine.o.frequency.exponentialRampToValueAtTime(840, whine.t + 4);
        whine.g.gain.exponentialRampToValueAtTime(0.006, whine.t + 2);
        whine.g.gain.exponentialRampToValueAtTime(0.0015, whine.t + 6);
        spinners = [spin.o, whine.o];
      },

      // Switched off: the click of the switch, then the fan and the disk
      // spin down into silence.
      off() {
        if (!ac) return;
        const old = ac, t = ac.currentTime;
        burst(2200, 1, 0.7, 0.03);
        burst(250, 1, 0.6, 0.08);
        for (const o of spinners) {
          const f = o.frequency.value;
          o.frequency.cancelScheduledValues(t);
          o.frequency.setValueAtTime(f, t);
          o.frequency.setTargetAtTime(f / 5, t, 0.6);
        }
        out.gain.setTargetAtTime(0.0001, t + 0.1, 0.5);
        ac = null;
        setTimeout(() => old.close(), 3000);
      },

      // The tube coming on: degauss relay, a decaying 50 Hz "bwong", and the
      // crackle of static building up on the glass.
      degauss() {
        if (!ac) return;
        burst(900, 0.7, 0.5, 0.04);
        const lp = filter('lowpass', 400);
        lp.connect(out);
        for (const [type, freq, gain] of [['sawtooth', 50, 0.35], ['square', 100, 0.08]]) {
          const { g, t } = tone(type, freq, 0.0001, 0.02, 1.6, lp);
          g.gain.exponentialRampToValueAtTime(gain, t + 0.05);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
        }
        for (let i = 0; i < 14; i++) burst(rand(5000, 9000), 1, rand(0.05, 0.2), 0.01, 0.3 + rand(0, 0.8));
      },

      // POST passed: one short beep from the PC speaker.
      beep() {
        if (!ac) return;
        const hp = filter('highpass', 400);
        hp.connect(out);
        const { g, t } = tone('square', 1000, 0.0001, 0, 0.2, hp);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.004);
        g.gain.setValueAtTime(0.12, t + 0.17);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      },

      seek() {
        burst(5000, 3, 0.12, 0.008);
        burst(1200, 4, 0.1, 0.015);
      },

      // The floppy head stepping from track to track; many quick steps buzz.
      steps(n, interval) {
        for (let i = 0; i < n; i++) {
          burst(1300, 6, 0.35, 0.025, i * interval);
          burst(4000, 2, 0.12, 0.01, i * interval);
        }
      },

      // The floppy spindle motor, wobbling at 300 rpm. Returns its off switch.
      motor() {
        if (!ac) return () => {};
        const c = ac;
        const g = ac.createGain();
        g.gain.value = 0.05;
        const bp = filter('bandpass', 180, 1.5);
        const src = loopNoise(bp);
        bp.connect(g).connect(out);
        const wobble = tone('sine', 5, 0.025, 0, 0, g.gain);
        return () => {
          const t = c.currentTime;
          g.gain.cancelScheduledValues(t);
          g.gain.setTargetAtTime(0, t, 0.08);
          src.stop(t + 0.5);
          wobble.o.stop(t + 0.5);
        };
      },

      key() {
        burst(2600, 1.2, 0.12, 0.015);
        burst(700, 2, 0.1, 0.03);
      },

      // The monitor's relay as it locks onto a new video mode.
      relay() {
        burst(1500, 2, 0.35, 0.02);
        burst(200, 1, 0.3, 0.05);
      },

      // Once the game runs, let the fan fade into the background.
      settle() {
        if (!ac) return;
        ambient.gain.setTargetAtTime(0.0001, ac.currentTime, 1.5);
      }
    };
  })();

  // ---------------------------------------------------------------- LEDs

  const LED = {
    power: document.getElementById('led-power'),
    hdd: document.getElementById('led-hdd'),
    floppy: document.getElementById('led-floppy'),
    drive: document.getElementById('led-drive')
  };
  const light = (led, on) => led.classList.toggle('on', on);

  // Hard disk activity: the LED flickers along with the heads.
  async function hdd(ms) {
    const end = performance.now() + ms;
    while (performance.now() < end) {
      light(LED.hdd, true);
      sound.seek();
      await wait(rand(30, 110));
      light(LED.hdd, Math.random() < 0.3);
      await wait(rand(20, 90));
    }
    light(LED.hdd, false);
  }

  // Reading drive A:. The drive's own LED burns while the motor runs; the
  // one on the case flickers with each read.
  async function floppy(ms) {
    light(LED.drive, true);
    const stop = sound.motor();
    const end = performance.now() + ms;
    await wait(250);
    while (performance.now() < end) {
      const n = Math.random() < 0.25 ? Math.round(rand(8, 30)) : Math.round(rand(1, 3));
      sound.steps(n, n > 3 ? 0.005 : 0.012);
      light(LED.floppy, true);
      await wait(rand(60, 200));
      light(LED.floppy, false);
      await wait(rand(20, 120));
    }
    stop();
    light(LED.drive, false);
  }

  // POST's floppy check: the head runs out to the last track and back.
  async function floppySeekTest() {
    light(LED.drive, true);
    light(LED.floppy, true);
    const stop = sound.motor();
    await wait(300);
    sound.steps(40, 0.004);
    await wait(450);
    sound.steps(40, 0.004);
    await wait(500);
    stop();
    light(LED.drive, false);
    light(LED.floppy, false);
  }

  // ---------------------------------------------------------------- screen

  // An 80x25 text mode screen, as a character and a colour per cell.
  const screen = {
    chars: [], colors: [],
    row: 0, col: 0,
    on: false, cursor: false, logo: false, dirty: true,
    collapse: null // when the picture started collapsing, after switching off
  };

  const blankRow = () => Array(COLS).fill(' ');
  const grayRow = () => Array(COLS).fill(GRAY);

  function cls() {
    screen.chars = Array.from({ length: ROWS }, blankRow);
    screen.colors = Array.from({ length: ROWS }, grayRow);
    screen.row = screen.col = 0;
    screen.logo = false;
    screen.dirty = true;
  }

  function newline() {
    screen.col = 0;
    if (++screen.row === ROWS) {
      screen.chars.shift();
      screen.chars.push(blankRow());
      screen.colors.shift();
      screen.colors.push(grayRow());
      screen.row = ROWS - 1;
    }
  }

  function print(text, color = GRAY) {
    for (const ch of text) {
      if (ch === '\n') {
        newline();
        continue;
      }
      if (screen.col === COLS) newline();
      screen.chars[screen.row][screen.col] = ch;
      screen.colors[screen.row][screen.col] = color;
      screen.col++;
    }
    screen.dirty = true;
  }

  const println = (text = '', color) => print(text + '\n', color);

  function printAt(col, row, text, color = GRAY) {
    [...text].forEach((ch, i) => {
      if (col + i >= COLS) return;
      screen.chars[row][col + i] = ch;
      screen.colors[row][col + i] = color;
    });
    screen.dirty = true;
  }

  // Box drawing characters are drawn as lines, so the frames join up
  // whatever the font: arms up, right, down and left.
  const BOX = {
    '─': '0101', '│': '1010', '┌': '0110', '┐': '0011', '└': '1100', '┘': '1001',
    '├': '1110', '┤': '1011', '┬': '0111', '┴': '1101', '┼': '1111'
  };

  function drawBox(ch, x, y, cw, chh) {
    const [up, right, down, left] = BOX[ch];
    const t = Math.max(1, Math.round(chh / 14)), cx = Math.round(x + cw / 2 - t / 2), cy = Math.round(y + chh / 2 - t / 2);
    if (up === '1') ctx.fillRect(cx, y, t, cy - y + t);
    if (down === '1') ctx.fillRect(cx, cy, t, y + chh - cy + 0.5);
    if (left === '1') ctx.fillRect(x, cy, cx - x + t, t);
    if (right === '1') ctx.fillRect(cx, cy, x + cw - cx + 0.5, t);
  }

  // The EPA Energy Star in the top right corner of the Award screen.
  function drawEnergyStar(x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = CYAN;
    ctx.shadowColor = CYAN + '88';
    ctx.lineWidth = h * 0.05;
    const cx = x + w * 0.5, cy = y + h * 0.95, rx = w * 0.46, ry = h * 0.8, end = Math.PI * 1.85;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.05, end);
    ctx.stroke();
    const sx = cx + rx * Math.cos(end), sy = cy + ry * Math.sin(end), r = h * 0.14;
    ctx.fillStyle = YELLOW;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r * 0.42 : r;
      ctx.lineTo(sx + d * Math.cos(a), sy + d * Math.sin(a));
    }
    ctx.fill();
    ctx.fillStyle = CYAN;
    ctx.font = `italic ${h * 0.42}px Georgia, 'Times New Roman', serif`;
    ctx.fillText('energy', x + w * 0.17, y + h * 0.68);
    ctx.font = `${h * 0.22}px VT323, monospace`;
    ctx.fillText('EPA POLLUTION PREVENTER', x + w * 0.06, y + h * 1.02);
    ctx.restore();
  }

  function draw() {
    const w = crt.width, h = crt.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowBlur = 0;
    // Even showing black, a tube that is on glows a little.
    ctx.fillStyle = screen.on ? '#070908' : '#000';
    ctx.fillRect(0, 0, w, h);
    if (screen.collapse !== null) drawCollapse(w, h);
    if (!screen.on) return;

    const ox = w * BORDER.x, oy = h * BORDER.y;
    const cw = (w - 2 * ox) / COLS, chh = (h - 2 * oy) / ROWS;
    ctx.font = `${Math.round(chh * FONT_SCALE)}px VT323, monospace`;
    ctx.textBaseline = 'alphabetic';
    const sx = cw / ctx.measureText('M').width;
    // Phosphor bloom.
    ctx.shadowBlur = cw * 0.6;

    for (let r = 0; r < ROWS; r++) {
      const y = oy + r * chh, chars = screen.chars[r], colors = screen.colors[r];
      let c = 0;
      while (c < COLS) {
        const color = colors[c], start = c;
        ctx.fillStyle = color;
        ctx.shadowColor = color + '99';
        if (BOX[chars[c]]) {
          drawBox(chars[c], ox + c * cw, y, cw, chh);
          c++;
          continue;
        }
        let run = '';
        while (c < COLS && colors[c] === color && !BOX[chars[c]]) run += chars[c++];
        if (!run.trim()) continue;
        ctx.save();
        ctx.translate(ox + start * cw, y + chh * BASELINE);
        ctx.scale(sx, 1);
        ctx.fillText(run, 0, 0);
        ctx.restore();
      }
    }

    if (screen.logo) drawEnergyStar(ox + 60 * cw, oy, 19 * cw, 4.5 * chh);

    if (screen.cursor && blink) {
      ctx.fillStyle = GRAY;
      ctx.shadowColor = GRAY + '99';
      ctx.fillRect(ox + Math.min(screen.col, COLS - 1) * cw, oy + screen.row * chh + chh * 0.8, cw, chh * 0.12);
    }
  }

  // Switched off, the picture squeezes into a bright line, the line into a
  // dot, and the dot fades away.
  function drawCollapse(w, h) {
    const t = (performance.now() - screen.collapse) / 1000;
    if (t > 1.4) {
      screen.collapse = null;
      crt.classList.remove('on');
      return;
    }
    const squeeze = Math.min(1, t / 0.08), shrink = Math.min(1, Math.max(0, (t - 0.08) / 0.22));
    const lineW = Math.max(h * 0.012, w * (1 - shrink)), lineH = Math.max(h * 0.008, h * 0.5 * (1 - squeeze));
    ctx.globalAlpha = t < 0.3 ? 1 : 1 - (t - 0.3) / 1.1;
    ctx.fillStyle = '#e8f4ff';
    ctx.shadowColor = '#cfe6ff';
    ctx.shadowBlur = h * 0.04;
    ctx.fillRect((w - lineW) / 2, (h - lineH) / 2, lineW, lineH);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    screen.dirty = true;
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    crt.width = Math.max(1, Math.round(crt.clientWidth * dpr));
    crt.height = Math.max(1, Math.round(crt.clientHeight * dpr));
    screen.dirty = true;
  }

  let blink = false;

  function frame(now) {
    const b = Math.floor(now / 240) % 2 === 0;
    if (b !== blink) {
      blink = b;
      if (screen.cursor) screen.dirty = true;
    }
    if (typing && inputCol + (input.selectionStart ?? input.value.length) !== screen.col) showInput();
    if (screen.dirty) {
      screen.dirty = false;
      draw();
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- boot

  let on = false, skipMemoryTest = false;

  function setPower(state) {
    on = state;
    powerButtons.forEach(b => {
      b.classList.toggle('on', on);
      b.setAttribute('aria-label', on ? 'Switch off the computer' : 'Switch on the computer');
    });
    light(LED.power, on);
  }

  async function powerOn() {
    setPower(true);
    skipMemoryTest = false;
    screen.collapse = null;
    crt.classList.remove('on');
    sound.start();
    sound.power();
    sound.fan();
    hdd(600).catch(ignoreOff);
    await wait(700);

    // The monitor wakes up.
    sound.degauss();
    screen.on = true;
    screen.dirty = true;
    crt.classList.add('on');
    await wait(900);

    println('S3 Trio64V2/DX Video BIOS. Version 1.01.11-B4');
    println('Copyright 1996 S3 Incorporated.');
    await wait(1600);

    cls();
    screen.logo = true;
    println('Award Modular BIOS v4.51PG, An Energy Star Ally');
    println('Copyright (C) 1984-98, Award Software, Inc.');
    println();
    println('PRIEM-98 i440BX ACPI BIOS Revision 1024');
    println();
    println('PENTIUM II CPU at 300MHz');
    print('Memory Test :  ');
    printAt(0, ROWS - 2, 'Press DEL to enter SETUP, ESC to skip memory test');
    printAt(0, ROWS - 1, '10/24/98-i440BX-W977-2A69KA2BC-00');
    const memCol = screen.col, memRow = screen.row;
    await wait(500);
    for (let kb = 1024; kb <= 65536 && !skipMemoryTest; kb += 1024) {
      printAt(memCol, memRow, `${kb}K`.padStart(6), WHITE);
      await wait(36);
    }
    printAt(memCol, memRow, '65536K OK', WHITE);
    printAt(0, ROWS - 2, 'Press DEL to enter SETUP'.padEnd(COLS));
    await wait(400);
    sound.beep();
    await wait(600);

    screen.col = 0;
    screen.row = memRow;
    println('\n\n');
    println('Award Plug and Play BIOS Extension  v1.0A');
    println('Copyright (C) 1998, Award Software, Inc.');
    const drives = [
      ['Primary Master  ', 'QUANTUM FIREBALL SE3.2A', 1200],
      ['Primary Slave   ', 'None', 900],
      ['Secondary Master', 'PHILIPS CD-ROM 52X MAX', 1100],
      ['Secondary Slave ', 'None', 900]
    ];
    for (const [port, found, ms] of drives) {
      print(`   Detecting HDD ${port} ...`);
      if (found !== 'None') await hdd(ms);
      else await wait(ms);
      println(` ${found}`);
    }
    await floppySeekTest();
    await wait(300);

    cls();
    const line = (l, mid, r) => `${l}${'─'.repeat(39)}${mid}${'─'.repeat(36)}${r}`;
    const row = (a, b) => `│ ${a.padEnd(38)}│ ${b.padEnd(35)}│`;
    println(`┌${'─'.repeat(76)}┐`);
    println(`│${'Award Software, Inc.  System Configurations'.padStart(59).padEnd(76)}│`);
    println(line('├', '┬', '┤'));
    println(row('CPU Type      : PENTIUM II', 'Base Memory      :    640K'));
    println(row('Co-Processor  : Installed', 'Extended Memory  :  64512K'));
    println(row('CPU Clock     : 300MHz', 'Cache Memory     :    512K'));
    println(line('├', '┼', '┤'));
    println(row('Diskette Drive A  : 1.44M, 3.5 in.', 'Display Type     : EGA/VGA'));
    println(row('Diskette Drive B  : None', 'Serial Port(s)   : 3F8 2F8'));
    println(row('Pri. Master  Disk : LBA,Mode 4,3228MB', 'Parallel Port(s) : 378'));
    println(row('Pri. Slave   Disk : None', 'EDO DRAM at Row(s): None'));
    println(row('Sec. Master  Disk : CDROM,Mode 4', 'SDRAM at Row(s)  : 0 1'));
    println(row('Sec. Slave   Disk : None', ''));
    println(line('└', '┴', '┘'));
    await wait(1500);
    println('PCI device listing.....');
    println('Bus No. Device No. Func No. Vendor ID Device ID Device Class          IRQ');
    println('-'.repeat(78));
    for (const device of [
      '   0        7         1       8086      7111    IDE Controller         14',
      '   0        7         2       8086      7112    Serial bus controller  10',
      '   0       11         0       10EC      8029    Network controller      9',
      '   1        0         0       5333      8901    Display controller     11',
      '                                                ACPI Controller         9'
    ]) {
      println(device);
      await wait(120);
    }
    print('Verifying DMI Pool Data ');
    for (let i = 0; i < 12; i++) {
      await hdd(rand(60, 140));
      print('.');
    }
    println();
    await floppy(1600);

    println('Starting MS-DOS...');
    println();
    await floppy(1500);
    println('HIMEM is testing extended memory...done.');
    println();
    await floppy(1100);
    println('Type HELP for a list of commands.');
    println();
    input.disabled = false;
    input.maxLength = COLS - PROMPT.length - 1;
    input.focus({ preventScroll: true });
    prompt();
  }

  function powerOff() {
    generation++;
    setPower(false);
    sound.off();
    Object.values(LED).forEach(led => light(led, false));
    typing = false;
    input.value = '';
    input.disabled = true;
    window.stopAdventure();
    crt.hidden = input.hidden = false;
    // Only a tube that was showing something collapses.
    if (screen.on || crt.classList.contains('on')) screen.collapse = performance.now();
    screen.on = screen.cursor = false;
    cls();
  }

  function togglePower() {
    if (on) powerOff();
    else powerOn().catch(ignoreOff);
  }

  addEventListener('keydown', e => {
    if (e.key === 'Escape') skipMemoryTest = true;
  });

  // ---------------------------------------------------------------- DOS

  const FILES = [
    ['COMMAND', 'COM', 54645, '05-31-94', '6:22a'],
    ['HIMEM', 'SYS', 29136, '05-31-94', '6:22a'],
    ['CONFIG', 'SYS', 23, '10-24-98', '9:12p'],
    ['AUTOEXEC', 'BAT', 71, '10-24-98', '9:12p'],
    ['ADVENTUR', 'EXE', 412318, '10-24-98', '9:15p']
  ];
  const BYTES_FREE = 880640;
  const num = n => n.toLocaleString('en-US');

  let typing = false, inputRow = 0, inputCol = 0;

  function prompt() {
    print(PROMPT);
    inputRow = screen.row;
    inputCol = screen.col;
    input.value = '';
    screen.cursor = true;
    typing = true;
  }

  // The typed command lives in the hidden input; mirror it onto the screen.
  function showInput() {
    const value = input.value;
    for (let c = inputCol; c < COLS; c++) screen.chars[inputRow][c] = value[c - inputCol] || ' ';
    screen.row = inputRow;
    screen.col = Math.min(COLS - 1, inputCol + (input.selectionStart ?? value.length));
    screen.dirty = true;
  }

  input.addEventListener('input', () => {
    if (typing) showInput();
    else input.value = '';
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    if (!typing) {
      e.preventDefault();
      return;
    }
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') sound.key();
    if (e.key === 'Enter') {
      e.preventDefault();
      run(input.value).catch(ignoreOff);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  });

  async function run(line) {
    typing = false;
    screen.col = inputCol + line.length;
    input.value = '';
    println();
    const cmd = line.trim().toUpperCase().split(/[\s/]/)[0];
    if (!cmd) {
      prompt();
      return;
    }
    if (isAdventure(cmd)) {
      await launch();
      return;
    }
    if (cmd === 'HELP') {
      help();
    } else if (cmd === 'DIR') {
      await floppy(700);
      dir();
    } else {
      println('Bad command or file name');
    }
    println();
    prompt();
  }

  // DOS keeps to 8.3 names and quietly cuts longer ones short, so
  // ADVENTURE.EXE runs ADVENTUR.EXE.
  function isAdventure(cmd) {
    const [name, ext = ''] = cmd.replace(/^A:\\?/, '').split('.');
    return name.slice(0, 8) === 'ADVENTUR' && (ext === '' || ext === 'EXE');
  }

  function help() {
    println('Commands on this disk:');
    println();
    println('DIR            Lists the files on the disk.');
    println('HELP           Shows this list.');
    println("ADVENTURE.EXE  Starts the adventure on Mark Priem's island.");
  }

  function dir() {
    const total = FILES.reduce((sum, f) => sum + f[2], 0);
    println();
    println(' Volume in drive A is ISLAND');
    println(' Volume Serial Number is 1998-0A24');
    println(' Directory of A:\\');
    println();
    for (const [name, ext, size, date, time] of FILES) {
      println(`${name.padEnd(8)} ${ext.padEnd(3)} ${num(size).padStart(13)} ${date}  ${time.padStart(6)}`);
    }
    println(`${String(FILES.length).padStart(9)} file(s)${num(total).padStart(15)} bytes`);
    println(`${num(BYTES_FREE).padStart(32)} bytes free`);
  }

  async function launch() {
    await floppy(1800);
    // The game switches the card to graphics mode: a moment of black while
    // the monitor clicks over to the new signal.
    screen.on = false;
    screen.dirty = true;
    sound.relay();
    await wait(650);
    startGame();
    sound.settle();
  }

  function startGame() {
    crt.hidden = input.hidden = true;
    window.startAdventure();
  }

  // ---------------------------------------------------------------- start

  cls();
  new ResizeObserver(resize).observe(crt);
  document.fonts.load('20px VT323').then(() => { screen.dirty = true; }, () => {});

  powerButtons.forEach(b => b.addEventListener('click', togglePower));
  requestAnimationFrame(frame);
  if (DEBUG) {
    // Straight to the island while working on it.
    setPower(true);
    startGame();
  }
})();
