import './style.css';
import { wrapPage, showToast, plateHead, refreshNav, PLATES } from './shared.js';
import { saveSession, loadSession, evaluateGate, resetSession } from './engine.js';

const app = document.getElementById('app');
const session = loadSession();
const bound = { red: !!session.sealRed, gold: !!session.sealGold, blue: !!session.sealBlue };

const TOOLS = [
  {
    id: 'airlock', n: 'I', title: 'Airlock Relay', color: 'var(--vermillion)',
    proves: 'Red and Blue commit before they meet; every message crosses one size- and timing-blind airlock.',
    data: 'Prompt dataset · CSV / JSONL / TXT',
  },
  {
    id: 'ledger', n: 'II', title: 'Seal Ledger', color: 'var(--indigo)',
    proves: 'Every step is hash-chained and Merkle-checkpointed. Change one byte and verification fails.',
    data: 'Ledger export · JSON / CSV (site, CLI or API format)',
  },
  {
    id: 'conformance', n: 'III', title: 'Conformance', color: 'var(--marigold)',
    proves: 'The sandbox you are running matches the isolation contract you published.',
    data: 'Observed config · YAML / JSON',
  },
  {
    id: 'leakhunter', n: 'IV', title: 'Leak Hunter', color: 'var(--moss)',
    proves: 'Response time does not reveal the defense’s decision; sessions do not contaminate each other.',
    data: 'Latency log · CSV · twin-run metrics',
  },
  {
    id: 'deploy', n: 'V', title: 'Release Gate', color: 'var(--ink)',
    proves: 'Reads every check above and issues a reproducible, downloadable evidence certificate.',
    data: 'Reads results from the other tools',
  },
];

const href = (id) => PLATES.find((p) => p.id === id).href;

function checklist() {
  const gate = evaluateGate();
  return `
    <div class="gate-banner" style="margin-bottom:0.8rem">
      <div>
        <div class="stat">${gate.passed}<span style="font-size:1.4rem;opacity:0.5">/${gate.steps.length}</span></div>
        <div class="stat-label">checks passing on real evidence${gate.simulated ? ` · ${gate.simulated} simulated` : ''}</div>
      </div>
      <span class="chip ${gate.ok ? 'chip-ok' : gate.failed ? 'chip-bad' : gate.rehearsal ? 'chip-sim' : 'chip-wait'}">${gate.ok ? 'ready to release' : gate.failed ? 'blocked' : gate.rehearsal ? 'rehearsal only' : 'in progress'}</span>
    </div>
    <div class="meter ${gate.failed ? 'is-bad' : ''}"><i style="width:${(gate.passed / gate.steps.length) * 100}%"></i></div>
    <table class="sheet" style="margin-top:0.8rem">
      <tbody>
        ${gate.steps.map((s) => `
          <tr>
            <td style="width:1.6rem"><span class="dot dot-${s.status}" style="display:inline-block"></span></td>
            <td><b>${s.name}</b><br><span style="opacity:0.75">${s.detail}</span></td>
            <td style="text-align:right">${s.status === 'pass' ? '<span class="ok">done</span>'
              : s.plate === 'home' ? '<a href="#seals" class="row-btn">sign off ↓</a>'
              : `<a href="${href(s.plate)}" target="_blank" rel="noopener" class="row-btn">${s.status === 'fail' ? 'fix' : s.status === 'simulated' ? 'use real data' : 'open'} ↗</a>`}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

app.innerHTML = wrapPage('home', `
<main class="inner">
  ${plateHead('Overview', 'Your evaluation,<br>sealed end to end.',
    'Work through the five tools in any order — each opens in its own tab, so you can keep this checklist beside you. '
    + 'Results stay in this browser and feed the Release Gate automatically.')}

  <div class="split-2" style="align-items:start">
    <section class="plate plate-pad" aria-labelledby="cl-h">
      <p class="kicker" id="cl-h">Release checklist · live</p>
      <div id="checklist">${checklist()}</div>
    </section>

    <section class="plate plate-pad" id="seals" aria-labelledby="seal-h">
      <p class="kicker" id="seal-h">Kick-off sign-off</p>
      <p style="margin-bottom:1rem;color:var(--ink-soft);font-size:1rem">
        Before a run counts, the Red lead, the airlock operator and the Blue lead each confirm they are ready.
        Nothing is released until all three have signed off.
      </p>
      <div class="signoff" id="stamps">
        ${[
          ['red', 'Red lead', 'attack set frozen and committed', 'var(--vermillion)'],
          ['gold', 'Airlock operator', 'cadence and envelope armed', 'var(--marigold)'],
          ['blue', 'Blue lead', 'defense frozen and committed', 'var(--indigo)'],
        ].map(([k, who, what, c]) => `
          <button class="sign-row" data-k="${k}" type="button" aria-pressed="${bound[k]}" style="--accent:${c}">
            <span><b>${who}</b><small>${what}</small></span><span class="switch" aria-hidden="true"></span>
          </button>`).join('')}
      </div>
      <p id="bindState" class="kicker" style="margin-top:1rem"></p>
    </section>
  </div>

  <hr class="rule">
  <p class="kicker">Tools · each opens in a new tab</p>
  <div class="tool-grid">
    ${TOOLS.map((t) => `
      <a class="tool-card" href="${href(t.id)}" target="_blank" rel="noopener" style="--accent:${t.color}">
        <span class="tool-n">${t.n}</span>
        <h3>${t.title} <span aria-hidden="true">↗</span></h3>
        <p>${t.proves}</p>
        <span class="hash tool-data">⇪ ${t.data}</span>
      </a>`).join('')}
  </div>

  <hr class="rule">
  <div class="gate-banner">
    <p class="hash">Results are stored only in this browser (localStorage). Clearing them starts a fresh evaluation.</p>
    <button class="press" id="reset" type="button">Start a fresh evaluation</button>
  </div>
</main>
`);

function paintBind() {
  const n = [bound.red, bound.gold, bound.blue].filter(Boolean).length;
  document.getElementById('bindState').innerHTML = n === 3
    ? '<span class="chip chip-ok">all three signed off</span>'
    : `${n} of 3 signed off`;
  document.getElementById('checklist').innerHTML = checklist();
  refreshNav();
}
paintBind();

document.getElementById('stamps').addEventListener('click', (e) => {
  const btn = e.target.closest('.sign-row');
  if (!btn) return;
  const k = btn.dataset.k;
  bound[k] = !bound[k];
  btn.setAttribute('aria-pressed', bound[k]);
  saveSession({ sealRed: bound.red, sealGold: bound.gold, sealBlue: bound.blue });
  paintBind();
  if (bound.red && bound.gold && bound.blue) showToast('Signed off', 'All three parties are ready. Runs now count toward the release.', 'ok');
});

document.getElementById('reset').addEventListener('click', () => {
  if (!confirm('Clear every result stored in this browser and start over?')) return;
  resetSession();
  location.reload();
});

// Keep the checklist current while tools run in other tabs.
window.addEventListener('storage', paintBind);
window.addEventListener('focus', paintBind);
