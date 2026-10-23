/** Real client-side evaluation primitives shared by every MVP. */

const enc = new TextEncoder();

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(String(text)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function bytesOf(text) {
  return enc.encode(String(text)).length;
}

/** Mulberry32 — deterministic PRNG from a 32-bit seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromHex(hex) {
  let s = 0x811c9dc5;
  for (let i = 0; i < hex.length; i++) {
    s ^= hex.charCodeAt(i);
    s = Math.imul(s, 0x01000193);
  }
  return s >>> 0;
}

/** Pad payload to a constant envelope using hash-seeded cover bytes (not zeros). */
export async function padEnvelope(payload, padBytes) {
  const raw = enc.encode(String(payload));
  if (!padBytes || padBytes <= 0) {
    return { envelope: raw, padAdded: 0, size: raw.length };
  }
  const envelope = new Uint8Array(padBytes);
  envelope.set(raw.slice(0, Math.min(raw.length, padBytes)));
  const digest = await sha256(payload);
  const rng = mulberry32(seedFromHex(digest));
  for (let i = raw.length; i < padBytes; i++) {
    envelope[i] = Math.floor(rng() * 256);
  }
  return { envelope, padAdded: Math.max(0, padBytes - raw.length), size: padBytes };
}

/** Wait until the next metronome edge. Two packets in the same slot leave together. */
export function waitForCadenceEdge(periodMs) {
  if (!periodMs || periodMs <= 0) return Promise.resolve({ waitMs: 0, slot: -1, now: performance.now() });
  const now = performance.now();
  const slot = Math.floor(now / periodMs);
  const waitMs = (slot + 1) * periodMs - now;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ waitMs, slot: slot + 1, now: performance.now() }), waitMs);
  });
}

export function stripHeaders(headers) {
  const leaky = ['x-red-cell-id', 'x-session-nonce', 'user-agent', 'x-macaroon-token', 'host'];
  const kept = {};
  const stripped = [];
  for (const [k, v] of Object.entries(headers)) {
    if (leaky.includes(k.toLowerCase())) stripped.push(k);
    else kept[k] = v;
  }
  return { kept, stripped };
}

/** HMAC-SHA256 root key for macaroons. Lives only in memory for this page. */
export async function newRootKey() {
  return crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function hmacHex(key, text) {
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Macaroon-like caveat token: cell, action, expiry — signed with HMAC, so caveats cannot be edited. */
export async function mintMacaroon(key, { cell, action, ttlMs = 120000 }) {
  const issued = Date.now();
  const caveats = { cell, action, iat: issued, exp: issued + ttlMs };
  const sig = await hmacHex(key, JSON.stringify(caveats));
  return { caveats, sig, token: `mac.${btoa(JSON.stringify(caveats))}.${sig.slice(0, 32)}` };
}

export async function checkMacaroon(key, mac, { cell, action }) {
  if (!mac) return { ok: false, reason: 'missing token' };
  const expect = await hmacHex(key, JSON.stringify(mac.caveats));
  if (expect !== mac.sig) return { ok: false, reason: 'bad signature (caveats were edited)' };
  if (Date.now() > mac.caveats.exp) return { ok: false, reason: 'expired' };
  if (mac.caveats.cell !== cell) return { ok: false, reason: `cell mismatch (${mac.caveats.cell} ≠ ${cell})` };
  if (mac.caveats.action !== action) return { ok: false, reason: 'action mismatch' };
  return { ok: true, reason: 'caveats hold' };
}

export function randomHex(bytes = 16) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function merkleRoot(hashes) {
  if (!hashes.length) return sha256('EMPTY_LEDGER');
  let layer = [...hashes];
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : left;
      next.push(await sha256(left + right));
    }
    layer = next;
  }
  return layer[0];
}

export async function merkleProof(hashes, index) {
  const proof = [];
  let layer = [...hashes];
  let idx = index;
  while (layer.length > 1) {
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    const sibling = siblingIdx < layer.length ? layer[siblingIdx] : layer[idx];
    proof.push({ hash: sibling, pos: isRight ? 'L' : 'R' });
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : left;
      next.push(await sha256(left + right));
    }
    layer = next;
    idx = Math.floor(idx / 2);
  }
  return proof;
}

export async function verifyProof(leaf, proof, root) {
  let acc = leaf;
  for (const step of proof) {
    acc = step.pos === 'L' ? await sha256(step.hash + acc) : await sha256(acc + step.hash);
  }
  return acc === root;
}

export function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function variance(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1);
}

export function stdev(arr) {
  return Math.sqrt(variance(arr));
}

export function gaussian(rng, mu, sigma) {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function quantile(sorted, p) {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - i) + sorted[hi] * (i - lo);
}

/** Percentile bootstrap CI for a statistic. */
export function bootstrapCI(samples, statFn, B = 400, alpha = 0.05, rng = Math.random) {
  const n = samples.length;
  const dist = [];
  for (let b = 0; b < B; b++) {
    const draw = [];
    for (let i = 0; i < n; i++) draw.push(samples[Math.floor(rng() * n)]);
    dist.push(statFn(draw));
  }
  dist.sort((a, b) => a - b);
  return {
    point: statFn(samples),
    lo: quantile(dist, alpha / 2),
    hi: quantile(dist, 1 - alpha / 2),
  };
}

/** Two-sided permutation test on difference of means. */
export function permutationP(a, b, rounds = 400, rng = Math.random) {
  const observed = Math.abs(mean(a) - mean(b));
  const pool = a.concat(b);
  const nA = a.length;
  let extreme = 0;
  for (let r = 0; r < rounds; r++) {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const d = Math.abs(mean(shuffled.slice(0, nA)) - mean(shuffled.slice(nA)));
    if (d >= observed - 1e-12) extreme++;
  }
  return (extreme + 1) / (rounds + 1);
}

/** Discrete KL(P||Q) over aligned bins, Laplace-smoothed so one empty tail bin cannot dominate. */
export function klDivergence(pCounts, qCounts, alpha = 0.5) {
  const bins = pCounts.length;
  const pSum = pCounts.reduce((a, b) => a + b, 0) + alpha * bins;
  const qSum = qCounts.reduce((a, b) => a + b, 0) + alpha * bins;
  let kl = 0;
  for (let i = 0; i < bins; i++) {
    const p = (pCounts[i] + alpha) / pSum;
    const q = (qCounts[i] + alpha) / qSum;
    kl += p * Math.log(p / q);
  }
  return kl;
}

export function histogram(values, bins, min, max) {
  const counts = new Array(bins).fill(0);
  const width = (max - min) / bins || 1;
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx < 0) idx = 0;
    if (idx >= bins) idx = bins - 1;
    counts[idx]++;
  }
  return counts;
}

/**
 * Threshold classifier: guess "blocked" if sample < midpoint of class means.
 * Returns accuracy vs chance (0.5).
 */
export function timingAccuracy(blocked, allowed) {
  const t = (mean(blocked) + mean(allowed)) / 2;
  let correct = 0;
  const all = blocked.map((x) => ({ x, y: 0 })).concat(allowed.map((x) => ({ x, y: 1 })));
  for (const s of all) {
    const pred = s.x < t ? 0 : 1;
    if (pred === s.y) correct++;
  }
  return correct / all.length;
}

/**
 * Honest attacker: learn the threshold (and which side is "blocked") on even trials,
 * score on odd trials. Training on the test set would flatter the leak.
 */
export function heldOutAccuracy(blocked, allowed) {
  const trainB = blocked.filter((_, i) => i % 2 === 0);
  const trainA = allowed.filter((_, i) => i % 2 === 0);
  const t = (mean(trainB) + mean(trainA)) / 2;
  const blockedLow = mean(trainB) <= mean(trainA);
  let correct = 0;
  let total = 0;
  for (let i = 1; i < blocked.length; i += 2) {
    total++;
    if ((blocked[i] < t) === blockedLow) correct++;
  }
  for (let i = 1; i < allowed.length; i += 2) {
    total++;
    if ((allowed[i] >= t) === blockedLow) correct++;
  }
  return total ? correct / total : 0.5;
}

const STORE_KEY = 'triseal.session.v1';

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveSession(patch) {
  const next = { ...loadSession(), ...patch, updatedAt: Date.now() };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — plates still work, they just forget */
  }
  return next;
}

export function resetSession() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

export function hexPreview(h, n = 16) {
  return h ? h.slice(0, n) : '—';
}

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * A timing channel counts as a leak only when we are 95% confident the spy beats this accuracy.
 * Using the CI's lower bound means small honest samples are not failed for noise.
 */
export const LEAK_FLOOR = 0.52;

/**
 * Where a result came from. Only 'measured' evidence — the team's own files or a real operation —
 * can pass the gate. Demo buttons and the bundled sample files are 'simulated'.
 */
export const evidenceOf = (source) => (source === 'file' || source === 'paste' || source === 'measured' ? 'measured' : 'simulated');

const SIM_NOTE = ' · simulated — run it on your own data to count';

/**
 * The release gate. Every check is 'pass' | 'fail' | 'simulated' | 'pending'.
 * Missing evidence never passes, and neither does a passing result on simulated evidence.
 * Shared by the Release Gate, the overview checklist and the nav status lights.
 */
export function evaluateGate(session = loadSession()) {
  const seals = session.sealRed && session.sealGold && session.sealBlue;
  const st = (cond, have = true, evidence = 'measured') =>
    (!have ? 'pending' : !cond ? 'fail' : evidence === 'measured' ? 'pass' : 'simulated');
  const note = (evidence) => (evidence === 'measured' ? '' : SIM_NOTE);
  const steps = [
    {
      plate: 'home',
      name: 'Team sign-off',
      status: seals ? 'pass' : 'pending',
      detail: seals ? 'Red lead, airlock operator and Blue lead signed off' : 'Waiting for all three sign-offs',
      evidence: seals ? 'measured' : null,
      source: seals ? 'team sign-off' : null,
    },
    {
      plate: 'airlock',
      name: 'Airlock relay',
      // A relay is a real operation of the airlock on the team's own payload, so it counts as measured.
      status: st(session.airlockOk && (session.airlockLeak ?? 1) < 0.3, session.airlockOk != null),
      detail: session.airlockOk == null
        ? 'No sealed relay yet'
        : `relay verified · settings leak ${(100 * (session.airlockLeak ?? 0)).toFixed(0)}% (must be < 30)`,
      evidence: session.airlockOk == null ? null : 'measured',
      source: session.airlockOk == null ? null : 'live relay in this browser',
    },
    {
      plate: 'ledger',
      name: 'Ledger integrity',
      status: st(!session.ledgerBroken, session.merkleRoot != null, session.ledgerEvidence),
      detail: session.merkleRoot == null
        ? 'Upload your ledger export to verify it'
        : (session.ledgerBroken ? `Chain broken at seq ${session.ledgerBrokenAt}` : `${session.ledgerSource ?? 'ledger'} verifies · root ${String(session.merkleRoot).slice(0, 16)}…`)
          + note(session.ledgerEvidence),
      evidence: session.ledgerEvidence ?? null,
      source: session.ledgerSource ?? null,
    },
    {
      plate: 'conformance',
      name: 'Sandbox conformance',
      status: st(!session.drift && !session.canaryTripped, session.drift != null, session.conformanceEvidence),
      detail: session.drift == null
        ? 'No sandbox config checked yet'
        : (session.drift ? `${session.driftCount} invariant(s) drifted from the contract` : session.canaryTripped ? 'Canary honeytoken was touched' : 'Every invariant holds')
          + note(session.conformanceEvidence),
      evidence: session.conformanceEvidence ?? null,
      source: session.conformanceSource ?? null,
    },
    {
      plate: 'leakhunter',
      name: 'Timing side channel',
      status: st(session.leakLo <= LEAK_FLOOR, session.leakLo != null, session.leakEvidence),
      detail: session.leakLo == null
        ? 'No survey yet'
        : `spy accuracy ${(session.leakAcc * 100).toFixed(1)}% · 95% CI lower bound ${(session.leakLo * 100).toFixed(1)}% (must be ≤ ${LEAK_FLOOR * 100}%)`
          + note(session.leakEvidence),
      evidence: session.leakEvidence ?? null,
      source: session.leakSource ?? null,
    },
    {
      plate: 'leakhunter',
      name: 'Cross-session contamination',
      status: st(session.twinKL < session.twinThreshold, session.twinKL != null, session.twinEvidence),
      detail: session.twinKL == null
        ? 'No twin-run yet'
        : `KL ${session.twinKL.toFixed(4)} vs noise floor ${session.twinThreshold.toFixed(4)}` + note(session.twinEvidence),
      evidence: session.twinEvidence ?? null,
      source: session.twinSource ?? null,
    },
  ];
  const ok = steps.every((s) => s.status === 'pass');
  const failed = steps.some((s) => s.status === 'fail');
  // A rehearsal: nothing failing or missing, but some checks rest on simulated evidence.
  const rehearsal = !ok && !failed && steps.every((s) => s.status === 'pass' || s.status === 'simulated');
  const rank = { fail: 3, pending: 2, simulated: 1, pass: 0 };
  const plates = {};
  for (const s of steps) {
    const prev = plates[s.plate];
    plates[s.plate] = prev && rank[prev] >= rank[s.status] ? prev : s.status;
  }
  return {
    steps, ok, failed, rehearsal, plates,
    passed: steps.filter((s) => s.status === 'pass').length,
    simulated: steps.filter((s) => s.status === 'simulated').length,
  };
}
