// Only type things out for those who don't mind the motion; everyone
// else gets the page as it is.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('typing');
}

// The rest needs the page, so it waits for it to load.
addEventListener('DOMContentLoaded', () => {
  // Time in the Netherlands on the status line, and how long ago the first
  // job started (September 1999).
  (() => {
    const clock = document.getElementById('clock');
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' });
    const tick = () => clock.textContent = time.format(new Date());
    tick();
    setInterval(tick, 15000);

    const now = new Date();
    const months = (now.getFullYear() - 1999) * 12 + now.getMonth() - 8;
    const years = Math.floor(months / 12), rest = months % 12;
    document.getElementById('uptime').textContent =
      `${years} years${rest ? `, ${rest} month${rest > 1 ? 's' : ''}` : ''} in IT`;
    document.getElementById('year').textContent = now.getFullYear();
  })();

  // typing.js: every [data-type] block types itself out once it scrolls
  // into view, in page order. "cmd" types like a person after the prompt,
  // "out" streams like program output, "lines" prints a line at a time.
  // Scrolling past a block, or a click or key press, finishes the typing
  // at once.
  (() => {
    if (!document.documentElement.classList.contains('typing')) return;
    const blocks = [...document.querySelectorAll('[data-type]')];
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Each text node becomes the part typed so far, still empty, and the
    // rest in a ghost span that keeps its place in the layout.
    for (const block of blocks) {
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      const nodes = [];
      // Whitespace between elements is left alone: wrapped in a span it
      // would take a cell of its own in a grid, like the certifications.
      while (walker.nextNode()) if (walker.currentNode.data.trim()) nodes.push(walker.currentNode);
      block.parts = nodes.map(node => {
        const instant = !!node.parentElement.closest('.ps1, .sr-only');
        const shown = document.createTextNode('');
        const ghost = document.createElement('span');
        ghost.className = 'ghost';
        node.replaceWith(shown, ghost);
        ghost.append(node);
        return { shown, ghost, rest: node, instant };
      });
      block.classList.add('ready');
    }

    let skipping = false;
    const hurry = block => skipping || block.getBoundingClientRect().bottom < 0;

    async function type(block) {
      const mode = block.dataset.type;
      block.classList.add('started');
      let prompted = false;
      for (const part of block.parts) {
        const { shown, rest } = part;
        // A beat at the prompt before typing the command.
        if (mode === 'cmd' && !part.instant && !prompted) {
          prompted = true;
          if (!hurry(block)) await wait(450);
        }
        while (rest.data) {
          let n = rest.data.length;
          const fast = part.instant || hurry(block);
          if (!fast && mode === 'cmd') n = 1;
          else if (!fast && mode === 'out') n = 3;
          else if (!fast && mode === 'lines') {
            const end = rest.data.indexOf('\n');
            if (end >= 0) n = end + 1;
          }
          shown.data += rest.data.slice(0, n);
          rest.data = rest.data.slice(n);
          shown.after(cursor);
          if (fast) continue;
          document.body.classList.add('busy');
          await wait(mode === 'cmd' ? 40 + Math.random() * 80 : mode === 'lines' ? 30 : 10);
        }
      }
      document.body.classList.remove('busy');
      if (mode === 'cmd' && !hurry(block)) await wait(300);
      for (const { ghost } of block.parts) ghost.remove();
      block.classList.add('done');
      block.dispatchEvent(new Event('typed'));
    }

    const queue = [];
    let running = false;
    async function run() {
      if (running) return;
      running = true;
      while (queue.length) await type(queue.shift());
      running = false;
      skipping = false;
    }

    // A block coming into view queues itself and anything above it that
    // hasn't had its turn yet.
    const seen = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const last = blocks.indexOf(entry.target);
        for (const block of blocks.slice(0, last + 1)) {
          if (block.queued) continue;
          block.queued = true;
          seen.unobserve(block);
          queue.push(block);
        }
      }
      run();
    }, { rootMargin: '0px 0px -10% 0px' });
    blocks.forEach(block => seen.observe(block));

    addEventListener('click', event => {
      if (running && !event.target.closest('a')) skipping = true;
    });
    addEventListener('keydown', event => {
      if (running && !event.metaKey && !event.ctrlKey && !['Tab', 'Shift', 'Alt'].includes(event.key)) skipping = true;
    });

    // The photo, once its ASCII has printed.
    const photo = document.querySelector('.photo');
    photo.addEventListener('typed', () => setTimeout(() => photo.classList.add('rendered'), 500));
  })();
});
