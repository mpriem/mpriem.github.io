// What the html panels do when they come to the front, and when they leave.

import { D } from '../../js/story.js';
import { demo } from './demo.js';

function popTags(el) {
  const tags = el.querySelectorAll('.tag');
  return {
    enter() {
      gsap.fromTo(tags, { scale: 0, opacity: 0, transformOrigin: '50% 120%' }, { scale: 1, opacity: 1, duration: 0.5, stagger: 0.4, delay: 0.5, ease: 'back.out(2)' });
    },
  };
}

// An installer that gets stuck: the lines tick in, the bar steps up to
// data-to, and the status blinks whatever data-done says.
function install(el) {
  const bar = el.querySelector('.bar b');
  const pct = el.querySelector('.pct');
  const state = el.querySelector('.state');
  const lines = el.querySelectorAll('li');
  const { from = 0, to, busy, done } = el.dataset;
  pct.textContent = `${from}%`;
  bar.style.width = `${from}%`;
  let tl;
  return {
    enter() {
      const p = { v: +from };
      tl = gsap.timeline()
        .set(state, { textContent: busy, opacity: 1 })
        .fromTo(lines, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.35 }, 0.3)
        .fromTo(bar, { width: `${from}%` }, { width: `${to}%`, duration: 2.6 * D, ease: 'steps(14)' }, 0.3)
        .to(p, { v: +to, duration: 2.6 * D, ease: 'steps(14)', onUpdate: () => pct.textContent = `${Math.round(p.v)}%` }, 0.3)
        .set(state, { textContent: done })
        .to(state, { opacity: 0.3, duration: 0.6, yoyo: true, repeat: -1, ease: 'steps(1)' });
    },
    leave() { tl?.kill(); },
  };
}

export const panels = {
  hunt: popTags,
  onboarding: popTags,
  install,
  resume: install,
  demo,
};
