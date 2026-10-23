import './style.css';
import { wrapPage, showToast, plateHead, busy, refreshNav, evidenceChip } from './shared.js';
import {
  gaussian, mulberry32, heldOutAccuracy, permutationP, histogram, klDivergence,
  loadSession, saveSession, mean, stdev, quantile, escapeHtml, LEAK_FLOOR, evidenceOf,
} from './engine.js';
import { uploadPanel, bindUpload, parseRecords, pick } from './upload.js';

const app = document.getElementById('app');
const session = loadSession();
const JITTER_MS = 0.42;

let n = 1000;
let mode = session.cadence === 0 ? 'naked' : 'sealed';
const cadence = session.cadence || 250;

/* ------------------------------------------------------------------ statistics */

const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

/** Accuracy of a held-out threshold attacker, bootstrap 95% CI, permutation p on the means. */
function analyzeTiming(blocked, allowed, rng) {
  const acc = heldOutAccuracy(blocked, allowed);
  const B = 300;
  const dist = [];
  for (let b = 0; b < B; b++) {
    const rb = blocked.map(() => blocked[Math.floor(rng() * blocked.length)]);
    const ra = allowed.map(() => allowed[Math.floor(rng() * allowed.length)]);
    dist.push(heldOutAccuracy(rb, ra));
  }
  dist.sort((a, b) => a - b);
  const sub = (arr) => (arr.length > 600 ? arr.filter((_, i) => i % Math.ceil(arr.length / 600) === 0) : arr);
  return {
    acc,
    lo: quantile(dist, 0.025),
    hi: quantile(dist, 0.975),
    p: permutationP(sub(blocked), sub(allowed), 400, rng),
    muB: mean(blocked),
    muA: mean(allowed),
    sdB: stdev(blocked),
    sdA: stdev(allowed),
    n: blocked.length + allowed.length,
  };
}

const leaks = (r) => r.lo > LEAK_FLOOR;

/**
 * What the airlock does to timing: hold every response until a fixed deadline on the cadence grid,
 * chosen to cover 99.9% of raw latencies. Anything slower slips to a later edge — and that slip can leak.
 */
function sealTimes(raw, period, rng) {
  if (!period) return { out: raw.slice(), deadline: null, slipped: 0 };
  const deadline = Math.ceil(quantile([...raw].sort((a, b) => a - b), 0.999) / period) * period || period;
  let slipped = 0;
  const out = raw.map((t) => {
    const edge = t <= deadline ? deadline : Math.ceil(t / period) * period;
    if (t > deadline) slipped++;
    return edge + gaussian(rng, 0, JITTER_MS);
  });
  return { out, deadline, slipped };
}

function simulate(kind, total, seed) {
  const rng = mulberry32(seed);
  const rawB = [];
  const rawA = [];
  for (let i = 0; i < total / 2; i++) {
    rawB.push(Math.max(2, gaussian(rng, 14, 3.1)));   // filter refused fast
    rawA.push(Math.max(40, gaussian(rng, 410, 36)));  // model actually thought
  }
  if (kind === 'naked') return { blocked: rawB, allowed: rawA, deadline: null, slipped: 0 };
  const all = sealTimes(rawB.concat(rawA), cadence, rng);
  return { blocked: all.out.slice(0, rawB.length), allowed: all.out.slice(rawB.length), deadline: all.deadline, slipped: all.slipped };
}

function twinAnalysis(A, B, rng) {
  const lo = Math.min(...A, ...B);
  const hi = Math.max(...A, ...B) + 1e-9;
  const bins = 20;
  const kl = klDivergence(histogram(A, bins, lo, hi), histogram(B, bins, lo, hi));
  // Noise floor: KL between random halves of the pooled data. Beat its 95th percentile to claim contamination.
  const pool = A.concat(B);
  const nulls = [];
  for (let r = 0; r < 200; r++) {
    const s = [...pool];
    for (let i = s.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [s[i], s[j]] = [s[j], s[i]];
    }
    nulls.push(klDivergence(histogram(s.slice(0, A.length), bins, lo, hi), histogram(s.slice(A.length), bins, lo, hi)));
  }
  nulls.sort((a, b) => a - b);
  const threshold = quantile(nulls, 0.95);
  return { kl, threshold, clean: kl < threshold, A, B, lo, hi };
}

/* ------------------------------------------------------------------ charts */

function histChart(series, { bins = 40, height = 170, marks = [] } = {}) {
  const all = series.flatMap((s) => s.values);
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (max - min < 1e-6) { min -= 1; max += 1; }
  const pad = (max - min) * 0.04;
  min -= pad; max += pad;
  const W = 640, H = height, L = 36, R = 12, T = 12, Bm = 26;
  const counts = series.map((s) => histogram(s.values, bins, min, max));
  const peak = Math.max(1, ...counts.flat());
  const bw = (W - L - R) / bins;
  const bars = counts.map((c, si) => c.map((v, i) => {
    const h = (v / peak) * (H - T - Bm);
    return `<rect x="${L + i * bw + 0.5}" y="${H - Bm - h}" width="${Math.max(1, bw - 1)}" height="${h}" fill="${series[si].color}" opacity="0.7"/>`;
  }).join('')).join('');
  const x = (v) => L + ((v - min) / (max - min)) * (W - L - R);
  const fmt = (v) => (Math.abs(max - min) < 20 ? v.toFixed(1) : v.toFixed(0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + f * (max - min));
  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Histogram of ${series.map((s) => s.label).join(' vs ')}">
      <line x1="${L}" y1="${H - Bm}" x2="${W - R}" y2="${H - Bm}" stroke="#1b140e"/>
      ${bars}
      ${marks.map((m) => `<line x1="${x(m.at)}" x2="${x(m.at)}" y1="${T}" y2="${H - Bm}" stroke="#1b140e" stroke-dasharray="3 3"/>
        <text x="${x(m.at) + 4}" y="${T + 10}" font-size="10" font-family="IBM Plex Mono,monospace">${m.label}</text>`).join('')}
      ${ticks.map((t) => `<text x="${x(t)}" y="${H - 8}" font-size="10" text-anchor="middle" font-family="IBM Plex Mono,monospace">${fmt(t)}</text>`).join('')}    </svg>
    <div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}<span>x = ms</span></div>`;
}

function timingCard(title, r, extra = '') {
  const bad = leaks(r);
  return `
    <div class="plate plate-pad">
      <p class="kicker">${title}</p>
      <div class="gate-banner">
        <div>
          <div class="stat ${bad ? 'bad' : 'ok'}">${(r.acc * 100).toFixed(1)}%</div>
          <div class="stat-label">attacker accuracy · chance is 50%</div>
        </div>
        <span class="chip ${bad ? 'chip-bad' : 'chip-ok'}">${bad ? 'timing leaks' : 'indistinguishable'}</span>
      </div>
      <div class="meter ${bad ? 'is-bad' : ''}" title="CI ${(r.lo * 100).toFixed(1)}–${(r.hi * 100).toFixed(1)}%">
        <i style="left:${Math.max(0, (r.lo - 0.4) / 0.6 * 100)}%;width:${Math.max(1, (r.hi - r.lo) / 0.6 * 100)}%"></i>
        <span class="mark" style="left:${(0.1 / 0.6) * 100}%" title="50% chance"></span>
        <span class="mark" style="left:${((LEAK_FLOOR - 0.4) / 0.6) * 100}%;background:var(--vermillion)" title="${LEAK_FLOOR * 100}% gate"></span>
      </div>
      <p class="hash" style="opacity:0.75">bar = 95% CI on a 40–100% scale · black tick 50% chance · red tick: leak if the whole bar sits right of it (${LEAK_FLOOR * 100}%)</p>
      <p class="hash" style="margin-top:0.6rem">
        95% bootstrap CI [${(r.lo * 100).toFixed(1)}%, ${(r.hi * 100).toFixed(1)}%] · permutation p = ${r.p.toFixed(3)}<br>
        blocked μ ${r.muB.toFixed(2)}ms σ ${r.sdB.toFixed(2)} · allowed μ ${r.muA.toFixed(2)}ms σ ${r.sdA.toFixed(2)} · N=${r.n}
        ${extra}
      </p>
      <p style="margin-top:0.6rem;font-size:1rem">${bad
        ? 'An observer who only sees <i>when</i> the answer arrives can tell refusals from real answers. The gate refuses.'
        : 'Response time tells an observer nothing about whether the defense fired. The gate accepts.'}</p>
    </div>`;
}

/* ------------------------------------------------------------------ page */

function shell() {
  app.innerHTML = wrapPage('leakhunter', `
  <main class="inner">
    ${plateHead('Leak Hunter', 'Does timing<br>give the game away?',
      `We never print “zero leak”. We put an attacker in the observer’s seat: it learns a time threshold on half the trials,
       guesses <i>blocked</i> vs <i>allowed</i> on the other half, and we bootstrap a 95% CI and permutation-test the means.
       If the airlock is honest, the attacker does no better than a coin.`)}
    <div class="explain"><b>Why it matters</b>A filter that refuses in 14 ms and a model that answers in 410 ms announce the defense’s decision through the clock alone.
      Red learns what Blue blocks without ever seeing Blue. The airlock holds every response to the same cadence deadline to erase that signal.</div>

    <section aria-labelledby="sim-h">
      <p class="kicker" id="sim-h">A · Simulation</p>
      <div class="split-2" style="margin-bottom:1rem">
        <div>
          <label class="tiny" for="mode">Scenario</label>
          <select id="mode">
            <option value="sealed" ${mode === 'sealed' ? 'selected' : ''}>Through the airlock (cadence ${cadence} ms)</option>
            <option value="naked" ${mode === 'naked' ? 'selected' : ''}>Naked — no airlock</option>
          </select>
        </div>
        <div>
          <label class="tiny" for="n">Trials N = <span id="nLab">${n}</span></label>
          <input id="n" type="range" min="80" max="2000" step="20" value="${n}">
        </div>
      </div>
      <div class="btn-row">
        <button class="press press-ink" id="hunt" type="button">Run survey</button>
      </div>
      <div id="simOut"><p class="empty">Run a survey to sample fresh trials (a new random seed every time) and write real numbers here.</p></div>
    </section>

    <hr class="rule">
    ${uploadPanel({
      id: 'up-timing',
      title: 'B · Test your own response times',
      blurb: 'Export latencies from your gateway or eval harness. One row per request with <code>latency_ms</code> and <code>label</code> '
        + '(<code>blocked</code>/<code>allowed</code>, <code>1</code>/<code>0</code>, or <code>true</code>/<code>false</code>). '
        + 'We measure how well an attacker could tell them apart, then replay the same data through the airlock to show the fix.',
      formats: 'CSV · TSV · JSON · JSONL',
      sampleHref: '/samples/timings-leaky.csv',
    })}
    <p class="hash" style="margin-top:0.6rem">Also try <a href="/samples/timings-sealed.csv" download>timings-sealed.csv</a> — a run already behind an airlock.</p>
    <div id="upTimingOut" class="results"></div>

    <hr class="rule">
    <section aria-labelledby="twin-h">
      <p class="kicker" id="twin-h">C · Twin-run — does yesterday’s session bleed into today’s?</p>
      <p style="color:var(--ink-soft);margin-bottom:1rem;max-width:46rem">Run the same prompts on a fresh twin and on the shared instance, then compare a per-response metric
        (token entropy, length, logprob). KL divergence above the <b>shuffle noise floor</b> means leftover context or KV-cache changed the answers.</p>
      <div class="btn-row">
        <button class="press" id="twin" type="button">Simulate clean twins</button>
        <button class="press press-red" id="twinDirty" type="button">Simulate shared weather</button>
      </div>
      ${uploadPanel({
        id: 'up-twin',
        title: 'Upload your twin-run',
        blurb: 'Two numeric columns, <code>run_a</code> (fresh) and <code>run_b</code> (shared) — or a long table with <code>run</code> and <code>value</code>.',
        formats: 'CSV · TSV · JSON',
        sampleHref: '/samples/twin-run.csv',
      })}
      <div id="twinOut" class="results"></div>
    </section>
  </main>
  `);
}

function renderSim(sim, r, seed) {
  document.getElementById('simOut').innerHTML = `
    <div class="split-2">
      ${timingCard((mode === 'naked' ? 'No airlock' : `Through the airlock · deadline ${sim.deadline} ms`) + ' ' + evidenceChip('simulated'), r,
        `<br>seed 0x${seed.toString(16)}${sim.slipped ? ` · ${sim.slipped} slow trial(s) slipped past the deadline` : ''}`)}
      <div class="plate plate-pad">
        <p class="kicker">What the observer sees</p>
        ${histChart([
          { values: sim.blocked, color: '#c4341a', label: 'blocked' },
          { values: sim.allowed, color: '#1a3568', label: 'allowed' },
        ], { marks: [{ at: (r.muB + r.muA) / 2, label: 'threshold' }] })}
        <p class="hash" style="margin-top:0.5rem">${mode === 'naked'
          ? 'Two separate humps: the clock is a telegraph.'
          : 'One hump on the deadline: both classes leave on the same tick.'}</p>
      </div>
    </div>`;
}

function parseTimings(text, name) {
  const rows = parseRecords(text, name);
  const blocked = [];
  const allowed = [];
  let skipped = 0;
  for (const row of rows) {
    const t = Number(pick(row, ['latency_ms', 'latency', 'ms', 'time_ms', 'duration_ms', 'duration', 'time', 'elapsed']));
    const raw = String(pick(row, ['label', 'outcome', 'class', 'blocked', 'result', 'status']) ?? '').toLowerCase();
    const isBlocked = ['blocked', 'block', '1', 'true', 'refused', 'deny', 'denied', 'yes'].includes(raw);
    const isAllowed = ['allowed', 'allow', '0', 'false', 'answered', 'pass', 'ok', 'no'].includes(raw);
    if (!Number.isFinite(t) || (!isBlocked && !isAllowed)) { skipped++; continue; }
    (isBlocked ? blocked : allowed).push(t);
  }
  if (blocked.length < 10 || allowed.length < 10) {
    throw new Error(`need ≥ 10 rows of each class with latency_ms + label — found ${blocked.length} blocked, ${allowed.length} allowed`);
  }
  return { blocked, allowed, skipped };
}

async function onTimingUpload({ name, text, source }) {
  const { blocked, allowed, skipped } = parseTimings(text, name);
  const seed = newSeed();
  const rng = mulberry32(seed);
  const before = analyzeTiming(blocked, allowed, rng);
  const sealed = sealTimes(blocked.concat(allowed), cadence, rng);
  const sb = sealed.out.slice(0, blocked.length);
  const sa = sealed.out.slice(blocked.length);
  const after = analyzeTiming(sb, sa, rng);

  saveSession({ leakAcc: before.acc, leakLo: before.lo, leakHi: before.hi, leakP: before.p, leakSource: name, leakEvidence: evidenceOf(source) });
  refreshNav();

  document.getElementById('upTimingOut').innerHTML = `
    <div class="split-2">
      <div>
        ${timingCard(`Your data · ${escapeHtml(name)} ${evidenceChip(evidenceOf(source))}`, before, skipped ? `<br>${skipped} row(s) skipped (missing time or label)` : '')}
        <div style="margin-top:1rem">${histChart([
          { values: blocked, color: '#c4341a', label: 'blocked' },
          { values: allowed, color: '#1a3568', label: 'allowed' },
        ])}</div>
      </div>
      <div>
        ${timingCard(`Same data through the airlock · deadline ${sealed.deadline} ms`, after,
          sealed.slipped ? `<br><b class="bad">${sealed.slipped} response(s) exceeded the deadline and slipped a tick — raise the deadline or cap inference time.</b>` : '')}
        <div style="margin-top:1rem">${histChart([
          { values: sb, color: '#c4341a', label: 'blocked (sealed)' },
          { values: sa, color: '#1a3568', label: 'allowed (sealed)' },
        ])}</div>
      </div>
    </div>
    <p class="hash" style="margin-top:0.6rem">The gate uses the left card (your real system). Cadence ${cadence} ms comes from your Airlock Relay setting.</p>`;
  showToast(leaks(before) ? 'Your timing leaks' : 'No timing leak found', `Attacker accuracy ${(before.acc * 100).toFixed(1)}% → ${(after.acc * 100).toFixed(1)}% behind the airlock.`, leaks(before) ? 'bad' : 'ok');
  return `${before.n} trials analysed`;
}

function renderTwin(t, label, evidence) {
  saveSession({ twinKL: t.kl, twinThreshold: t.threshold, twinClean: t.clean, twinSource: label, twinEvidence: evidence });
  refreshNav();
  document.getElementById('twinOut').innerHTML = `
    <div class="split-2">
      <div class="plate plate-pad">
        <p class="kicker">KL(A ∥ B) · ${escapeHtml(label)} ${evidenceChip(evidence)}</p>
        <div class="gate-banner">
          <div><div class="stat ${t.clean ? 'ok' : 'bad'}">${t.kl.toFixed(4)}</div><div class="stat-label">noise floor (95th pct of shuffles) ${t.threshold.toFixed(4)}</div></div>
          <span class="chip ${t.clean ? 'chip-ok' : 'chip-bad'}">${t.clean ? 'twins agree' : 'contaminated'}</span>
        </div>
        <p style="margin-top:0.7rem;font-size:1rem">${t.clean
          ? 'The difference between runs is no larger than what random reshuffling produces. No contamination claimed.'
          : 'The shared run differs from its fresh twin more than chance allows: memory weather leaked across sessions.'}</p>
        <p class="hash" style="margin-top:0.5rem">A: n=${t.A.length} μ ${mean(t.A).toFixed(3)} · B: n=${t.B.length} μ ${mean(t.B).toFixed(3)}</p>
      </div>
      <div class="plate plate-pad">
        ${histChart([
          { values: t.A, color: '#2c4a34', label: 'run A (fresh twin)' },
          { values: t.B, color: '#c48a12', label: 'run B (shared)' },
        ], { bins: 30 })}
      </div>
    </div>`;
}

function onTwinUpload({ name, text, source }) {
  const rows = parseRecords(text, name);
  let A = [];
  let B = [];
  for (const r of rows) {
    const a = Number(pick(r, ['run_a', 'a', 'fresh', 'clean', 'baseline']));
    const b = Number(pick(r, ['run_b', 'b', 'shared', 'test', 'candidate']));
    if (Number.isFinite(a)) A.push(a);
    if (Number.isFinite(b)) B.push(b);
    const run = String(pick(r, ['run', 'twin', 'group']) ?? '').toLowerCase();
    const v = Number(pick(r, ['value', 'metric', 'entropy', 'score']));
    if (run && Number.isFinite(v)) (['a', 'fresh', 'clean', 'baseline'].includes(run) ? A : B).push(v);
  }
  if (A.length < 20 || B.length < 20) throw new Error(`need ≥ 20 values per run — found ${A.length} in A, ${B.length} in B`);
  const t = twinAnalysis(A, B, mulberry32(newSeed()));
  renderTwin(t, name, evidenceOf(source));
  return `${A.length} + ${B.length} values`;
}

function simTwin(contaminated) {
  const rng = mulberry32(newSeed());
  const A = [];
  const B = [];
  for (let i = 0; i < 1000; i++) {
    A.push(gaussian(rng, 12, 2));
    B.push(contaminated ? gaussian(rng, 13.2, 2.6) : gaussian(rng, 12, 2));
  }
  return twinAnalysis(A, B, rng);
}

function bind() {
  const $ = (id) => document.getElementById(id);
  $('n').oninput = (e) => { n = Number(e.target.value); $('nLab').textContent = n; };
  $('mode').onchange = (e) => { mode = e.target.value; };
  $('hunt').onclick = busy($('hunt'), async () => {
    await new Promise((r) => setTimeout(r, 30)); // let the busy state paint before the CPU work
    const seed = newSeed();
    const sim = simulate(mode, n, seed);
    const r = analyzeTiming(sim.blocked, sim.allowed, mulberry32(seed ^ 0x9e3779b9));
    saveSession({ leakAcc: r.acc, leakLo: r.lo, leakHi: r.hi, leakP: r.p, leakSource: `simulated ${mode}`, leakEvidence: 'simulated' });
    renderSim(sim, r, seed);
    refreshNav();
    showToast('Survey complete', `Attacker accuracy ${(r.acc * 100).toFixed(1)}% · 95% CI ${(r.lo * 100).toFixed(1)}–${(r.hi * 100).toFixed(1)}%.`, leaks(r) ? 'bad' : 'ok');
  });
  $('twin').onclick = () => { renderTwin(simTwin(false), 'simulated clean twins', 'simulated'); };
  $('twinDirty').onclick = () => { renderTwin(simTwin(true), 'simulated shared weather', 'simulated'); };
  bindUpload('up-timing', { sampleHref: '/samples/timings-leaky.csv', onData: onTimingUpload });
  bindUpload('up-twin', { sampleHref: '/samples/twin-run.csv', onData: onTwinUpload });
}

shell();
bind();
