import { story, D } from '../../js/story.js';
import { panels } from './panels.js';

const CHAPTERS = [
  { eyebrow: 'Chapter I · The first roll', title: 'It started with my son', accent: '#e9bd6c', glow: 'rgba(226, 146, 62, .3)',
    text: 'My son wanted to play Dungeons &amp; Dragons, but he was too young to go to the table on his own. So I came along, rolled up a character of my own and sat down next to him. Since then I have played through several campaigns, at different tables with different Dungeon Masters, and every one of them taught me something about how a good story is told.' },
  { eyebrow: 'Chapter II · Behind the screen', title: 'Now I run my own table', accent: '#f6d38f', glow: 'rgba(242, 170, 84, .32)',
    text: 'These days I sit behind the Dungeon Master’s screen. What I love most is the storytelling: building a world with history, politics and a few dark corners, then watching the players make it their own. In <i>Het mysterie van Candlekeep</i> a party of four arrives at the great library fortress, each with secrets of their own. Follow the story at <a href="https://candlekeep.boomdock.nl">candlekeep.boomdock.nl</a>.' },
  { eyebrow: 'Chapter III · Arts &amp; crafts', title: 'Printed, painted, put on the table', accent: '#f0a868', glow: 'rgba(226, 116, 62, .3)',
    text: 'D&amp;D also brings out the maker in me. I 3D print and paint my own terrain and miniatures, so the dungeon the players walk into is one I built with my own hands.' },
  { eyebrow: 'Chapter IV · Dungeon Desk', title: 'So I built my own virtual tabletop', accent: '#e9bd6c', glow: 'rgba(104, 92, 214, .3)',
    text: 'Running a game takes a lot of tools, so I wrote my own. <a href="https://github.com/mpriem/Dungeon-Desk">Dungeon Desk</a> gives the DM an open world canvas, with a map window for the table, a media display for the TV, soundboards, scenes, encounters and combat.' },
];

// r = aspect ratio; html panels come from a <template>. A video slide plays
// media/<name>.mp4 with media/<name>.jpg as its poster; the Live Photo clips
// are only a couple of seconds long, so they loop for the slide's hold.
const SLIDES = [
  { ch: 0, html: 'roll', r: 4 / 3, cap: 'Roll for initiative', when: 'the first roll', hold: 7000 },
  { ch: 0, video: 'first-session', loop: true, r: 4 / 3, cap: 'Our very first session', when: 'where it all began', hold: 14000 },
  { ch: 1, html: 'candlekeep', r: 4 / 3, cap: 'Het mysterie van Candlekeep', when: 'my campaign', hold: 9000 },
  { ch: 1, html: 'map', r: 16 / 9, cap: 'The road to Candlekeep', when: 'Sword Coast', hold: 8000 },
  { ch: 1, src: 'session-night.jpg', r: 3 / 4, cap: 'Session night', when: 'into the dungeon' },
  { ch: 2, src: 'lit-dungeon.jpg', r: 4 / 3, cap: 'A dungeon, lit from within', when: 'printed & painted' },
  { ch: 2, video: 'terrain-painting', loop: true, r: 4 / 3, cap: 'Painting day', when: 'at the kitchen table', hold: 7000 },
  { ch: 2, src: 'dungeon-tiles.jpg', r: 4 / 3, cap: 'Dungeon floor tiles', when: 'drying' },
  { ch: 2, src: 'miniatures.jpg', r: 1400 / 885, cap: 'The finished miniatures', when: 'hand painted' },
  { ch: 3, html: 'desk', r: 4 / 3, cap: 'Dungeon Desk', when: 'my own VTT', hold: 9000 },
  { ch: 3, src: 'dd-table.jpg', r: 3 / 4, cap: 'Dungeon Desk at the table', when: 'minis on the map' },
  { ch: 3, src: 'dd-encounter.jpg', r: 3 / 4, cap: 'Mid-encounter', when: 'for the players', hold: 8000 },
];

const VISIBLE = 4;
const stage = document.getElementById('stage');
const tilt = SLIDES.map(() => Math.random() * 4 - 2);

const look = {
  visible: VISIBLE,
  // The cards fan out behind the front one, like a hand of spell cards.
  pose(i, depth) {
    const d = Math.min(depth, VISIBLE);
    return {
      x: d * Math.min(stage.clientWidth * 0.012, 12),
      y: -d * 6,
      rotation: depth ? d * 4.5 + tilt[i] : 0,
      rotationY: 0,
      scale: 1 - d * 0.035,
      transformOrigin: '50% 160%',
      opacity: depth < VISIBLE ? 1 : 0,
      '--dim': Math.min(0.7, d * 0.22),
    };
  },
  // The front card is flipped away to the left, like playing it.
  out: () => ({ x: -stage.clientWidth * 0.55, y: -30, rotation: -24, rotationY: 70, scale: 1, opacity: 0, '--dim': 0 }),
  // Deal the hand from below.
  enter: () => ({ y: innerHeight, rotation: -28, opacity: 0 }),
};

// Embers rising from the bottom, spread the same way as on Dungeon Desk's idle stage.
document.getElementById('embers').append(...Array.from({ length: 22 }, (_, i) => {
  const ember = document.createElement('i');
  const size = `${2 + (i % 3)}px`;
  Object.assign(ember.style, {
    left: `${(i * 37 + 11) % 100}%`,
    width: size,
    height: size,
    animationDelay: `${-((i * 1.7) % 14).toFixed(2)}s`,
    animationDuration: `${11 + ((i * 2.3) % 9)}s`,
  });
  ember.style.setProperty('--drift', `${((i % 5) - 2) * 18}px`);
  return ember;
}));

story({
  chapters: CHAPTERS,
  slides: SLIDES,
  look,
  panels,
  onChapter: c => gsap.to(document.documentElement, { '--accent': c.accent, '--glow': c.glow, duration: 0.9 * D, ease: 'power2.inOut' }),
});
