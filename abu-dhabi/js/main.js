import { story, D } from '../../js/story.js';

const CHAPTERS = [
  { ar: 'مرحبا', eyebrow: 'Chapter one · Marhaba, welcome', title: 'A ticket to the desert',
    text: 'In late 2015 I packed my bags and moved to Abu Dhabi to start a three-year contract. A new country, a new job, and the desert right on my doorstep.' },
  { ar: 'مغامرة', eyebrow: 'Chapter two · Mughamara, adventure', title: 'The adventure of a lifetime',
    text: 'It didn’t take long to realise this was more than a job. It was the adventure of a lifetime, and one that would shape who I am today.' },
  { ar: 'عمل', eyebrow: 'Chapter three · Amal, work', title: 'Working in the city',
    text: 'My working days were spent among the glass towers, with early mornings when the skyline rose out of the fog and a view I never grew tired of.' },
  { ar: 'الحياة', eyebrow: 'Chapter four · Al-hayat, life', title: 'Life, lived outdoors',
    text: 'When the work was done, life happened outside: sundowners on the terrace, lazy beach days and warm evenings that never seemed to end.' },
  { ar: 'البحر', eyebrow: 'Chapter five · Al-bahr, the sea', title: 'Boating and fishing',
    text: 'Weekends were for the water. Out on the boat along the coast, fishing in the clear blue Gulf, and coming home with a catch or a story about the one that got away.' },
  { ar: 'مرح', eyebrow: 'Chapter six · Marah, fun', title: 'Never a dull weekend',
    text: 'In and around Abu Dhabi there was always something fun to do: the Sheikh Zayed Grand Mosque, Formula 1 at Yas Marina, and a skydive from 13,000 feet over the Palm.' },
  { ar: 'شكراً', eyebrow: 'Chapter seven · Shukran, thank you', title: 'Thank you, Abu Dhabi',
    text: 'Those three years formed me as a person. They were a great time in my life, and I look back on them fondly, every single day.' },
];

// r = aspect ratio. Videos play muted and move on when they end.
const SLIDES = [
  { ch: 0, src: '20151218_132926049_ios.jpg', r: 4 / 3, cap: 'Desert sunset', when: 'Dec 2015' },
  { ch: 0, src: '20151225_080131180_ios.jpg', r: 4 / 3, cap: 'Christmas Day at the Emirates Palace', when: 'Dec 2015' },
  { ch: 1, src: '20151218_152054000_ios.jpg', r: 4 / 3, cap: 'Camels crossing the dunes', when: 'Dec 2015' },
  { ch: 1, video: 'sandboarding', r: 16 / 9, cap: 'Sandboarding down the dunes', when: 'Dec 2015' },
  { ch: 2, src: '20180223_123421750_ios.jpg', r: 4 / 3, cap: 'Home, with a view', when: 'Feb 2018' },
  { ch: 2, src: '20161127_063715381_ios.jpg', r: 4 / 3, cap: 'The city from above', when: 'Nov 2016' },
  { ch: 2, src: 'img_1155.jpg', r: 4 / 3, cap: 'Towers rising from the fog', when: '' },
  { ch: 2, src: 'img_1565.jpg', r: 4 / 3, cap: 'Morning sun through the clouds', when: '' },
  { ch: 3, src: '20161113_132649653_ios.jpg', r: 4 / 3, cap: 'Sunset over the skyline', when: 'Nov 2016' },
  { ch: 3, src: '20161014_185914000_ios.jpg', r: 1024 / 437, cap: 'A sundowner with a view', when: 'Oct 2016' },
  { ch: 3, src: 'img_0105.jpg', r: 4 / 3, cap: 'Drinks on the terrace', when: '' },
  { ch: 3, src: '20161002_113706925_ios.jpg', r: 1400 / 427, cap: 'Beach day with the kitesurfers', when: 'Oct 2016' },
  { ch: 4, video: 'boat-ride', r: 16 / 9, cap: 'Out on the boat', when: 'Nov 2017' },
  { ch: 4, src: '20161022_053313203_ios.jpg', r: 3 / 4, cap: 'Catch of the day', when: 'Oct 2016' },
  { ch: 4, src: '20171128_114342973_ios.jpg', r: 4 / 3, cap: 'Dubai Marina from the water', when: 'Nov 2017' },
  { ch: 5, src: 'dsc05294.jpg', r: 4 / 3, cap: 'Sheikh Zayed Grand Mosque', when: '' },
  { ch: 5, src: '20171123_114536012_ios.jpg', r: 4 / 3, cap: 'In the pit lane at the Grand Prix', when: 'Nov 2017' },
  { ch: 5, video: 'grand-prix', r: 16 / 9, cap: 'Race day at Yas Marina', when: 'Nov 2017' },
  { ch: 5, src: '20171127_091238719_ios.jpg', r: 1280 / 959, cap: 'Fireworks over the circuit', when: 'Nov 2017' },
  { ch: 5, src: 'img_2832.jpg', r: 1400 / 933, cap: 'Ready to jump', when: 'Apr 2018' },
  { ch: 5, video: 'skydive', r: 16 / 9, cap: '13,000 feet above the Palm', when: 'Apr 2018' },
  { ch: 6, src: 'img_0745.jpg', r: 4 / 3, cap: 'One last desert sunset', when: '', hold: 10000 },
];

const VISIBLE = 5;
const stage = document.getElementById('stage');
const rand = (a, b) => a + Math.random() * (b - a);

// Every photo keeps its own slight skew and offset, so the edges of the
// photos underneath peek out.
const skew = SLIDES.map((_, i) => ({ rot: rand(4, 9) * (i % 2 ? 1 : -1), x: rand(-28, 28), y: rand(-18, 18) }));

const look = {
  visible: VISIBLE,
  pose(i, depth) {
    const d = Math.min(depth, VISIBLE);
    return {
      x: skew[i].x + d * 4,
      y: skew[i].y + d * 7,
      rotation: depth ? skew[i].rot : skew[i].rot * 0.35,
      scale: 1 - d * 0.03,
      opacity: depth < VISIBLE ? 1 : 0,
    };
  },
  // The top photo is tossed off to the right, then slides back under the stack.
  out: i => ({ x: stage.clientWidth * 0.55, y: -stage.clientHeight * 0.12, rotation: skew[i].rot + 22, scale: 1.02 }),
  // Deal the stack onto the table.
  enter: i => ({ y: -innerHeight, rotation: skew[i].rot * 3 }),
};

// Morning on the left of the panorama, evening on the right: the story
// drifts across the desert as the photos go by.
const desert = document.querySelector('.desert img');
let pan = 0;

function panDesert(p = pan, duration = 0) {
  pan = p;
  const travel = Math.max(0, desert.offsetWidth - innerWidth);
  gsap.to(desert, { x: -travel * p, duration, ease: 'sine.inOut', overwrite: true });
}

addEventListener('resize', () => panDesert());
desert.addEventListener('load', () => panDesert());

story({
  chapters: CHAPTERS,
  slides: SLIDES,
  look,
  onSlide: (slide, i) => panDesert(i / (SLIDES.length - 1), 3.2 * D),
});
