// Toys on the desk in PC.webp. The Walkman plays a 90s rock tape: its play
// key starts the track, streamed rather than loaded up front, and pressing
// it again stops it. The Audi quattro on the tower revs its five cylinders
// and flashes its headlights.
(() => {
  'use strict';

  // ---------------------------------------------------------------- Walkman

  const play = document.querySelector('.play');
  const tape = new Audio();
  tape.preload = 'none';
  tape.loop = true;
  tape.src = 'assets/90s-Rock.mp3';

  const show = playing => play.setAttribute('aria-pressed', String(playing));
  tape.addEventListener('play', () => show(true));
  tape.addEventListener('pause', () => show(false));

  play.addEventListener('click', () => {
    if (tape.paused) tape.play().catch(() => show(false));
    else tape.pause();
  });

  // ---------------------------------------------------------------- quattro

  const audi = document.querySelector('.audi');
  const lamps = [...document.querySelectorAll('.lamp')];
  const REV_SECONDS = 2.7;

  // Two blips of the throttle as [seconds, rpm, throttle], with anti-lag
  // bangs from the exhaust each time the foot comes off.
  const REVS = [
    [0, 950, 0.15], [0.08, 1000, 1], [0.45, 6800, 1], [0.5, 6500, 0.1],
    [0.75, 2600, 0.1], [0.95, 2400, 0.15], [1.0, 2500, 1], [1.3, 7300, 1],
    [1.35, 7000, 0.1], [1.6, 3000, 0.1], [2.1, 1100, 0.1], [2.6, 950, 0.1]
  ];
  const BANGS = [0.52, 0.6, 0.71, 1.37, 1.46, 1.62];

  let ac = null, noise = null, revving = false;

  function audio() {
    if (ac) {
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ac;
  }

  // An inline five fires two and a half times per turn of the crank. The
  // engine is a few oscillators at the firing rate and the crank rate,
  // driven hard into a waveshaper, with intake roar on top.
  function engine() {
    if (!audio()) return;
    const t0 = ac.currentTime + 0.02, end = t0 + REV_SECONDS;

    const out = ac.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(0.5, t0 + 0.05);
    out.gain.setValueAtTime(0.5, end - 0.4);
    out.gain.exponentialRampToValueAtTime(0.0001, end);
    out.connect(ac.destination);

    const rpm = ac.createConstantSource();
    const throttle = ac.createConstantSource();
    REVS.forEach(([t, r, th], i) => {
      const at = i ? 'linearRampToValueAtTime' : 'setValueAtTime';
      rpm.offset[at](r, t0 + t);
      throttle.offset[at](th, t0 + t);
    });
    const drive = (param, scale, base = 0) => {
      param.value = base;
      const g = ac.createGain();
      g.gain.value = scale;
      rpm.connect(g).connect(param);
    };

    const shaper = ac.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / 512 - 1) * 3);
    shaper.curve = curve;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 3;
    drive(lp.frequency, 0.45, 180);
    const load = ac.createGain();
    load.gain.value = 0.35;
    const loadDepth = ac.createGain();
    loadDepth.gain.value = 0.65;
    throttle.connect(loadDepth).connect(load.gain);
    shaper.connect(lp).connect(load).connect(out);

    const oscs = [];
    for (const [type, perRpm, gain] of [['sawtooth', 2.5 / 60, 0.5], ['square', 1 / 60, 0.25], ['sawtooth', 5.02 / 60, 0.15]]) {
      const o = ac.createOscillator();
      o.type = type;
      drive(o.frequency, perRpm);
      const g = ac.createGain();
      g.gain.value = gain;
      o.connect(g).connect(shaper);
      oscs.push(o);
    }

    const intake = ac.createBufferSource();
    intake.buffer = noise;
    intake.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    drive(bp.frequency, 0.6, 200);
    const roar = ac.createGain();
    roar.gain.value = 0;
    const roarDepth = ac.createGain();
    roarDepth.gain.value = 0.12;
    throttle.connect(roarDepth).connect(roar.gain);
    intake.connect(bp).connect(roar).connect(out);

    for (const src of [rpm, throttle, intake, ...oscs]) {
      src.start(t0);
      src.stop(end);
    }
    BANGS.forEach(t => bang(t0 + t + Math.random() * 0.03, out));
  }

  // A pop from the exhaust: a thump of low noise with a crackle on top.
  function bang(t, dest) {
    for (const [freq, gain, decay] of [[120, 1.4, 0.09], [900, 0.5, 0.03]]) {
      const src = ac.createBufferSource();
      src.buffer = noise;
      const f = ac.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq * (0.8 + Math.random() * 0.4);
      const g = ac.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      src.connect(f).connect(g).connect(dest);
      src.start(t, Math.random() * 1.5, decay + 0.02);
    }
  }

  function flash() {
    for (const lamp of lamps) {
      lamp.classList.remove('flash');
      void lamp.offsetWidth;
      lamp.classList.add('flash');
    }
  }

  lamps.forEach(lamp => lamp.addEventListener('animationend', () => lamp.classList.remove('flash')));

  audi.addEventListener('click', () => {
    if (revving) return;
    revving = true;
    audi.classList.add('on');
    engine();
    flash();
    setTimeout(() => {
      revving = false;
      audi.classList.remove('on');
    }, REV_SECONDS * 1000);
  });
})();
