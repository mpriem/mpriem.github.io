// Phones have no keyboard for the PC, so a game run from the A:\> prompt
// (boot.js) plays full screen with a stick on the left and one button on the
// right. A short tutorial comes first. Swiping in from the left edge goes back
// to the PC, and so does the phone's own back, since phones keep that edge
// swipe for themselves. Phones only run the room installed as an app
// (index.html), which has the whole screen already.
(() => {
  'use strict';

  const play = document.getElementById('play');
  const stick = document.getElementById('stick');
  const knob = stick.firstElementChild;
  const button = document.getElementById('button');
  const tutorial = document.getElementById('tutorial');

  // A swipe starts this close to the left edge and runs at least this far.
  const EDGE = 24, SWIPE = 70;

  let canvas = null, controls = null, home = null;
  let starting = null, pushed = false;

  // ---------------------------------------------------------------- stick

  let stickId = null;

  function steer(e) {
    const r = stick.getBoundingClientRect(), R = r.width / 2;
    let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R;
    const d = Math.hypot(x, y);
    if (d > 1) {
      x /= d;
      y /= d;
    }
    const reach = R - knob.offsetWidth / 2;
    knob.style.transform = `translate(${x * reach}px, ${y * reach}px)`;
    controls?.stick(x, y);
  }

  function centre() {
    stickId = null;
    knob.style.transform = '';
    controls?.stick(0, 0);
  }

  stick.addEventListener('pointerdown', e => {
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    steer(e);
  });
  stick.addEventListener('pointermove', e => { if (e.pointerId === stickId) steer(e); });
  for (const type of ['pointerup', 'pointercancel']) {
    stick.addEventListener(type, e => { if (e.pointerId === stickId) centre(); });
  }

  // ---------------------------------------------------------------- button

  function press(down) {
    button.classList.toggle('down', down);
    controls?.button(down);
  }

  button.addEventListener('pointerdown', e => {
    button.setPointerCapture(e.pointerId);
    press(true);
  });
  for (const type of ['pointerup', 'pointercancel']) {
    button.addEventListener(type, () => { if (button.classList.contains('down')) press(false); });
  }

  // ---------------------------------------------------------------- back to the PC

  let swipe = null;

  play.addEventListener('pointerdown', e => {
    if (e.clientX <= EDGE) swipe = { id: e.pointerId, x: e.clientX };
  });
  play.addEventListener('pointermove', e => {
    if (swipe?.id === e.pointerId && e.clientX - swipe.x >= SWIPE) exit();
  });
  for (const type of ['pointerup', 'pointercancel']) {
    play.addEventListener(type, e => { if (swipe?.id === e.pointerId) swipe = null; });
  }

  addEventListener('popstate', () => {
    if (!canvas) return;
    pushed = false;
    exit();
  });

  function exit() {
    if (!canvas) return;
    close();
    window.pad.onExit?.();
  }

  // ---------------------------------------------------------------- fade

  // The screen fades in from black (index.html) whenever a game goes full
  // screen, gives way to the PC again, or the phone is turned around.
  const fade = document.getElementById('fade');

  function fadeIn() {
    fade.classList.remove('on');
    void fade.offsetWidth;
    fade.classList.add('on');
  }

  fade.addEventListener('animationend', () => fade.classList.remove('on'));

  // ---------------------------------------------------------------- orientation

  // Once turned sideways, the screen stays the way it was turned. Android
  // lets an installed app lock it; Safari can't, so on an iPhone turning
  // upright again still brings back the message to turn it.
  const upright = matchMedia('(orientation: portrait)');

  function lockSideways() {
    const orientation = window.screen.orientation;
    if (handheld.matches && !upright.matches) orientation?.lock?.(orientation.type).catch(() => {});
  }

  upright.addEventListener('change', () => {
    if (!handheld.matches) return;
    fadeIn();
    lockSideways();
  });
  lockSideways();

  // ---------------------------------------------------------------- tutorial

  tutorial.addEventListener('click', () => {
    if (!starting) return;
    tutorial.hidden = true;
    const start = starting;
    starting = null;
    start(true);
  });

  // ---------------------------------------------------------------- open and close

  function close() {
    if (!canvas) return;
    if (stickId !== null) centre();
    if (button.classList.contains('down')) press(false);
    swipe = null;
    starting?.(false);
    starting = null;
    home.parent.insertBefore(canvas, home.next);
    canvas = controls = home = null;
    play.hidden = true;
    fadeIn();
    if (pushed) {
      pushed = false;
      history.back();
    }
  }

  window.pad = {
    // Called when the player leaves a game for the PC.
    onExit: null,

    // Shows `canvas` filling the screen, with the controls steering `ctrls`
    // ({ stick(x, y), button(down) }) and the tutorial `lines` on top.
    // Resolves to true when the tutorial is tapped away, or to false if the
    // player went back to the PC instead.
    open(game, ctrls, lines, aspect = game.width / game.height) {
      close();
      canvas = game;
      controls = ctrls;
      home = { parent: game.parentNode, next: game.nextSibling };
      play.style.setProperty('--aspect', aspect);
      play.prepend(game);
      tutorial.replaceChildren(...lines.map(line => {
        const p = document.createElement('p');
        p.textContent = line;
        return p;
      }));
      tutorial.hidden = false;
      play.hidden = false;
      fadeIn();
      history.pushState({ pad: true }, '');
      pushed = true;
      return new Promise(resolve => { starting = resolve; });
    },

    close
  };
})();
