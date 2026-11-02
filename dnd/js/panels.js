// What the html panels do when they come to the front, and when they leave.

import { D } from '../../js/story.js';

// The d20 tumbles through a few faces before it lands on a natural 20.
function roll(el) {
  const die = el.querySelector('.d20');
  const face = el.querySelector('.face');
  const result = el.querySelector('.result');
  let tl;
  return {
    enter() {
      tl = gsap.timeline({ delay: 0.4 })
        .set(result, { opacity: 0, scale: 0.6 })
        .fromTo(die, { rotation: -540, scale: 0.4 }, {
          rotation: 0, scale: 1, duration: 1.6 * D, ease: 'power3.out',
          onUpdate() { if (this.progress() < 0.9) face.textContent = 1 + Math.floor(Math.random() * 19); },
          onComplete() { face.textContent = '20'; },
        })
        .to(result, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2.4)' })
        .to(die, { filter: 'drop-shadow(0 0 4cqw rgba(246, 211, 143, .8))', duration: 0.4, yoyo: true, repeat: 1 }, '<');
    },
    leave() { tl?.kill(); },
  };
}

function candlekeep(el) {
  const rows = el.querySelectorAll('li');
  return {
    enter() {
      gsap.fromTo(rows, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.35, delay: 0.5, ease: 'power2.out' });
    },
  };
}

// The route draws itself across the map, then the places appear along it.
function map(el) {
  const route = el.querySelector('.route');
  const marks = el.querySelectorAll('.mark');
  const length = route.getTotalLength?.() || 400;
  let tl;
  return {
    enter() {
      tl = gsap.timeline({ delay: 0.3 })
        .fromTo(route, { strokeDasharray: `${length}`, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 2.6 * D, ease: 'power1.inOut' })
        .fromTo(marks, { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.6 * D }, 0);
    },
    leave() { tl?.kill(); },
  };
}

// The flavour lines from Dungeon Desk's idle stage, shown between scenes.
const LINES = ['Gather round the table', 'The tale is about to begin', 'Something stirs in the dark', 'Here be dragons', 'Roll for initiative… soon'];

function desk(el) {
  const line = el.querySelector('.line');
  let i = 0;
  let tl;
  return {
    enter() {
      tl = gsap.timeline({ repeat: -1 })
        .fromTo(line, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.6 })
        .to(line, { opacity: 0, y: -4, duration: 0.5, delay: 2.2 })
        .call(() => line.textContent = LINES[++i % LINES.length]);
    },
    leave() { tl?.kill(); },
  };
}

export const panels = { roll, candlekeep, map, desk };
