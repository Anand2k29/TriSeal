import './style.css';
import { wrapPage, showToast, plateHead, refreshNav, PLATES, busy, evidenceChip } from './shared.js';
import { loadSession, sha256, evaluateGate, escapeHtml } from './engine.js';
import { uploadPanel, bindUpload, downloadFile } from './upload.js';

const app = document.getElementById('app');
const enc = new TextEncoder();
const FORMAT = 'triseal-certificate/2';

/** Stable JSON: sorted keys, so the same evidence always hashes the same. */
function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
const SIG = { name: 'ECDSA', hash: 'SHA-256' };

/** Release only when every check passed on measured evidence; otherwise a rehearsal. */
const gradeOf = (checks) => (checks.every((c) => c.status === 'pass' && c.evidence === 'measured') ? 'release' : 'rehearsal');

function evidence(session, gate) {
  return {
    checks: gate.steps.map((s) => ({ check: s.name, status: s.status, evidence: s.evidence, source: s.source, detail: s.detail })),
    ledger_merkle_root: session.merkleRoot ?? null,
    red_commit: session.redCommit ?? null,
    blue_commit: session.blueCommit ?? null,
    dataset_run: session.datasetRun ?? null,
    airlock: { cadence_ms: session.cadence ?? null, envelope_bytes: session.pad ?? null },
    leak: { ci_lower: session.leakLo ?? null, ci_upper: session.leakHi ?? null, p: session.leakP ?? null, source: session.leakSource ?? null },
    twin: { kl: session.twinKL ?? null, noise_floor: session.twinThreshold ?? null, source: session.twinSource ?? null },
    conformance: { drift_count: session.driftCount ?? null, canary_tripped: !!session.canaryTripped, source: session.conformanceSource ?? null },
  };
}

async function issueCertificate(ev) {
  const grade = gradeOf(ev.checks);
  const simulated = ev.checks.filter((c) => c.evidence !== 'measured').map((c) => c.check);
  const digest = await sha256(canonical(ev));
  const keys = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify']);
  const payload = {
    format: FORMAT,
    grade,
    // The notice is signed too, so a rehearsal can never be passed off as a release.
    notice: grade === 'release'
      ? 'Every check passed on measured evidence.'
      : `REHEARSAL — NOT VALID FOR RELEASE. Simulated evidence: ${simulated.join(', ')}.`,
    simulated_checks: simulated,
    issued_at: new Date().toISOString(),
    evidence_sha256: digest,
    evidence: ev,
  };
  const sig = await crypto.subtle.sign(SIG, keys.privateKey, enc.encode(canonical(payload)));
  return {
    ...payload,
    signature: { alg: 'ECDSA-P256-SHA256', public_key_jwk: await crypto.subtle.exportKey('jwk', keys.publicKey), value: b64(sig) },
  };
}

async function verifyCertificate(cert) {
  if (!cert || !['triseal-certificate/1', FORMAT].includes(cert.format)) throw new Error(`not a TriSeal certificate (format ${FORMAT})`);
  if (!cert.signature?.public_key_jwk || !cert.signature?.value) throw new Error('certificate has no signature');
  const { signature, ...payload } = cert;
  const digestOk = (await sha256(canonical(cert.evidence))) === cert.evidence_sha256;
  const key = await crypto.subtle.importKey('jwk', signature.public_key_jwk, ALG, false, ['verify']);
  const sigOk = await crypto.subtle.verify(SIG, key, unb64(signature.value), enc.encode(canonical(payload)));
  // Version 1 certificates predate provenance tracking, so they can never count as a release.
  const grade = cert.format === FORMAT ? cert.grade : 'legacy';
  const gradeOk = cert.format !== FORMAT || gradeOf(cert.evidence?.checks ?? []) === cert.grade;
  return { digestOk, sigOk, gradeOk, grade };
}

function paint() {
  const session = loadSession();
  const gate = evaluateGate(session);
  const ev = evidence(session, gate);
  const href = (plate) => PLATES.find((p) => p.id === plate)?.href ?? '/app.html';
  const canIssue = gate.ok || gate.rehearsal;
  const tone = gate.ok ? 'var(--moss)' : gate.failed ? 'var(--vermillion)' : 'var(--paper-2)';
  const label = gate.ok ? 'Release approved' : gate.failed ? 'Release blocked' : gate.rehearsal ? 'Rehearsal only — simulated evidence' : 'Evidence incomplete';
  const statusText = { pass: 'pass', fail: 'fail', simulated: 'simulated', pending: 'pending' };

  document.getElementById('gate').innerHTML = `
    <div class="plate plate-pad ${gate.rehearsal ? 'sim-banner' : ''}" style="background:${gate.rehearsal ? '' : tone};color:${gate.ok || gate.failed ? 'var(--paper-2)' : 'var(--ink)'};margin-bottom:1.2rem">
      <div class="gate-banner">
        <div>
          <p class="kicker" style="color:inherit">${label}</p>
          <div class="stat">${gate.passed}/${gate.steps.length} checks</div>
          <div class="stat-label" style="color:inherit">passing on measured evidence${gate.simulated ? ` · ${gate.simulated} simulated` : ''}</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="press ${gate.ok ? 'press-gold' : ''}" id="issue" type="button" ${canIssue ? '' : 'disabled'}
            title="${canIssue ? '' : 'Every check must pass first'}">${gate.ok ? 'Issue release certificate' : 'Issue rehearsal certificate'}</button>
          <button class="press" id="reread" type="button" style="background:var(--paper-2);color:var(--ink)">Re-read results</button>
        </div>
      </div>
      ${gate.rehearsal ? `<p style="margin-top:0.8rem;font-size:1rem">Every check passes, but ${gate.simulated} rest${gate.simulated === 1 ? 's' : ''} on demo or sample data.
        A rehearsal certificate is signed and verifiable, and says plainly that it is <b>not valid for release</b>. Re-run the marked checks on your own data to issue a release certificate.</p>` : ''}
    </div>
    <div class="plate" style="overflow:auto">
      <table class="sheet">
        <thead><tr><th>#</th><th>Check</th><th>Finding</th><th>Evidence</th><th>Status</th><th></th></tr></thead>
        <tbody>${gate.steps.map((s, i) => `
          <tr class="${s.status === 'fail' ? 'is-off' : ''}">
            <td>${String(i + 1).padStart(2, '0')}</td>
            <td>${s.name}</td>
            <td>${escapeHtml(s.detail)}</td>
            <td>${s.evidence ? evidenceChip(s.evidence) : '—'}</td>
            <td class="${s.status === 'pass' ? 'ok' : s.status === 'fail' ? 'bad' : ''}">${statusText[s.status]}</td>
            <td>${s.status === 'pass' ? '' : `<a class="row-btn" style="text-decoration:none;color:inherit" href="${href(s.plate)}" target="_blank" rel="noopener">${s.status === 'fail' ? 'fix' : s.status === 'simulated' ? 'use real data' : 'run'} ↗</a>`}</td>
          </tr>`).join('')}</tbody>
      </table>
    </div>
    <p class="hash" style="margin-top:0.8rem">Missing evidence never passes, and neither does demo or sample data. Results are read live from the other tools in this browser.</p>`;

  const issue = document.getElementById('issue');
  issue.onclick = busy(issue, async () => {
    const cert = await issueCertificate(ev);
    const release = cert.grade === 'release';
    document.getElementById('cert').innerHTML = `
      <div class="plate plate-pad ${release ? '' : 'sim-banner'}">
        <div class="gate-banner">
          <div>
            <p class="kicker">${release ? 'Release certificate issued' : 'Rehearsal certificate issued — not valid for release'}</p>
            <p class="hash">evidence sha256 ${cert.evidence_sha256}</p>
          </div>
          <button class="press press-ink" id="dl" type="button">Download certificate</button>
        </div>
        <pre class="hash scroll-y" style="white-space:pre-wrap;margin-top:0.8rem">${escapeHtml(JSON.stringify(cert, null, 2))}</pre>
      </div>`;
    document.getElementById('dl').onclick = () => downloadFile(`triseal-${cert.grade}-certificate-${cert.evidence_sha256.slice(0, 12)}.json`, JSON.stringify(cert, null, 2));
    showToast(release ? 'Release certificate issued' : 'Rehearsal certificate issued',
      release ? 'Signed with a fresh ECDSA P-256 key; the public key travels inside the certificate.'
        : 'Signed and verifiable, but marked not valid for release.', release ? 'ok' : 'info');
  });
  document.getElementById('reread').onclick = () => { paint(); refreshNav(); showToast('Re-read', 'Gate recomputed from the latest results.'); };
}

app.innerHTML = wrapPage('deploy', `
<main class="inner">
  ${plateHead('Release Gate', 'No evidence,<br>no release.',
    'The gate reads every check — sign-off, airlock relay, ledger integrity, conformance, timing leak and twin-run. '
    + 'A release certificate needs every check to pass on your own measured data; demo and sample runs can only produce a clearly labelled rehearsal.')}
  <div id="gate"></div>
  <div id="cert" class="results"></div>
  <hr class="rule">
  ${uploadPanel({
    id: 'up-cert',
    title: 'Verify a certificate',
    blurb: 'Drop a TriSeal certificate JSON. We recompute the evidence hash, check the ECDSA signature against the embedded public key, '
      + 'and confirm its grade matches its evidence. Edit any field first to watch verification fail. '
      + 'For production, pin the issuer’s public key rather than trusting the embedded one.',
    formats: 'JSON',
    sampleHref: '',
  })}
  <div id="verifyOut" class="results"></div>
  <hr class="rule">
  <div class="explain"><b>In CI</b>Run <code>python cli/triseal_verify.py --self-test</code> or call <code>POST /api/verify</code> to fail a pipeline when the ledger does not verify.
    Reject any certificate whose <code>grade</code> is not <code>release</code>.</div>
</main>
`);

document.querySelector('#up-cert [data-sample]').remove();
bindUpload('up-cert', {
  sampleHref: '',
  onData: async ({ text }) => {
    let cert;
    try { cert = JSON.parse(text); } catch { throw new Error('certificate must be JSON'); }
    const { digestOk, sigOk, gradeOk, grade } = await verifyCertificate(cert);
    const authentic = digestOk && sigOk && gradeOk;
    const releasable = authentic && grade === 'release';
    const headline = !authentic ? 'INVALID' : releasable ? 'VALID FOR RELEASE' : grade === 'legacy' ? 'AUTHENTIC · LEGACY' : 'AUTHENTIC · REHEARSAL';
    document.getElementById('verifyOut').innerHTML = `
      <div class="plate plate-pad ${authentic && !releasable ? 'sim-banner' : ''}">
        <div class="stat ${releasable ? 'ok' : 'bad'}">${headline}</div>
        <p style="margin-top:0.6rem">${digestOk ? '<span class="chip chip-ok">evidence hash matches</span>' : '<span class="chip chip-bad">evidence was edited</span>'}
          ${sigOk ? '<span class="chip chip-ok">signature valid</span>' : '<span class="chip chip-bad">signature invalid</span>'}
          ${gradeOk ? '' : '<span class="chip chip-bad">grade contradicts evidence</span>'}
          ${grade === 'release' ? '<span class="chip chip-ok">all evidence measured</span>' : '<span class="chip chip-sim">not valid for release</span>'}</p>
        ${authentic && grade === 'rehearsal' ? `<p style="margin-top:0.6rem;font-size:1rem">Genuine, but issued on simulated evidence: ${escapeHtml((cert.simulated_checks ?? []).join(', '))}.</p>` : ''}
        ${grade === 'legacy' ? '<p style="margin-top:0.6rem;font-size:1rem">Issued before evidence provenance was recorded, so it cannot prove its data was real.</p>' : ''}
        <p class="hash" style="margin-top:0.5rem">issued ${escapeHtml(cert.issued_at ?? '?')} · ${(cert.evidence?.checks ?? []).length} checks recorded</p>
      </div>`;
    showToast(headline, !authentic ? 'Something in this file changed after signing.'
      : releasable ? 'Hash, signature and grade all verify.' : 'Genuine, but not a release certificate.', releasable ? 'ok' : 'bad');
    return headline.toLowerCase();
  },
});

paint();
addEventListener('focus', () => { paint(); refreshNav(); });
