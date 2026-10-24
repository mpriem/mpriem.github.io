// Phones and tablets only run the room installed as an app from the home
// screen (index.html), where it has the whole screen and can hold it
// sideways. In a browser tab this takes the room's place: a late-90s Setup
// that says the room is made for a PC, and shows how to install it on an
// iPhone or iPad and on Android. A PC never loads this.
(() => {
  'use strict';

  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

  // Inline icons, in the pixel style of the room's own title bar.
  const MONITOR = `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
    <path fill="#c0c0c0" d="M2 2h12v9H2z"/><path fill="#000080" d="M3 3h10v7H3z"/>
    <path fill="#55ffff" d="M4 4h3v1H4zm0 2h5v1H4z"/><path fill="#808080" d="M6 11h4v2H6zM4 13h8v1H4z"/></svg>`;
  const WARNING = `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">
    <path fill="#000" d="M15 2h2v2h1v3h1v3h1v3h1v3h1v3h1v3h1v3h1v3h1v2H3v-2h1v-3h1v-3h1v-3h1v-3h1v-3h1v-3h1V7h1V4h1V2z"/>
    <path fill="#ffff00" d="M15 4h2v3h1v3h1v3h1v3h1v3h1v3h1v3h1v3H5v-3h1v-3h1v-3h1v-3h1v-3h1v-3h1V7h1V4h3z"/>
    <path fill="#000" d="M15 10h2v9h-2zM15 21h2v2h-2z"/></svg>`;
  const FOLDER = `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">
    <path fill="#000" d="M3 7h10l2 2h14v18H3z"/><path fill="#ffff99" d="M4 8h8l2 2h14v3H4z"/>
    <path fill="#cccc33" d="M4 13h24v13H4z"/><path fill="#ffff66" d="M4 13h24v1H4z"/></svg>`;
  const PHONE = `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">
    <path fill="#000" d="M9 2h14v28H9z"/><path fill="#404040" d="M10 3h12v26H10z"/>
    <path fill="#008080" d="M11 6h10v18H11z"/><path fill="#c0c0c0" d="M13 9h6v5h-6z"/>
    <path fill="#000080" d="M14 10h4v3h-4z"/><path fill="#808080" d="M15 14h2v2h-2z"/><path fill="#c0c0c0" d="M14 26h4v1h-4z"/></svg>`;
  const PAGE = `<svg viewBox="0 0 12 14" shape-rendering="crispEdges" aria-hidden="true">
    <path fill="#000" d="M0 0h9l3 3v11H0z"/><path fill="#fff" d="M1 1h7v3h3v9H1z"/>
    <path fill="#808080" d="M2 5h7v1H2zm0 2h7v1H2zm0 2h5v1H2z"/></svg>`;
  const SHARE = `<svg class="ui" viewBox="0 0 16 16" aria-label="Share"><path d="M8 1v9M5 4l3-3 3 3M5 7H3v8h10V7h-2"/></svg>`;
  const ADD = `<svg class="ui" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M8 5v6M5 8h6"/></svg>`;
  const MENU = `<svg class="ui" viewBox="0 0 16 16" aria-label="Menu"><path d="M8 3v.5M8 8v.5M8 13v.5" stroke-width="3"/></svg>`;

  const STEPS = {
    ios: [
      `Tap <b>Share</b> ${SHARE} in Safari. Don't see it? Tap <b>&middot;&middot;&middot;</b> first. On an iPad it's at the top.`,
      `Scroll down and tap <b>Add to Home Screen</b> ${ADD}.`,
      `Leave <b>Open as Web App</b> on, if you see it, and tap <b>Add</b>.`,
      `Open <b>Mark's Room</b> from your Home Screen.`
    ],
    android: [
      `Tap <b>Install</b> below, or open the browser menu ${MENU}.`,
      `Tap <b>Install app</b> or <b>Add to Home screen</b>.`,
      `Confirm with <b>Install</b>.`,
      `Open <b>Mark's Room</b> from your home screen.`
    ]
  };

  const style = document.createElement('style');
  style.textContent = `
    #setup {
      position: absolute;
      inset: 0;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
        max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
      box-sizing: border-box;
      /* InstallShield's blue, fading to black. */
      background: linear-gradient(#0000b0, #000014);
      color: #000;
      font: 14px/1.35 Tahoma, 'MS Sans Serif', 'Segoe UI', Arial, sans-serif;
      -webkit-text-size-adjust: 100%;
    }
    #setup header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px 16px;
      max-width: 560px;
      width: 100%;
      margin: 0 auto;
    }
    #setup h1 {
      margin: 0;
      color: #fff;
      font: italic bold clamp(26px, 7vmin, 42px)/1 'Times New Roman', Times, serif;
      text-shadow: 3px 3px #000;
    }
    /* A sticker, like the ones on 90s software boxes. */
    #setup .sticker {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px 6px 8px;
      background: #fff;
      border: 2px solid #000;
      box-shadow: 3px 3px #000;
      color: #000;
      font: 10px/1.25 'Press Start 2P', monospace;
      text-transform: uppercase;
      transform: rotate(-4deg);
      animation: wobble 4s ease-in-out infinite;
    }
    #setup .sticker svg {
      width: 32px;
      height: 32px;
      flex: none;
    }
    #setup .sticker small {
      display: block;
      margin-top: 4px;
      font-size: 7px;
      color: #000080;
    }
    @keyframes wobble {
      0%, 80%, 100% { transform: rotate(-4deg); }
      85% { transform: rotate(2deg) scale(1.06); }
      90% { transform: rotate(-6deg) scale(1.06); }
      95% { transform: rotate(-2deg); }
    }
    #setup .dialog {
      width: 100%;
      max-width: 560px;
      margin: 0 auto;
      padding: 3px;
      box-sizing: border-box;
      background: #c0c0c0;
      box-shadow:
        inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf,
        inset -2px -2px #808080, inset 2px 2px #fff,
        0 8px 32px rgba(0, 0, 0, 0.6);
    }
    #setup .title {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 20px;
      padding: 0 2px 0 3px;
      background: linear-gradient(90deg, #000080, #1084d0);
      color: #fff;
      font-weight: bold;
      font-size: 13px;
      white-space: nowrap;
    }
    #setup .title svg {
      width: 16px;
      height: 16px;
    }
    #setup .title span {
      flex: 1;
    }
    #setup .title i {
      position: relative;
      width: 16px;
      height: 14px;
      background: #c0c0c0;
      box-shadow:
        inset -1px -1px #0a0a0a, inset 1px 1px #fff,
        inset -2px -2px #808080, inset 2px 2px #dfdfdf;
    }
    #setup .title i::before, #setup .title i::after {
      content: '';
      position: absolute;
      left: 7px;
      top: 3px;
      width: 2px;
      height: 8px;
      background: #000;
      transform: rotate(45deg);
    }
    #setup .title i::after {
      transform: rotate(-45deg);
    }
    #setup .body {
      padding: 12px 10px 10px;
    }
    #setup p {
      margin: 0 0 10px;
    }
    /* Made for a PC: said first, in a message box of its own. */
    #setup .notice {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 12px;
      padding: 10px;
      background: #ffffe1;
      border: 1px solid #000;
    }
    #setup .notice svg {
      width: 32px;
      height: 32px;
      flex: none;
      animation: blink 1.2s steps(1) 4;
    }
    #setup .notice p {
      margin: 0;
    }
    #setup .notice p + p {
      margin-top: 6px;
    }
    #setup .notice strong {
      display: block;
      margin-bottom: 4px;
      font-size: 15px;
    }
    @keyframes blink {
      50% { visibility: hidden; }
    }
    /* Files flying from a folder to a phone, as Windows copied them. */
    #setup .copy {
      position: relative;
      height: 52px;
      margin: 4px 0 8px;
    }
    #setup .copy .from, #setup .copy .to {
      position: absolute;
      top: 6px;
      width: 40px;
      height: 40px;
    }
    #setup .copy svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    #setup .copy .from {
      left: 4%;
    }
    #setup .copy .to {
      right: 4%;
    }
    #setup .copy .page {
      position: absolute;
      left: 12%;
      top: 16px;
      width: 15px;
      height: 18px;
      opacity: 0;
      animation: fly 2.4s linear infinite;
    }
    #setup .copy .page:nth-of-type(2) {
      animation-delay: 0.8s;
    }
    #setup .copy .page:nth-of-type(3) {
      animation-delay: 1.6s;
    }
    @keyframes fly {
      0% { left: 12%; transform: translateY(0) rotateY(0); opacity: 0; }
      8% { opacity: 1; }
      50% { transform: translateY(-14px) rotateY(180deg); }
      92% { opacity: 1; }
      100% { left: calc(88% - 15px); transform: translateY(0) rotateY(360deg); opacity: 0; }
    }
    #setup .done .copy .page {
      animation: none;
    }
    /* Tabs, one per kind of phone. */
    #setup [role="tablist"] {
      display: flex;
      position: relative;
      z-index: 1;
      padding-left: 2px;
    }
    #setup [role="tab"] {
      margin: 2px 0 0;
      padding: 4px 12px 3px;
      border: 0;
      border-radius: 3px 3px 0 0;
      background: #c0c0c0;
      color: #000;
      font: inherit;
      box-shadow: inset 1px 1px #fff, inset -1px 0 #0a0a0a, inset -2px 0 #808080;
      -webkit-tap-highlight-color: transparent;
    }
    #setup [role="tab"][aria-selected="true"] {
      margin: 0 -2px -1px;
      padding: 5px 14px 5px;
      font-weight: bold;
    }
    #setup [role="tab"]:focus {
      outline: none;
    }
    #setup [role="tab"]:focus-visible {
      outline: 1px dotted #000;
      outline-offset: -4px;
    }
    #setup [role="tabpanel"] {
      padding: 10px 8px 8px;
      box-shadow: inset 1px 1px #fff, inset -1px -1px #0a0a0a, inset -2px -2px #808080;
    }
    #setup ol {
      margin: 0;
      padding: 0;
      list-style: none;
      counter-reset: step;
    }
    #setup li {
      position: relative;
      padding: 5px 6px 5px 30px;
      counter-increment: step;
    }
    #setup li::before {
      content: counter(step) '.';
      position: absolute;
      left: 8px;
      font-weight: bold;
    }
    /* The step Setup is waiting on moves down the list, like a selection. */
    #setup li.current {
      background: #000080;
      color: #fff;
    }
    #setup li.current::before {
      content: '\\25BA';
    }
    #setup .ui {
      width: 1.15em;
      height: 1.15em;
      vertical-align: -0.2em;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    #setup .hint {
      margin: 8px 0 0;
      color: #404040;
      font-size: 12px;
    }
    /* Waiting: blocks marching through a sunken bar. */
    #setup .progress {
      position: relative;
      height: 18px;
      margin-top: 12px;
      overflow: hidden;
      background: #fff;
      box-shadow:
        inset -1px -1px #fff, inset 1px 1px #808080,
        inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a;
    }
    #setup .progress span {
      position: absolute;
      top: 3px;
      bottom: 3px;
      left: 0;
      width: 40%;
      background: repeating-linear-gradient(90deg, #000080 0 9px, transparent 9px 11px);
      animation: march 2.2s steps(22) infinite;
    }
    @keyframes march {
      from { transform: translateX(-100%); }
      to { transform: translateX(250%); }
    }
    #setup .done .progress span {
      left: 3px;
      width: calc(100% - 6px);
      animation: none;
    }
    #setup .status {
      margin: 6px 0 0;
      font-size: 12px;
    }
    #setup .buttons {
      display: flex;
      justify-content: flex-end;
      padding: 0 10px 10px;
    }
    #setup .buttons[hidden] {
      display: none;
    }
    #setup .buttons button {
      min-width: 88px;
      padding: 5px 12px;
      border: 0;
      background: #c0c0c0;
      color: #000;
      font: inherit;
      box-shadow:
        inset -1px -1px #0a0a0a, inset 1px 1px #fff,
        inset -2px -2px #808080, inset 2px 2px #dfdfdf;
      -webkit-tap-highlight-color: transparent;
    }
    #setup .buttons button:active {
      box-shadow:
        inset -1px -1px #fff, inset 1px 1px #0a0a0a,
        inset -2px -2px #dfdfdf, inset 2px 2px #808080;
    }
    @media (prefers-reduced-motion: reduce) {
      #setup *, #setup *::before {
        animation: none !important;
      }
      #setup .copy .page {
        display: none;
      }
    }
  `;
  document.head.append(style);

  // The room itself won't run here.
  for (const id of ['window', 'play', 'fade']) document.getElementById(id)?.remove();

  const setup = document.createElement('main');
  setup.id = 'setup';
  setup.innerHTML = `
    <header>
      <h1>Mark's Room Setup</h1>
      <div class="sticker">${MONITOR}<div>Designed<br>for PC<small>Keyboard &amp; mouse</small></div></div>
    </header>
    <section class="dialog" aria-labelledby="setup-title">
      <div class="title">${MONITOR}<span id="setup-title">Mark's Room Setup</span><i aria-hidden="true"></i></div>
      <div class="body">
        <div class="notice" role="note">
          ${WARNING}
          <div>
            <strong>Mark's Room is designed for a PC.</strong>
            <p>The room, the island and DOOM were made for a keyboard, a mouse and a big screen.</p>
            <p>For the full experience, visit <b>${location.host}</b> on your computer.</p>
          </div>
        </div>
        <p>Want to play on this phone anyway? It doesn't run in the browser: Setup needs to install it as an app on your home screen first.</p>
        <div class="copy" aria-hidden="true">
          <span class="from">${FOLDER}</span>
          <span class="page">${PAGE}</span><span class="page">${PAGE}</span><span class="page">${PAGE}</span>
          <span class="to">${PHONE}</span>
        </div>
        <div role="tablist" aria-label="Your phone">
          <button role="tab" id="tab-ios" aria-controls="steps" data-os="ios">iPhone / iPad</button>
          <button role="tab" id="tab-android" aria-controls="steps" data-os="android">Android</button>
        </div>
        <div role="tabpanel" id="steps">
          <ol></ol>
          <p class="hint">In an app's own browser, like Instagram's or Gmail's? Open this page in Safari or Chrome first.</p>
        </div>
        <div class="progress" aria-hidden="true"><span></span></div>
        <p class="status" role="status">Waiting for Mark's Room to be installed...</p>
      </div>
      <div class="buttons" hidden><button type="button">Install</button></div>
    </section>
  `;
  document.body.prepend(setup);

  // ---------------------------------------------------------------- steps

  const list = setup.querySelector('ol');
  const tabs = [...setup.querySelectorAll('[role="tab"]')];
  const panel = setup.querySelector('[role="tabpanel"]');
  const buttons = setup.querySelector('.buttons');
  let os = ios ? 'ios' : 'android', current = 0;

  function show(chosen) {
    os = chosen;
    for (const tab of tabs) {
      const selected = tab.dataset.os === os;
      tab.setAttribute('aria-selected', selected);
      tab.tabIndex = selected ? 0 : -1;
      if (selected) panel.setAttribute('aria-labelledby', tab.id);
    }
    list.innerHTML = STEPS[os].map(step => `<li>${step}</li>`).join('');
    current = 0;
    highlight();
    buttons.hidden = !(os === 'android' && offer);
  }

  function highlight() {
    [...list.children].forEach((li, i) => li.classList.toggle('current', i === current));
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => show(tab.dataset.os));
    tab.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      show(next.dataset.os);
    });
  });

  const cycle = setInterval(() => {
    current = (current + 1) % list.children.length;
    highlight();
  }, 2600);

  // ---------------------------------------------------------------- install

  // Chrome and other Android browsers offer their own install prompt, which
  // Install brings up. Safari has none, so an iPhone follows the steps.
  let offer = null;

  addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    offer = e;
    show(os);
  });

  buttons.querySelector('button').addEventListener('click', async () => {
    if (!offer) return;
    offer.prompt();
    const { outcome } = await offer.userChoice;
    if (outcome === 'accepted') {
      offer = null;
      buttons.hidden = true;
    }
  });

  addEventListener('appinstalled', () => {
    clearInterval(cycle);
    offer = null;
    buttons.hidden = true;
    setup.querySelector('.dialog').classList.add('done');
    list.querySelectorAll('li').forEach(li => li.classList.remove('current'));
    list.lastElementChild.classList.add('current');
    setup.querySelector('.status').textContent = "Setup is complete. Open Mark's Room from your home screen.";
  });

  show(os);
})();
