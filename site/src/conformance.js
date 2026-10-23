import './style.css';
import { wrapPage, showToast, plateHead, refreshNav, evidenceChip } from './shared.js';
import { saveSession, loadSession, escapeHtml, sha256, hexPreview, evidenceOf } from './engine.js';
import { uploadPanel, bindUpload, parseYaml, downloadFile } from './upload.js';

const app = document.getElementById('app');
const session = loadSession();

/** Invariants that break isolation outright; everything else is a warning. */
const CRITICAL = [
  'container_isolation.runtime', 'container_isolation.read_only_rootfs', 'container_isolation.cap_drop',
  'container_isolation.rootless', 'container_isolation.seccomp_sha256',
  'network_segmentation.red_cell', 'network_segmentation.blue_cell', 'network_segmentation.llm_cell',
  'network_segmentation.direct_red_blue_allowed',
  'airlock_shaping.pad_envelope_bytes', 'airlock_shaping.fixed_cadence_ms',
  'llm_hygiene.per_session_context_wipe',
];
const IGNORE = ['contract_version', 'project'];

let contract = null;
let contractName = 'isolation-contract.yaml';
let observed = null;
let observedName = '';
let observedEvidence = 'simulated';
let canaryTripped = !!session.canaryTripped;

function parseConfig(text, name) {
  const t = text.replace(/^﻿/, '').trim();
  if (!t) throw new Error('the file is empty');
  if (t.startsWith('{') || t.startsWith('[')) {
    const data = JSON.parse(t);
    return Array.isArray(data) ? data[0] : data;
  }
  if (/\.(json)$/i.test(name)) throw new Error('invalid JSON');
  return parseYaml(t);
}

/** Flatten nested objects to dotted paths; the contract's "invariants" wrapper is optional on either side. */
function flatten(obj, prefix = '', out = {}) {
  const root = prefix === '' && obj && obj.invariants ? obj.invariants : obj;
  for (const [k, v] of Object.entries(root || {})) {
    if (prefix === '' && IGNORE.includes(k)) continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

const show = (v) => (v === undefined ? '— missing —' : Array.isArray(v) ? `[${v.join(', ')}]` : String(v));
const same = (a, b) => JSON.stringify(Array.isArray(a) ? [...a].sort() : a) === JSON.stringify(Array.isArray(b) ? [...b].sort() : b);

function diff() {
  const want = flatten(contract);
  const got = flatten(observed);
  const rows = Object.keys(want).map((k) => {
    const ok = same(want[k], got[k]);
    return { key: k, want: want[k], got: got[k], ok, severity: ok ? '' : CRITICAL.includes(k) ? 'critical' : 'warning' };
  });
  const extra = Object.keys(got).filter((k) => !(k in want));
  return { rows, extra };
}

function render() {
  const out = document.getElementById('result');
  if (!observed) {
    out.innerHTML = '<p class="empty">No observed configuration yet. Upload one above, or load the reference sandbox to see a clean pass.</p>';
    return;
  }
  const { rows, extra } = diff();
  const bad = rows.filter((r) => !r.ok);
  const critical = bad.filter((r) => r.severity === 'critical').length;
  saveSession({ drift: bad.length > 0, driftCount: bad.length, canaryTripped, conformanceSource: observedName, conformanceEvidence: observedEvidence });
  refreshNav();

  out.innerHTML = `
    <div class="plate plate-pad">
      <div class="gate-banner">
        <div>
          <p class="kicker">${escapeHtml(observedName)} vs ${escapeHtml(contractName)} ${evidenceChip(observedEvidence)}</p>
          <div class="stat ${bad.length ? 'bad' : 'ok'}">${bad.length ? `${bad.length} drift${bad.length > 1 ? 's' : ''}` : 'Conformant'}</div>
        </div>
        <div class="stat-row" style="min-width:min(100%,380px)">
          <div><div class="stat-sm">${rows.length - bad.length}/${rows.length}</div><div class="stat-label">invariants hold</div></div>
          <div><div class="stat-sm ${critical ? 'bad' : ''}">${critical}</div><div class="stat-label">critical</div></div>
          <div><div class="stat-sm">${extra.length}</div><div class="stat-label">extra keys</div></div>
        </div>
      </div>
      <div class="btn-row" style="margin:0.8rem 0 0">
        ${bad.length ? '<button class="press" id="exportDrift" type="button">Export drift report</button>' : ''}
        <button class="press ${canaryTripped ? 'press-red' : ''}" id="canary" type="button">${canaryTripped ? 'Re-arm canary' : 'Simulate a canary hit'}</button>
      </div>
      <p class="hash" style="margin:0.4rem 0 0.8rem">${canaryTripped
        ? '<span class="chip chip-bad">canary tripped</span> a honeytoken planted in one cell was read from another'
        : '<span class="chip chip-ok">canaries dark</span> no honeytoken has been touched'}</p>
      <div style="overflow:auto">
        <table class="sheet">
          <thead><tr><th>Invariant</th><th>Contract</th><th>Observed</th><th>Result</th></tr></thead>
          <tbody>${rows.sort((a, b) => Number(a.ok) - Number(b.ok)).map((r) => `
            <tr class="${r.ok ? '' : 'is-off'}">
              <td>${escapeHtml(r.key)}</td>
              <td>${escapeHtml(show(r.want))}</td>
              <td class="${r.ok ? '' : 'bad'}">${escapeHtml(show(r.got))}</td>
              <td>${r.ok ? '<span class="ok">holds</span>' : `<span class="chip ${r.severity === 'critical' ? 'chip-bad' : 'chip-gold'}">${r.severity}</span>`}</td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
      ${extra.length ? `<p class="hash" style="margin-top:0.6rem">Not in the contract (ignored): ${extra.map(escapeHtml).join(', ')}</p>` : ''}
    </div>`;

  document.getElementById('canary').onclick = () => {
    canaryTripped = !canaryTripped;
    showToast(canaryTripped ? 'Canary tripped' : 'Canary re-armed', canaryTripped
      ? 'A honeytoken was read from the wrong cell. The release gate will refuse.'
      : 'Honeytokens are dark again.', canaryTripped ? 'bad' : 'ok');
    render();
  };
  const ex = document.getElementById('exportDrift');
  if (ex) ex.onclick = () => downloadFile('triseal-drift-report.json', JSON.stringify({
    contract: contractName, observed: observedName, checked_at: new Date().toISOString(),
    drifts: bad.map(({ key, want, got, severity }) => ({ invariant: key, expected: want, observed: got ?? null, severity })),
  }, null, 2));
}

app.innerHTML = wrapPage('conformance', `
<main class="inner">
  ${plateHead('Conformance', 'The contract<br>is the sandbox.',
    'You publish an isolation contract. Conformance compares the sandbox you are actually running against it, invariant by invariant, '
    + 'and flags any drift before a single prompt is relayed.')}
  <div class="explain"><b>In plain terms</b>A results table means nothing if the sandbox quietly gave the model write access or bridged Red and Blue onto one network.
    Export your running config (or describe it in the contract’s format), drop it here, and see every difference.</div>

  <div class="plate plate-pad" style="margin-bottom:1.4rem">
    <div class="gate-banner">
      <div>
        <p class="kicker">Published contract</p>
        <p class="hash" id="contractInfo">loading…</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <label class="row-btn" style="cursor:pointer">Use your own contract<input type="file" id="contractFile" class="sr-only" accept=".yaml,.yml,.json"></label>
        <a class="row-btn" href="/samples/isolation-contract.yaml" download style="text-decoration:none;color:inherit">Download contract</a>
      </div>
    </div>
  </div>

  ${uploadPanel({
    id: 'up-config',
    title: 'Check your running sandbox',
    blurb: 'Upload the observed configuration in the same shape as the contract — YAML or JSON, with or without the top-level <code>invariants:</code> key. '
      + 'Lists such as <code>cap_drop</code> compare as sets.',
    formats: 'YAML · JSON',
    sampleHref: '/samples/observed-config.yaml',
  })}
  <div class="btn-row" style="margin-top:0.8rem">
    <button class="press" id="reference" type="button">Load the reference sandbox (clean pass)</button>
  </div>
  <div id="result" class="results"></div>
</main>
`);

async function loadContract(text, name) {
  contract = parseConfig(text, name);
  contractName = name;
  const n = Object.keys(flatten(contract)).length;
  if (!n) throw new Error('no invariants found in the contract');
  const h = await sha256(text);
  document.getElementById('contractInfo').innerHTML = `${escapeHtml(name)} · ${n} invariants · sha256 ${hexPreview(h, 16)}…`;
}

(async () => {
  try {
    const res = await fetch('/samples/isolation-contract.yaml');
    await loadContract(await res.text(), 'isolation-contract.yaml');
  } catch (err) {
    document.getElementById('contractInfo').textContent = 'Could not load the default contract: ' + err.message;
  }
  render();
})();

document.getElementById('contractFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    await loadContract(await f.text(), f.name);
    showToast('Contract loaded', f.name, 'ok');
    render();
  } catch (err) {
    showToast('Could not read contract', err.message, 'bad');
  }
});

document.getElementById('reference').onclick = () => {
  if (!contract) return;
  observed = JSON.parse(JSON.stringify(contract));
  observedName = 'reference sandbox (simulated)';
  observedEvidence = 'simulated';
  render();
  showToast('Reference sandbox', 'A sandbox built exactly to contract — every invariant holds.', 'ok');
};

bindUpload('up-config', {
  sampleHref: '/samples/observed-config.yaml',
  onData: ({ name, text, source }) => {
    if (!contract) throw new Error('the contract has not loaded yet');
    observed = parseConfig(text, name);
    observedName = name;
    observedEvidence = evidenceOf(source);
    render();
    const { rows } = diff();
    const bad = rows.filter((r) => !r.ok).length;
    showToast(bad ? `${bad} drift(s) found` : 'Conformant', bad ? 'See the highlighted invariants.' : 'Every invariant holds.', bad ? 'bad' : 'ok');
    return bad ? `${bad} drift(s)` : 'conformant';
  },
});
