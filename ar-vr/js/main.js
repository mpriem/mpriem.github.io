import { story, D } from '../../js/story.js';
import { panels } from './panels.js';

const CHAPTERS = [
  { eyebrow: 'Level 01 · Play', title: 'I love stepping into other worlds', accent: '#00e5ff', accent2: '#ff2bd6',
    text: 'Put on a headset and the room disappears. Pull a can into your hand with the gravity gloves in Half-Life: Alyx, slice blocks to the beat in Beat Saber, dodge bullets in Superhot VR where time only moves when you do. That feeling of presence hooked me, and it still does.' },
  { eyebrow: 'Level 02 · Build', title: 'So I started building my own', accent: '#3dffb0', accent2: '#00e5ff',
    text: 'Playing was never enough, so I ran my own research experiments: virtual objects hiding behind real ones with occlusion, depth sensing and spatial mapping of real rooms, hand tracking and physics in VR, and indoor navigation guided by Bluetooth beacons.' },
  { eyebrow: 'Level 03 · Qoders.nl', title: 'From play to purpose', accent: '#a77bff', accent2: '#ffc83d',
    text: 'With <a href="https://www.qoders.nl">The Qoders Community</a> we explored what augmented reality could do for organisations, and worked on two ideas: digital treasure hunts and employee onboarding apps.' },
  { eyebrow: 'Level 04 · Too soon', title: 'Back in ’22, the Metaverse came too soon', accent: '#ffcf4a', accent2: '#ff8a1f',
    text: 'AR and the Metaverse didn’t bring what organisations needed yet. Headsets were heavy and pricey, phone AR meant holding up a screen, and the promises ran ahead of the hardware. So we pressed pause.' },
  { eyebrow: 'Level 05 · What’s next', title: 'AI brings it back', accent: '#ff2bd6', accent2: '#00e5ff',
    text: 'Now AI is getting really good, chips use less power and wearables are slowly getting lighter. I expect a resurgence of AI-powered AR and VR applications and virtual worlds, and I might well pick it up again.' },
  { eyebrow: 'Level 06 · Try it', title: 'One more thing: try a little AR', accent: '#00e5ff', accent2: '#ff2bd6',
    text: 'Start the camera on the panel and your browser tracks your face and hands in real time. You get a virtual visor, pointing a finger turns it into a lightsaber, and the cubes are there to be sliced. Open your mouth for a surprise.' },
];

// r = aspect ratio. Videos play muted and move on when they end; html panels come from a <template>.
const SLIDES = [
  { ch: 0, video: 'alyx-combine', r: 16 / 9, cap: 'Half-Life: Alyx', when: '© Valve' },
  { ch: 0, video: 'beat-saber-red-blue', r: 16 / 9, cap: 'Beat Saber', when: '© Beat Games' },
  { ch: 0, video: 'superhot-time', r: 16 / 9, cap: 'Superhot VR', when: '© Superhot Team' },
  { ch: 0, video: 'me-beat-saber', r: 848 / 480, cap: 'Me, mid-song', when: 'Beat Saber at home' },
  { ch: 1, video: 'occlusion', r: 432 / 960, cap: 'Occlusion', when: 'AR' },
  { ch: 1, src: 'depth-sensing.jpg', r: 720 / 1280, cap: 'Depth sensing', when: 'environment depth' },
  { ch: 1, video: 'spatial-mapping', r: 540 / 960, cap: 'Spatial mapping', when: 'AR' },
  { ch: 1, video: 'vr-hands', r: 720 / 408, cap: 'Hand tracking', when: 'grab, throw, stack' },
  { ch: 1, video: 'beacon-nav', r: 480 / 848, cap: 'Indoor navigation', when: 'Bluetooth beacons' },
  { ch: 2, html: 'qoders', r: 16 / 9, cap: 'The Qoders Community', when: 'qoders.nl' },
  { ch: 2, html: 'hunt', r: 16 / 9, cap: 'Idea one: treasure hunts', when: 'Qoders', hold: 8000 },
  { ch: 2, html: 'onboarding', r: 16 / 9, cap: 'Idea two: onboarding', when: 'Qoders', hold: 8000 },
  { ch: 3, html: 'install', r: 16 / 10, cap: 'metaverse_2022, paused', when: 'too soon', hold: 9000 },
  { ch: 4, html: 'resume', r: 16 / 10, cap: 'reality_v3, resuming', when: 'AI-powered', hold: 9000 },
  { ch: 5, html: 'demo', r: 16 / 10, cap: 'Live: your face and hands', when: 'on-device', hold: Infinity },
];

const VISIBLE = 4;
const stage = document.getElementById('stage');
const tilt = SLIDES.map(() => Math.random() * 3 - 1.5);

const look = {
  visible: VISIBLE,
  // Panels queue up behind the front one, up and to the right, angled like a curved VR menu.
  pose(i, depth) {
    const d = Math.min(depth, VISIBLE);
    const step = Math.min(stage.clientWidth * 0.045, 46);
    return {
      x: (d - 1) * step,
      y: -d * step * 0.55,
      z: -d * 90,
      rotationY: depth ? -14 : 0,
      rotation: depth ? tilt[i] : 0,
      opacity: depth < VISIBLE ? 1 : 0,
      '--dim': Math.min(0.75, d * 0.24),
    };
  },
  // The front panel swings away to the left, like swiping a window aside in a headset.
  out: () => ({ x: -stage.clientWidth * 0.62, y: 0, z: 120, rotationY: 48, rotation: 0, opacity: 0, '--dim': 0 }),
  // Booting up: the panels fly in from the depths.
  enter: () => ({ z: -900, opacity: 0, rotationY: -30 }),
};

// The blurred backdrop crossfades to whatever image or poster is in front.
const world = [...document.querySelectorAll('.world img')];
let worldSrc = '';

function setWorld(slide) {
  const src = slide.video ? `media/${slide.video}.jpg` : slide.src ? `media/${slide.src}` : '';
  if (src === worldSrc) return;
  worldSrc = src;
  const [img, old] = world.reverse();
  gsap.to(old, { opacity: 0, duration: 1.2 * D });
  if (!src) return;
  img.src = src;
  gsap.fromTo(img,{ opacity: 0, scale: 1.08 }, { opacity: 0.6, scale: 1, duration: 1.6 * D, ease: 'power2.out' });
}

story({
  chapters: CHAPTERS,
  slides: SLIDES,
  look,
  panels,
  onChapter: c => gsap.to(document.documentElement, { '--accent': c.accent, '--accent2': c.accent2, duration: 0.9 * D, ease: 'power2.inOut' }),
  onSlide: setWorld,
});
