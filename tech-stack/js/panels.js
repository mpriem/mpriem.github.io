// What the html panels do when they come to the front: their .in parts
// appear one by one, like ink soaking into the page.

import { D } from '../../js/story.js';

function reveal(el) {
  const parts = el.querySelectorAll('.in');
  let tween;
  return {
    enter() {
      tween = gsap.fromTo(parts, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45 * D, stagger: 0.28 * D, delay: 0.4 * D, ease: 'power2.out' });
    },
    leave() { tween?.progress(1).kill(); },
  };
}

export const panels = Object.fromEntries(
  ['path', 'fetch', 'langs', 'scripts', 'machines', 'keep', 'agents', 'daily', 'cli'].map(name => [name, reveal]),
);
