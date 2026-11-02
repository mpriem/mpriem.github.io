// The library: reads the Goodreads export next to this page and puts every book on a bookcase.
// To update it, export the library from Goodreads again and replace goodreads_library_export.csv.

const GENRES = {
  scifi: { label: 'Sci-fi', color: 'var(--scifi)' },
  fantasy: { label: 'Fantasy', color: 'var(--fantasy)' },
  thriller: { label: 'Thrillers', color: 'var(--thriller)' },
  other: { label: 'Everything else', color: 'var(--other)' },
};

// Goodreads exports have no genres, so they come from the author (and a few titles).
const BY_AUTHOR = {
  scifi: [
    'Martha Wells', 'Liu Cixin', 'Dan Simmons', 'James S.A. Corey', 'Neal Stephenson', 'Hugh Howey',
    'Adrian Tchaikovsky', 'Pierce Brown', 'Gary Whitta', 'Douglas Adams', 'Orson Scott Card', 'Frank Herbert',
    'Arthur C. Clarke', 'Ernest Cline', 'Sara King', 'H.G. Wells', 'Blake Crouch', 'Michael Crichton',
    'Karen Traviss', 'Tobias S. Buckell', 'Joseph Staten', 'Eric S. Nylund', 'Greg Bear', 'William C. Dietz',
    'George Orwell', 'Veronica Roth', 'Suzanne Collins', 'Christopher Ruocchio',
  ],
  fantasy: [
    'Brandon Sanderson', 'Stephen King', 'Joe Abercrombie', 'Andrzej Sapkowski', 'Ed Greenwood', 'R.A. Salvatore',
    'Patrick Rothfuss', 'Tim Powers', 'J.R.R. Tolkien', 'J.K. Rowling', 'Tonke Dragt', 'Terry Pratchett',
    'Steven Erikson', 'John Gwynne', 'Bernard Cornwell',
  ],
  thriller: [
    'Mark Greaney', 'Gregg Hurwitz', 'Lee Child', 'Dan Ames', 'David Baldacci', 'Robert Dugoni', 'Tom Clancy',
    'Stephen Templin', 'Andy McNab', 'Dorothy B. Hughes',
  ],
};
const BY_TITLE = {
  '11/22/63': 'scifi',
  'The Stand': 'other',
  'Koning van Katoren': 'fantasy',
};
const AUTHOR_GENRE = new Map(Object.entries(BY_AUTHOR).flatMap(([g, names]) => names.map(n => [n, g])));

const SHELVES = [
  { id: 'read', label: 'Read' },
  { id: 'currently-reading', label: 'Reading now' },
  { id: 'to-read', label: 'Want to read' },
];

const $ = id => document.getElementById(id);
const state = { genre: 'all', shelf: 'read', sort: 'recent', query: '', list: false, open: null };
let books = [];

// ---- Data ----

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

// "Oathbringer (The Stormlight Archive, #3)" -> title "Oathbringer", series "The Stormlight Archive #3"
function splitTitle(raw) {
  const m = raw.match(/^(.*?)\s*\(([^()]*?),?\s*#\s*([\d.]+)[^()]*\)\s*$/);
  if (!m) return { title: raw.replace(/\s*\([^()]*\)\s*$/, '') || raw, series: '' };
  return { title: m[1], series: `${m[2].replace(/,$/, '')} #${m[3]}` };
}

const date = s => (s ? new Date(s.replace(/\//g, '-') + 'T12:00:00') : null);

function toBook(r, i) {
  const author = r['Author'].replace(/\s+/g, ' ').trim();
  const { title, series } = splitTitle(r['Title'].trim());
  const genre = BY_TITLE[title] || AUTHOR_GENRE.get(author) || 'other';
  return {
    i,
    id: r['Book Id'],
    title,
    series,
    author,
    genre,
    shelf: r['Exclusive Shelf'],
    rating: Math.round(Number(r['My Rating']) || 0),
    pages: Number(r['Number of Pages']) || 0,
    year: Number(r['Original Publication Year']) || Number(r['Year Published']) || 0,
    read: date(r['Date Read']),
    added: date(r['Date Added']),
    isbn: r['ISBN13'].replace(/[="]/g, '') || r['ISBN'].replace(/[="]/g, ''),
    review: r['My Review'].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim(),
  };
}

// ---- Looks ----

function hash(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

// Each genre has its own palette; a series shares one colour so it reads as a set on the shelf.
const PALETTES = {
  scifi: [[188, 55, 34], [200, 45, 26], [172, 40, 30], [214, 38, 38], [190, 60, 46], [230, 25, 22]],
  fantasy: [[28, 62, 34], [12, 55, 30], [350, 40, 28], [38, 70, 42], [140, 30, 24], [20, 35, 20]],
  thriller: [[4, 58, 34], [0, 0, 16], [220, 12, 24], [10, 45, 24], [355, 50, 42]],
  other: [[90, 22, 32], [60, 25, 38], [30, 20, 52], [200, 10, 60], [110, 18, 24]],
};
function colours(b) {
  const key = b.series ? b.series.replace(/ #.*$/, '') : b.title;
  const p = PALETTES[b.genre];
  const [h, s, l] = p[hash(key) % p.length];
  return { bg: `hsl(${h} ${s}% ${l}%)`, fg: l > 50 ? '#1a1410' : '#f6ecd8' };
}

const stars = n => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = n => n.toLocaleString('en-GB');
const monthYear = d => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

// ---- Rendering ----

const inGenre = b => state.genre === 'all' || b.genre === state.genre;

function renderGenres() {
  const read = books.filter(b => b.shelf === state.shelf);
  const items = [['all', 'All', 'var(--ink)'], ...Object.entries(GENRES).map(([k, g]) => [k, g.label, g.color])];
  $('genres').innerHTML = items.map(([k, label, c]) => `
    <button type="button" data-genre="${k}" style="--c:${c}" aria-pressed="${state.genre === k}">
      ${k === 'all' ? '' : '<i></i>'}${label} <small>${read.filter(b => k === 'all' || b.genre === k).length}</small>
    </button>`).join('');
}

function renderShelves() {
  $('shelves').innerHTML = SHELVES.map(s => `
    <button type="button" role="tab" data-shelf="${s.id}" aria-selected="${state.shelf === s.id}">
      ${s.label} <small>${books.filter(b => b.shelf === s.id && inGenre(b)).length}</small>
    </button>`).join('');
}

function renderStory() {
  const read = books.filter(b => b.shelf === 'read');
  const pages = read.reduce((n, b) => n + b.pages, 0);
  const firstYear = Math.min(...read.map(b => (b.read || b.added).getFullYear()));
  const fav = read.filter(b => b.rating === 5).length;
  const realms = read.filter(b => b.genre === 'scifi' || b.genre === 'fantasy').length;

  $('eyebrow').textContent = `Reading · ${read.length} books since ${firstYear}`;
  $('stats').innerHTML = `
    <div><dt>Books read</dt><dd>${read.length}</dd></div>
    <div><dt>Pages turned</dt><dd>${fmt(pages)}</dd></div>
    <div><dt>Five stars</dt><dd>${fav}</dd></div>
    <div><dt>Sci-fi &amp; fantasy</dt><dd>${Math.round((realms / read.length) * 100)}%</dd></div>`;

  const counts = Object.keys(GENRES).map(g => [g, read.filter(b => b.genre === g).length]);
  $('split').innerHTML = `
    <div class="bar">${counts.map(([g, n]) => `<i style="--c:${GENRES[g].color};flex-grow:${n}"></i>`).join('')}</div>
    <div class="legend">${counts.map(([g, n]) => `<span style="--c:${GENRES[g].color}">${GENRES[g].label} <b>${n}</b></span>`).join('')}</div>`;

  const now = books.filter(b => b.shelf === 'currently-reading');
  $('now').innerHTML = now.length ? `<h2>On the nightstand</h2>${now.map(b => `
    <button type="button" data-open="${b.i}" style="--c:${GENRES[b.genre].color}">
      <i></i><span>${esc(b.title)}<small>${esc(b.author)}</small></span>
    </button>`).join('')}` : '';
}

const SORTS = {
  recent: (a, b) => (b.read || b.added) - (a.read || a.added) || a.i - b.i,
  rating: (a, b) => b.rating - a.rating || SORTS.recent(a, b),
  author: (a, b) => a.author.split(' ').pop().localeCompare(b.author.split(' ').pop()) || a.series.localeCompare(b.series, 'en', { numeric: true }) || a.year - b.year,
  pages: (a, b) => b.pages - a.pages,
  year: (a, b) => a.year - b.year,
};

function renderBooks() {
  const q = state.query.trim().toLowerCase();
  const list = books
    .filter(b => b.shelf === state.shelf && inGenre(b))
    .filter(b => !q || `${b.title} ${b.series} ${b.author}`.toLowerCase().includes(q))
    .sort(SORTS[state.sort]);

  const el = $('books');
  el.classList.toggle('list', state.list);
  if (!list.length) {
    el.innerHTML = `<p class="empty">${q ? 'Nothing on this shelf matches that.' : 'This shelf is empty.'}</p>`;
    return;
  }
  el.innerHTML = list.map((b, n) => {
    const { bg, fg } = colours(b);
    const w = Math.round(22 + Math.min(Math.max(b.pages, 120), 1300) / 1300 * 34);
    const h = 72 + (hash(b.title) % 22);
    return `
      <button type="button" class="book g-${b.genre}" data-open="${b.i}" aria-pressed="${state.open === b.i}"
        aria-label="${esc(b.title)} by ${esc(b.author)}" title="${esc(b.title)} · ${esc(b.author)}"
        style="--i:${n};--bg:${bg};--fg:${fg};--w:${w}px;--h:${h}%">
        <span class="spine"><span>${esc(b.title)}</span>${b.rating === 5 ? '<b>★</b>' : ''}</span>
        <span class="row-mark"></span>
        <span class="row-title"><strong>${esc(b.title)}</strong><small>${esc(b.author)}${b.series ? ` · ${esc(b.series)}` : ''}</small></span>
        <span class="row-meta">${b.rating ? `<span class="stars">${stars(b.rating)}</span>` : ''}${b.year || ''}${b.pages ? ` · ${b.pages}p` : ''}</span>
      </button>`;
  }).join('');
}

function renderCard() {
  const card = $('card');
  const b = books[state.open];
  if (!b) { card.hidden = true; return; }
  const { bg, fg } = colours(b);
  const when = b.shelf === 'read'
    ? (b.read ? `Read in <b>${monthYear(b.read)}</b>` : '')
    : b.shelf === 'currently-reading' ? '<b>Reading it now</b>' : `On the list since <b>${monthYear(b.added)}</b>`;
  card.style.setProperty('--c', GENRES[b.genre].color);
  card.innerHTML = `
    <div class="cover" style="--bg:${bg};--fg:${fg}">${esc(b.title)}
      ${b.isbn ? `<img src="https://covers.openlibrary.org/b/isbn/${b.isbn}-M.jpg?default=false" alt="" onerror="this.remove()">` : ''}
    </div>
    <div class="info">
      <p class="kicker">${GENRES[b.genre].label}${b.series ? ` · ${esc(b.series)}` : ''}</p>
      <h2>${esc(b.title)}</h2>
      <p class="by">by ${esc(b.author)}</p>
      <p class="facts">
        ${b.rating ? `<span class="stars" aria-label="${b.rating} out of 5 stars">${stars(b.rating)}</span>` : ''}
        ${b.year ? `<span>Published <b>${b.year}</b></span>` : ''}
        ${b.pages ? `<span><b>${fmt(b.pages)}</b> pages</span>` : ''}
        ${when ? `<span>${when}</span>` : ''}
      </p>
      ${b.review ? `<blockquote>${esc(b.review)}</blockquote>` : ''}
      <a class="gr" href="https://www.goodreads.com/book/show/${b.id}" target="_blank" rel="noopener">View on Goodreads &rarr;</a>
    </div>
    <button type="button" class="close" aria-label="Close">&times;</button>`;
  card.hidden = false;
}

function render() {
  renderGenres();
  renderShelves();
  renderBooks();
  renderCard();
}

function open(i) {
  state.open = state.open === i ? null : i;
  for (const el of $('books').querySelectorAll('[data-open]')) el.setAttribute('aria-pressed', String(Number(el.dataset.open) === state.open));
  renderCard();
}

// ---- Wiring ----

$('genres').addEventListener('click', e => {
  const btn = e.target.closest('[data-genre]');
  if (!btn) return;
  state.genre = btn.dataset.genre === state.genre ? 'all' : btn.dataset.genre;
  state.open = null;
  render();
});
$('shelves').addEventListener('click', e => {
  const btn = e.target.closest('[data-shelf]');
  if (!btn) return;
  state.shelf = btn.dataset.shelf;
  state.open = null;
  $('scroll').scrollTop = 0;
  render();
});
$('search').addEventListener('input', e => { state.query = e.target.value; renderBooks(); });
$('sort').addEventListener('change', e => { state.sort = e.target.value; renderBooks(); });
$('view').addEventListener('click', () => {
  state.list = !state.list;
  const label = state.list ? 'Show as shelf' : 'Show as list';
  $('view').setAttribute('aria-label', label);
  $('view').title = label;
  $('view').innerHTML = state.list
    ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h3v11H2zM6 4h2.5v9H6zM9.5 1.5H13V13H9.5zM1 13.6h14V15H1z"/></svg>'
    : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12v1.6H2zM2 7.2h12v1.6H2zM2 11.4h12V13H2z"/></svg>';
  renderBooks();
});
$('books').addEventListener('click', e => {
  const btn = e.target.closest('[data-open]');
  if (btn) open(Number(btn.dataset.open));
});
$('now').addEventListener('click', e => {
  const btn = e.target.closest('[data-open]');
  if (!btn) return;
  state.shelf = 'currently-reading';
  state.genre = 'all';
  state.open = null;
  render();
  open(Number(btn.dataset.open));
});
$('card').addEventListener('click', e => { if (e.target.closest('.close')) open(state.open); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.open !== null) open(state.open); });

fetch('goodreads_library_export.csv')
  .then(r => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
  .then(text => {
    books = parseCsv(text).map(toBook);
    renderStory();
    render();
  })
  .catch(() => {
    $('books').innerHTML = '<p class="empty">The shelves could not be loaded. Try again in a moment.</p>';
  });
