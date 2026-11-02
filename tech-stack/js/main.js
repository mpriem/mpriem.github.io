import { story, D } from '../../js/story.js';
import { panels } from './panels.js';

const CHAPTERS = [
  {
    num: 'I', eyebrow: 'Chapter I · Operating Systems', title: 'Linux', accent: '#d0aa68',
    text: 'Three years ago I switched from Windows to Linux, and I never looked back. For most of that time I ran Debian Testing, but since the very first release of Omarchy, most of my clients run Omarchy. Omarchy has the perfect mix of latest software and stability for me. My servers stay on Debian Stable.'
  },
  {
    num: 'II', eyebrow: 'Chapter II · Code Editors', title: 'Neovim', accent: '#98a47a',
    text: 'For code I use Neovim, and I’m a big fan. It is simple and it is fast, the Vim motions make me really productive, and the extensibility is unlike any other editor.'
  },
  {
    num: 'III', eyebrow: 'Chapter III · Programming Languages', title: 'Python, JavaScript, Rust, and others', accent: '#94a2bd',
    text: 'Python, JavaScript and Rust are my main languages. Now that I develop for Linux more and more, I’m increasingly looking at Lua, C, C++ and Qt/QML too. For scripting it’s Bash and PowerShell. Yes, Microsoft also makes great software, and PowerShell is one of those products.'
  },
  {
    num: 'IV', eyebrow: 'Chapter IV · Hardware', title: 'Client & Server', accent: '#cb9976',
    text: 'My client is a Surface Laptop 5, and I really love it. On my desk sits a Framework Desktop, a Mac mini and an Intel NUC, and on those I self-host many different services.'
  },
  {
    num: 'V', eyebrow: 'Chapter V · Platforms', title: 'Self-hosting', accent: '#8fb0ab',
    text: 'I’m a big self-hoster, and I love the projects that make it possible: Immich, Plex, Forgejo, Penpot, Bifrost and Portainer, just to name a few.'
  },
  {
    num: 'VI', eyebrow: 'Chapter VI · Coding Agents', title: 'Frontier & Local', accent: '#b39ab1',
    text: 'For agentic work I mostly use Claude and Codex. For privacy-sensitive work I switch to Pi with Qwen, so nothing has to leave my own machines.'
  },
  {
    num: 'VII', eyebrow: 'Chapter VII · Ricing', title: 'Make it your own', accent: '#cf8277',
    text: 'I like to create my own widgets and tools, and to rice my setup until it feels like mine. This is Moonbound: a spellbook for a launcher, parchment terminals and a storm over the mountains.'
  },
  {
    num: 'VIII', eyebrow: 'Chapter VIII · Tools', title: 'Browsers, terminal and ten trusty tools', accent: '#d5af70',
    text: 'Zen and Vivaldi are my favorite browsers, and Ghostty my terminal. Outside Neovim and the classic Unix tools, these are my ten favourite command-line tools.'
  },
];

// r = aspect ratio. Videos play muted and move on when they end (hold keeps
// the long ones from being cut short); html panels come from a <template>.
const SLIDES = [
  { ch: 0, html: 'path', r: 16 / 10, cap: 'Windows → Debian → Omarchy', when: 'Leaving Windows behind', hold: 8000 },
  { ch: 0, html: 'fetch', r: 16 / 10, cap: 'neofetch on my laptop', when: 'Omarchy', hold: 9000 },
  { ch: 1, src: 'neovim.jpg', r: 2254 / 1502, cap: 'Neovim, with Neo-tree and my notes', when: 'screenshot' },
  { ch: 1, video: 'neovim-harpoon', r: 1280 / 854, cap: 'Neo-tree and Harpoon', when: 'keys on screen', hold: 16000 },
  { ch: 1, video: 'vim-motions', r: 1280 / 824, cap: 'Vim motions, live', when: 'keys on screen', hold: 17000 },
  { ch: 2, html: 'langs', r: 16 / 10, cap: 'Languages', when: 'daily and learning', hold: 8000 },
  { ch: 2, html: 'scripts', r: 16 / 10, cap: 'Bash and PowerShell', when: 'scripting', hold: 9000 },
  { ch: 3, html: 'machines', r: 16 / 10, cap: 'The hardware', when: 'client and servers', hold: 9000 },
  { ch: 4, html: 'keep', r: 16 / 10, cap: 'Self-hosted', when: 'just a few', hold: 9000 },
  { ch: 5, html: 'agents', r: 16 / 10, cap: 'Claude, Codex, Pi with Qwen', when: 'agents', hold: 8000 },
  { ch: 6, video: 'rice', r: 1280 / 854, cap: 'Moonbound, my rice', when: 'Omarchy + Hyprland', hold: 52000 },
  { ch: 7, html: 'daily', r: 16 / 10, cap: 'Zen, Vivaldi and Ghostty', when: 'every day', hold: 7000 },
  { ch: 7, html: 'cli', r: 16 / 10, cap: 'Top 10 CLI tools', when: 'outside Neovim', hold: 12000 },
];

const VISIBLE = 4;
const stage = document.getElementById('stage');
const tilt = SLIDES.map((_, i) => (i % 2 ? 1 : -1) * (1 + Math.random() * 1.5));

const look = {
  visible: VISIBLE,
  // Loose pages from the grimoire, the ones still to come peeking out behind the top one.
  pose(i, depth) {
    const d = Math.min(depth, VISIBLE);
    const step = Math.min(stage.clientWidth * 0.03, 28);
    return {
      x: d * step,
      y: -d * step * 0.8,
      rotation: depth ? tilt[i] * d * 0.8 : 0,
      rotationY: 0,
      transformOrigin: '50% 50%',
      scale: 1 - d * 0.04,
      opacity: depth < VISIBLE ? 1 : 0,
      '--dim': Math.min(0.8, d * 0.26),
    };
  },
  // The top page is turned over to the left.
  out: () => ({ transformOrigin: '0% 50%', x: -stage.clientWidth * 0.5, y: 10, rotationY: 75, rotation: -6, scale: 0.96, opacity: 0, '--dim': 0.4 }),
  // Opening the book: the pages rise up out of the dark.
  enter: i => ({ y: innerHeight * 0.6, rotation: tilt[i] * 6, opacity: 0 }),
};

// The mountains drift as the pages turn, the near ones fastest.
const layers = [...document.querySelectorAll('.peaks')];

function drift(i) {
  const p = i / (SLIDES.length - 1);
  layers.forEach((layer, n) => gsap.to(layer, { xPercent: -p * (4 + n * 6), duration: 3 * D, ease: 'sine.inOut', overwrite: true }));
}

// The clock in the bar, like the one on my desktop.
const clock = document.getElementById('clock');
const tick = () => clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
tick();
setInterval(tick, 10000);

story({
  chapters: CHAPTERS,
  slides: SLIDES,
  look,
  panels,
  onChapter: c => gsap.to(document.documentElement, { '--accent': c.accent, duration: 0.9 * D, ease: 'power2.inOut' }),
  onSlide: (slide, i) => drift(i),
});
