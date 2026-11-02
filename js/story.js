// story.js: the engine behind the photo stories. A stack of cards (photos,
// videos or html panels) that moves on by itself, with the story text
// following along chapter by chapter.
//
// A page brings its own chapters and slides, and a look: where a card sits
// at each depth in the stack, where it flies off to and where it comes in from.
//
// The page needs #stage, #chapters (one button per chapter), #prev, #pause,
// #pause-icon, #next, #count, #bar, #back (the way out, back to the island
// in Mark's Room), and [data-field] elements that get filled with the
// matching field of the current chapter.

export const D = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.25 : 1;

const PHOTO_MS = 6000;
const VIDEO_MAX_MS = 22000;
const PLAY_ICON = '<path d="M4 2v12l10-6z"/>';
const PAUSE_ICON = '<path d="M4 2h3v12H4zM9 2h3v12H9z"/>';

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const play = video => video.play().catch(() => {});

export function story({ chapters, slides, look, panels = {}, onChapter, onSlide }) {
  const stage = $('stage');
  const bar = $('bar');
  const fields = document.querySelectorAll('[data-field]');
  const nav = [...$('chapters').children];

  let top = 0;
  let chapter = -1;
  let busy = false;
  let paused = false;
  let timer, barTween;

  const cards = slides.map((slide, index) => {
    const el = document.createElement('figure');
    el.className = 'card';
    el.style.setProperty('--r', slide.r);
    el.setAttribute('aria-roledescription', 'slide');
    el.setAttribute('aria-label', `${index + 1} of ${slides.length}: ${slide.cap}`);
    const media = createMedia(slide, index);
    const caption = document.createElement('figcaption');
    caption.innerHTML = `<span>${slide.cap}</span><small>${slide.when}</small>`;
    el.append(media, caption);
    stage.append(el);
    gsap.set(el, { xPercent: -50, yPercent: -50 });
    return { el, media, slide, index, panel: panels[slide.html]?.(media) };
  });

  function createMedia(slide, index) {
    let media;
    if (slide.video) {
      media = document.createElement('video');
      media.muted = media.playsInline = true;
      // A short clip (like a Live Photo) can loop for the slide's hold.
      media.loop = !!slide.loop;
      media.preload = 'none';
      media.poster = `media/${slide.video}.jpg`;
      media.src = `media/${slide.video}.mp4`;
      media.addEventListener('ended', () => index === top && next());
    } else if (slide.html) {
      media = $(`tpl-${slide.html}`).content.firstElementChild.cloneNode(true);
    } else {
      media = document.createElement('img');
      media.src = `media/${slide.src}`;
      media.alt = slide.cap;
      if (index > 3) media.loading = 'lazy';
    }
    media.classList.add('media');
    return media;
  }

  function layout(duration) {
    cards.forEach(card => {
      const depth = (card.index - top + cards.length) % cards.length;
      gsap.set(card.el, { zIndex: cards.length - depth });
      gsap.to(card.el, { ...look.pose(card.index, depth), duration: duration * D, ease: 'power3.out', overwrite: 'auto' });
      // Warm up the next videos so they start without a stall.
      if (card.slide.video && depth && depth <= 2) card.media.preload = 'auto';
    });
  }

  function next() {
    if (busy) return;
    busy = true;
    const card = cards[top];
    leave(card);
    gsap.to(card.el, {
      ...look.out(card.index),
      duration: 0.5 * D,
      ease: 'power2.in',
      onComplete() {
        top = (top + 1) % cards.length;
        layout(0.75);
        show();
        busy = false;
      },
    });
  }

  function goTo(index) {
    if (busy || index === top) return;
    leave(cards[top]);
    top = index;
    gsap.set(cards[top].el, look.out(top));
    layout(0.65);
    show();
  }

  const prev = () => goTo((top + cards.length - 1) % cards.length);

  function leave(card) {
    if (card.slide.video) card.media.pause();
    card.panel?.leave?.();
  }

  // Bring the story, the timer and the page itself in line with the top card.
  function show() {
    const { slide, media, panel } = cards[top];
    $('count').innerHTML = `<b>${pad(top + 1)}</b> / ${cards.length}`;
    setChapter(slide.ch);
    onSlide?.(slide, top);
    if (slide.video) {
      media.preload = 'auto';
      media.currentTime = 0;
      if (!paused) play(media);
    }
    panel?.enter?.();
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    barTween?.kill();
    gsap.set(bar, { scaleX: 0 });
    const { slide, media } = cards[top];
    const ms = slide.hold || (slide.video ? VIDEO_MAX_MS : PHOTO_MS);
    // A slide that holds forever waits for the visitor to move on.
    if (paused || ms === Infinity) return;
    if (slide.video && !slide.loop) {
      // Follow the video itself so the bar matches what is playing.
      const tick = () => {
        if (cards[top].media !== media) return;
        if (media.duration) gsap.set(bar, { scaleX: media.currentTime / media.duration });
        if (!media.paused) requestAnimationFrame(tick);
      };
      media.addEventListener('playing', tick, { once: true });
      requestAnimationFrame(tick);
    } else {
      barTween = gsap.to(bar, { scaleX: 1, duration: ms / 1000, ease: 'none' });
    }
    timer = setTimeout(next, ms);
  }

  function setChapter(ch) {
    if (ch === chapter) return;
    const first = chapter === -1;
    chapter = ch;
    const c = chapters[ch];
    onChapter?.(c);
    const swap = () => {
      fields.forEach(el => el.innerHTML = c[el.dataset.field]);
      nav.forEach((button, i) => button.setAttribute('aria-current', i === ch));
    };
    if (first) {
      swap();
      gsap.from(fields, { opacity: 0, y: 16, duration: 0.9 * D, stagger: 0.12, ease: 'power2.out', delay: 0.3 });
      return;
    }
    gsap.timeline()
      .to(fields, { opacity: 0, y: -10, duration: 0.3 * D, stagger: 0.05, ease: 'power1.in' })
      .add(swap)
      .fromTo(fields, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7 * D, stagger: 0.08, ease: 'power2.out' });
  }

  function togglePause(force = !paused) {
    paused = force;
    $('pause').setAttribute('aria-label', paused ? 'Play' : 'Pause');
    $('pause-icon').innerHTML = paused ? PLAY_ICON : PAUSE_ICON;
    const { slide, media } = cards[top];
    if (slide.video) paused ? media.pause() : play(media);
    schedule();
  }

  nav.forEach((button, i) => button.addEventListener('click', () => goTo(slides.findIndex(s => s.ch === i))));
  $('next').addEventListener('click', next);
  $('prev').addEventListener('click', prev);
  $('pause').addEventListener('click', () => togglePause());

  // Tap the stack for the next card, swipe either way on touch screens.
  // Media only takes pointer events when it is interactive (like a live
  // demo), so a tap there belongs to the media and only a swipe moves on.
  let downX = null;
  stage.addEventListener('pointerdown', e => { downX = e.clientX; });
  stage.addEventListener('pointerup', e => {
    if (downX === null) return;
    const dx = e.clientX - downX;
    downX = null;
    if (dx > 40) prev();
    else if (dx < -40 || !e.target.closest('.media')) next();
  });

  addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'Escape') location.href = $('back').href;
    else if (e.key === ' ' && e.target === document.body) {
      e.preventDefault();
      togglePause();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(timer);
      if (cards[top].slide.video) cards[top].media.pause();
    } else if (!paused) {
      togglePause(false);
    }
  });

  addEventListener('resize', () => layout(0));

  // Put the stack in place, then bring the visible cards in, the top one last.
  layout(0);
  cards.slice(0, look.visible).reverse().forEach((card, i) => {
    gsap.from(card.el, { ...look.enter(card.index), duration: D, ease: 'power3.out', delay: i * 0.12 * D });
  });
  show();
}
