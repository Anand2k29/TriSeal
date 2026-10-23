import { evaluateGate, escapeHtml } from './engine.js';

export function showToast(title, message, tone = 'info') {
  let rack = document.querySelector('.toast-rack');
  if (!rack) {
    rack = document.createElement('div');
    rack.className = 'toast-rack';
    rack.setAttribute('role', 'status');
    rack.setAttribute('aria-live', 'polite');
    document.body.appendChild(rack);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${tone}`;
  el.innerHTML = `<b>${escapeHtml(title)}</b><p>${escapeHtml(message)}</p>`;
  el.addEventListener('click', () => el.remove());
  rack.appendChild(el);
  while (rack.children.length > 4) rack.firstChild.remove();
  setTimeout(() => el.classList.add('is-leaving'), 4000);
  setTimeout(() => el.remove(), 4400);
}

/** Run an async handler with the button disabled, so double-clicks cannot race. */
export function busy(btn, fn) {
  return async (...args) => {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    try {
      await fn(...args);
    } catch (err) {
      console.error(err);
      showToast('Something broke', err?.message || String(err), 'bad');
    } finally {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
    }
  };
}

export const PLATES = [
  { id: 'home', href: '/app.html', cls: 'ribbon-k', n: '', label: 'Overview' },
  { id: 'airlock', href: '/mvp-airlock.html', cls: 'ribbon-r', n: 'I', label: 'Airlock' },
  { id: 'ledger', href: '/mvp-ledger.html', cls: 'ribbon-i', n: 'II', label: 'Ledger' },
  { id: 'conformance', href: '/conformance.html', cls: 'ribbon-m', n: 'III', label: 'Conformance' },
  { id: 'leakhunter', href: '/leakhunter.html', cls: 'ribbon-g', n: 'IV', label: 'Leak Hunter' },
  { id: 'deploy', href: '/deploy.html', cls: 'ribbon-k', n: 'V', label: 'Release Gate' },
];

function plateStatus(gate, id) {
  if (id === 'deploy') return gate.ok ? 'pass' : gate.failed ? 'fail' : gate.rehearsal ? 'simulated' : 'pending';
  return gate.plates[id] || 'pending';
}

function mast(gate) {
  return `
    <header class="mast">
      <div class="mast-left"><a href="/" class="mast-home">← Product site</a></div>
      <a class="mast-word" href="/app.html" aria-label="TriSeal overview">TRI<span></span>SE<span></span>AL<span></span></a>
      <div class="mast-right"><a href="/deploy.html" class="gate-pill" id="gatePill">${gatePill(gate)}</a></div>
    </header>
  `;
}

function gatePill(gate) {
  const s = gate.ok ? 'pass' : gate.failed ? 'fail' : gate.rehearsal ? 'simulated' : 'pending';
  return `<span class="dot dot-${s}"></span> Release gate ${gate.passed}/${gate.steps.length}${gate.simulated ? ` · ${gate.simulated} simulated` : ''}`;
}

function tabs(active, gate) {
  return `
    <nav class="plates-nav" aria-label="Plates">
      ${PLATES.map((r) => {
        const s = plateStatus(gate, r.id);
        return `<a href="${r.href}" class="plate-tab ${active === r.id ? 'is-on' : ''}" ${active === r.id ? 'aria-current="page"' : ''}>
          <span class="dot dot-${s}" title="${s}"></span><span class="plate-tab-n">${r.n}</span> ${r.label}
        </a>`;
      }).join('')}
    </nav>
  `;
}

export function renderFooter() {
  return `
    <footer class="colophon">
      <div>Runs in your browser · Web Crypto SHA-256, HMAC &amp; ECDSA</div>
      <div><a href="https://github.com/Anand2k29/TriSeal" target="_blank" rel="noopener">Repository</a></div>
      <div>TriSeal v2.4 · MIT licensed</div>
    </footer>
  `;
}

/** Label a result by where its evidence came from. Simulated results never count toward release. */
export function evidenceChip(evidence) {
  return evidence === 'measured'
    ? '<span class="chip chip-ok" title="Your own data — counts toward release">measured</span>'
    : '<span class="chip chip-sim" title="Demo or sample data — does not count toward release">simulated · not counted</span>';
}

/** Plate header: kicker, headline, lede — identical rhythm on every page. */
export function plateHead(kicker, title, lede) {
  return `
    <p class="kicker">${kicker}</p>
    <h1 class="display display-plate">${title}</h1>
    <p class="lede">${lede}</p>
  `;
}

export function wrapPage(active, body) {
  const gate = evaluateGate();
  return `
    <a class="skip" href="#main">Skip to content</a>
    <div class="page">
      ${mast(gate)}
      ${tabs(active, gate)}
      <div id="main">${body}</div>
      ${renderFooter()}
    </div>
  `;
}

/** Repaint only the nav status lights after session changes, without re-rendering the page. */
export function refreshNav() {
  const gate = evaluateGate();
  document.querySelectorAll('.plate-tab').forEach((a, i) => {
    const dot = a.querySelector('.dot');
    const s = plateStatus(gate, PLATES[i].id);
    dot.className = `dot dot-${s}`;
    dot.title = s;
  });
  const pill = document.getElementById('gatePill');
  if (pill) pill.innerHTML = gatePill(gate);
}
