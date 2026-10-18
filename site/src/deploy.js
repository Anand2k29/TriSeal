import './style.css';
import { renderNav, renderFooter, initScrollReveal, hashString, showToast } from './shared.js';

const app = document.getElementById('app');
let tampered = false;
let driftInjected = false;
const cliHistory = [];

function addCliLine(text, type = 'output') {
  cliHistory.push({ text, type });
  renderCli();
}

function renderCli() {
  const el = document.getElementById('cliOutput');
  if (!el) return;
  el.innerHTML = cliHistory.map(l => {
    const color = l.type === 'cmd' ? 'var(--neon-emerald)' : l.type === 'error' ? 'var(--neon-rose)' : l.type === 'success' ? 'var(--neon-emerald-bright)' : 'var(--text-muted)';
    return `<div style="color:${color};line-height:1.6">${l.text}</div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function computeMerkleRoot(entries) {
  let layer = entries.map(e => hashString(e));
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      next.push(hashString(layer[i] + (layer[i + 1] || layer[i])));
    }
    layer = next;
  }
  return layer[0] || hashString('EMPTY');
}

function renderCiPipeline() {
  const isBlocked = tampered || driftInjected;
  const root = computeMerkleRoot(['CONFORM', 'RED_COMMIT', 'BLUE_COMMIT', 'RELAY', 'SESSION', 'LEAK_HUNT', 'TWIN_RUN']);
  const steps = [
    { step: '01 · Verify Isolation Contract & gVisor Conformance', ok: !driftInjected, detail: driftInjected ? 'FAIL: Container drift detected (RW mount /tmp)' : 'PASS: 6/6 runsc + seccomp invariants verified (18ms)' },
    { step: '02 · Verify Bilateral Commitments vs Reveals', ok: !tampered, detail: tampered ? 'FAIL: Post-hoc reveal mismatch' : 'PASS: Red & Blue SHA-256 reveals match commitments' },
    { step: '03 · Leak Hunter 95% CI Upper Bound < 55.0%', ok: true, detail: 'PASS: Accuracy=50.6% (CI: 47.5–53.7%, chance=50.0%)' },
    { step: '04 · Twin-Run Divergence < 2.0% τ', ok: true, detail: 'PASS: KL-divergence=0.41% (Zero contamination)' },
    { step: '05 · Verify Seal Ledger Hash Chain & ed25519', ok: !tampered, detail: tampered ? 'FAIL: Broken hash chain at Seq #3' : `PASS: Root 0x${root.slice(0, 12)}... valid` },
    { step: '06 · Release Gate Decision', ok: !isBlocked, detail: isBlocked ? 'BLOCKED: Deployment aborted (Exit 1)' : 'APPROVED: Certificate signed (Exit 0)' },
  ];

  return steps.map(s => `
    <div style="padding:10px 12px;border:1px solid ${s.ok ? 'var(--border-subtle)' : 'rgba(244,63,94,0.4)'};background:${s.ok ? 'var(--bg-void)' : 'rgba(244,63,94,0.06)'};border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;gap:8px">
      <div>
        <div class="font-mono" style="font-size:0.6875rem;font-weight:700;color:${s.ok ? 'var(--text-primary)' : 'var(--neon-rose-bright)'}">${s.step}</div>
        <div class="font-mono" style="font-size:0.5625rem;color:${s.ok ? 'var(--text-dim)' : 'var(--neon-rose)'};margin-top:2px">${s.detail}</div>
      </div>
      <span class="badge ${s.ok ? 'badge-emerald' : 'badge-rose'}" style="font-size:0.5625rem;white-space:nowrap">${s.ok ? 'PASS ✔' : 'BLOCKED ✖'}</span>
    </div>
  `).join('');
}

function renderSiemPayload() {
  const isBlocked = tampered || driftInjected;
  const root = computeMerkleRoot(['CONFORM', 'RED_COMMIT', 'BLUE_COMMIT', 'RELAY', 'SESSION', 'LEAK_HUNT', 'TWIN_RUN']);
  return JSON.stringify({
    "@timestamp": new Date().toISOString(),
    event: {
      provider: "triseal-observatory-diode",
      category: "ai_safety_evaluation",
      outcome: isBlocked ? "failure_tamper_or_drift" : "success_verified",
      severity: isBlocked ? 9 : 1
    },
    triseal: {
      certificate_id: "tsc_ps4_" + root.slice(0, 10),
      merkle_root: root,
      conformance_pass: !driftInjected,
      ledger_chain_valid: !tampered,
      ci_cd_release_gate: isBlocked ? "BLOCKED" : "APPROVED"
    },
    compliance: ["EU_AI_ACT_ART_15", "NIST_AI_RMF_2_6", "ISO_42001"]
  }, null, 2);
}

app.innerHTML = `
${renderNav('deploy')}
<main class="container" style="padding-top:2rem;padding-bottom:4rem">

  <div class="panel panel-glow-cyan corner-ticks" style="padding:1.5rem;margin-bottom:1.5rem;border-left:3px solid var(--neon-cyan)">
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:0.5rem">
      <span class="badge badge-cyan">DEVOPS · DEPLOY</span>
      <span class="font-mono" style="font-size:0.6875rem;color:var(--text-dim)">Docker · Vercel · CLI · CI/CD</span>
    </div>
    <h1 style="font-size:1.75rem;font-weight:800;margin-bottom:0.5rem">CLI Terminal, Docker Topology & CI/CD Release Gate</h1>
    <p style="font-size:0.875rem;color:var(--text-muted);max-width:800px">Run the public verifier CLI, inspect the container topology, execute the 6-step CI/CD gate pipeline, and export Splunk/Elastic SIEM events.</p>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.5rem">

    <!-- CLI Terminal -->
    <div class="panel" style="padding:0;overflow:hidden">
      <div style="background:var(--bg-surface);padding:8px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border-subtle)">
        <div style="display:flex;gap:5px"><div style="width:9px;height:9px;border-radius:50%;background:#F43F5E"></div><div style="width:9px;height:9px;border-radius:50%;background:#F59E0B"></div><div style="width:9px;height:9px;border-radius:50%;background:#10B981"></div></div>
        <span class="font-mono" style="font-size:0.6875rem;color:var(--text-muted)">triseal-cli ~ $</span>
      </div>
      <div id="cliOutput" style="background:var(--bg-void);padding:1rem;height:280px;overflow-y:auto;font-family:var(--font-mono);font-size:0.6875rem"></div>
      <div style="background:var(--bg-surface);padding:8px 12px;display:flex;gap:8px;border-top:1px solid var(--border-subtle)">
        <button id="btnCliVerify" class="btn" style="font-size:0.625rem;padding:4px 10px;background:rgba(16,185,129,0.12);color:var(--neon-emerald-bright);border:1px solid rgba(16,185,129,0.3)">triseal verify --self-test</button>
        <button id="btnCliTamper" class="btn" style="font-size:0.625rem;padding:4px 10px;background:rgba(244,63,94,0.12);color:var(--neon-rose-bright);border:1px solid rgba(244,63,94,0.3)">--simulate-tamper</button>
        <button id="btnCliClear" class="btn btn-ghost" style="font-size:0.625rem;padding:4px 10px">clear</button>
      </div>
    </div>

    <!-- Docker Topology -->
    <div class="panel" style="padding:1.25rem">
      <div class="font-mono" style="font-size:0.75rem;font-weight:700;color:var(--neon-cyan-bright);margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:1px solid var(--border-subtle)">🐳 DOCKER COMPOSE TOPOLOGY</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${[
          { name: 'red_cell', img: 'python:3.11-slim', net: 'red_net', color: 'rose', sec: 'RO · cap:NONE · gVisor' },
          { name: 'blue_cell', img: 'python:3.11-slim', net: 'blue_net', color: 'blue', sec: 'RO · cap:NONE · gVisor' },
          { name: 'llm_cell', img: 'ollama/ollama:latest', net: 'llm_net', color: 'emerald', sec: 'RO · cap:NONE · gVisor' },
          { name: 'airlock', img: 'python:3.11-slim', net: 'red+blue+llm+ledger', color: 'amber', sec: 'DUAL-HOMED · OPA · Pacer' },
          { name: 'seal_ledger', img: 'python:3.11-slim', net: 'ledger_net', color: 'violet', sec: 'Append-only · SHA-256' },
        ].map(s => `
          <div class="panel-elevated" style="padding:8px 12px;border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;border-left:2px solid var(--neon-${s.color})">
            <div>
              <div class="font-mono" style="font-size:0.6875rem;font-weight:700;color:var(--neon-${s.color}-bright)">${s.name}</div>
              <div class="font-mono" style="font-size:0.5625rem;color:var(--text-dim)">${s.img} · ${s.net}</div>
            </div>
            <span class="badge badge-${s.color}" style="font-size:0.5rem">${s.sec}</span>
          </div>
        `).join('')}
      </div>
      <div class="font-mono" style="font-size:0.5625rem;color:var(--text-dim);margin-top:0.75rem;padding-top:0.5rem;border-top:1px solid var(--border-subtle)">
        4 networks (all internal:true) · 5 services · Zero external egress
      </div>
    </div>
  </div>

  <!-- CI/CD Pipeline -->
  <div class="panel" style="padding:1.25rem;margin-bottom:1.5rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-subtle)">
      <div>
        <div class="font-mono" style="font-size:0.625rem;color:var(--neon-cyan);text-transform:uppercase;letter-spacing:0.1em">RELEASE GATE</div>
        <h2 style="font-size:1.125rem;font-weight:700;margin-top:4px">6-Step CI/CD Verification Pipeline</h2>
      </div>
      <div style="display:flex;gap:8px">
        <button id="btnSimTamperCi" class="btn" style="font-size:0.625rem;padding:6px 12px;background:rgba(244,63,94,0.12);color:var(--neon-rose-bright);border:1px solid rgba(244,63,94,0.3)">${tampered ? '↺ Restore' : '⚡ Simulate Tampered PR'}</button>
        <button id="btnRunGate" class="btn btn-primary" style="font-size:0.6875rem;padding:6px 14px">▶ Run Pipeline</button>
      </div>
    </div>
    <div id="ciSteps" style="display:flex;flex-direction:column;gap:6px">
      ${renderCiPipeline()}
    </div>
  </div>

  <!-- SIEM Export -->
  <div class="panel" style="padding:1.25rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-subtle)">
      <span class="font-mono" style="font-size:0.75rem;font-weight:700;color:var(--neon-cyan-bright)">📡 SIEM EXPORT (Splunk / Elastic)</span>
      <button id="btnCopySiem" class="btn btn-ghost" style="font-size:0.625rem;padding:4px 10px">Copy JSON</button>
    </div>
    <pre id="siemJson" style="background:var(--bg-void);border:1px solid var(--border-subtle);padding:1rem;border-radius:var(--radius-sm);font-family:var(--font-mono);font-size:0.625rem;color:var(--text-secondary);overflow:auto;max-height:200px;line-height:1.6">${renderSiemPayload()}</pre>
  </div>

</main>
${renderFooter()}
`;

// Boot CLI
addCliLine('<span style="color:var(--neon-emerald)">$</span> triseal --version', 'cmd');
addCliLine('TriSeal Public Verifier CLI v2.4.0');
addCliLine('Runtime: Python 3.11 · hashlib.sha256 · ed25519');
addCliLine('');

// CLI Verify
document.getElementById('btnCliVerify').addEventListener('click', () => {
  addCliLine('<span style="color:var(--neon-emerald)">$</span> python3 cli/triseal_verify.py --self-test', 'cmd');
  addCliLine('[TRISEAL VERIFIER v2.4.0] Initializing SHA-256 chain audit...');
  const events = ['CONFORMANCE', 'COMMIT_RED', 'COMMIT_BLUE', 'NET_BREACH_BLOCKED', 'AIRLOCK_RELAY', 'SESSION_WIPE'];
  events.forEach((e, i) => addCliLine(`  Seq #${i + 1}: ${e} — hash link verified ✔`, 'success'));
  addCliLine(`✔ Verified ${events.length}/${events.length} hash-chained blocks.`, 'success');
  addCliLine(`✔ Final Head SHA-256: ${hashString('LEDGER_HEAD_VALID').slice(0, 48)}`, 'success');
  addCliLine('✔ Verdict: TRISEAL CERTIFICATE & SEAL LEDGER VALID (Exit Code 0)', 'success');
  addCliLine('');
  showToast('CLI: VERIFIED', 'Hash chain valid. Exit code 0.', 'emerald');
});

// CLI Tamper
document.getElementById('btnCliTamper').addEventListener('click', () => {
  addCliLine('<span style="color:var(--neon-emerald)">$</span> python3 cli/triseal_verify.py --simulate-tamper', 'cmd');
  addCliLine('[!] Simulating post-hoc tamper attack on Seq #3 (BLUE_CELL)...');
  addCliLine('  Seq #1: CONFORMANCE — hash link verified ✔', 'success');
  addCliLine('  Seq #2: COMMIT_RED — hash link verified ✔', 'success');
  addCliLine('✖ CRITICAL TAMPER DETECTED at Seq #3 (BLUE_CELL):', 'error');
  addCliLine('  Stored Hash:     ' + hashString('ORIGINAL_BLUE').slice(0, 48), 'error');
  addCliLine('  Recomputed Hash: ' + hashString('TAMPERED_BLUE').slice(0, 48), 'error');
  addCliLine('✖ Verdict: INVALID CERTIFICATE (Exit Code 1)', 'error');
  addCliLine('');
  showToast('CLI: TAMPER DETECTED', 'Hash chain broken at Seq #3. Exit code 1.', 'rose');
});

// CLI Clear
document.getElementById('btnCliClear').addEventListener('click', () => {
  cliHistory.length = 0;
  renderCli();
});

// CI Pipeline
document.getElementById('btnSimTamperCi').addEventListener('click', () => {
  tampered = !tampered;
  document.getElementById('ciSteps').innerHTML = renderCiPipeline();
  document.getElementById('siemJson').textContent = renderSiemPayload();
  document.getElementById('btnSimTamperCi').textContent = tampered ? '↺ Restore' : '⚡ Simulate Tampered PR';
  showToast(tampered ? 'TAMPER SIMULATED' : 'RESTORED', tampered ? 'CI gate will block deployment.' : 'CI gate will approve deployment.', tampered ? 'rose' : 'emerald');
});

document.getElementById('btnRunGate').addEventListener('click', () => {
  const blocked = tampered || driftInjected;
  document.getElementById('ciSteps').innerHTML = renderCiPipeline();
  document.getElementById('siemJson').textContent = renderSiemPayload();
  showToast(blocked ? 'GATE: BLOCKED (EXIT 1)' : 'GATE: APPROVED (EXIT 0)', blocked ? 'Model release blocked.' : 'All 6 gates passed.', blocked ? 'rose' : 'emerald');
});

// SIEM Copy
document.getElementById('btnCopySiem').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('siemJson').textContent).then(() => showToast('COPIED', 'SIEM payload copied.', 'cyan'));
});

initScrollReveal();
