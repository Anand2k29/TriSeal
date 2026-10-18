import './style.css';
import { renderNav, renderFooter, initScrollReveal, showToast } from './shared.js';

const app = document.getElementById('app');
let driftInjected = false;

const invariants = [
  { name: 'Container Runtime', expected: 'runsc (gVisor)', status: 'PASS', color: 'emerald' },
  { name: 'Root Filesystem', expected: 'read-only', status: 'PASS', color: 'emerald' },
  { name: 'Linux Capabilities', expected: 'cap_drop: ALL', status: 'PASS', color: 'emerald' },
  { name: 'Network Isolation', expected: '3 separate networks, no direct Red→Blue', status: 'PASS', color: 'emerald' },
  { name: 'Seccomp Profile', expected: 'SHA-256: 7d865e95...', status: 'PASS', color: 'emerald' },
  { name: 'Privilege Escalation', expected: 'no-new-privileges: true', status: 'PASS', color: 'emerald' },
];

const canaries = [
  { name: 'Red Vault Honeytoken', location: '/secrets/red_canary_7f3a', status: 'ARMED', triggered: false },
  { name: 'Blue Config Honeytoken', location: '/secrets/blue_canary_d91b', status: 'ARMED', triggered: false },
  { name: 'LLM Weight Honeytoken', location: '/secrets/llm_canary_4e2c', status: 'ARMED', triggered: false },
];

function render() {
  const currentInvariants = invariants.map((inv, i) => {
    if (driftInjected && i === 1) return { ...inv, expected: 'READ-WRITE /tmp mounted!', status: 'FAIL', color: 'rose' };
    if (driftInjected && i === 2) return { ...inv, expected: 'cap_add: SYS_PTRACE detected!', status: 'FAIL', color: 'rose' };
    return inv;
  });
  const allPass = currentInvariants.every(i => i.status === 'PASS');

  app.innerHTML = `
${renderNav('conformance')}
<main class="container" style="padding-top:2rem;padding-bottom:4rem">

  <div class="panel panel-glow-cyan corner-ticks" style="padding:1.5rem;margin-bottom:1.5rem;border-left:3px solid var(--neon-blue)">
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:0.5rem">
      <span class="badge badge-blue">TIER-2 · CONFORMANCE</span>
      <span class="font-mono" style="font-size:0.6875rem;color:var(--text-dim)">GET /api/contract/check</span>
    </div>
    <h1 style="font-size:1.75rem;font-weight:800;margin-bottom:0.5rem">Live Conformance Checker & Naked-Mode Comparison</h1>
    <p style="font-size:0.875rem;color:var(--text-muted);max-width:800px">Verifies running containers match the isolation-contract.yaml. Compare Sealed vs Naked timing to see why fixed-cadence matters.</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:1rem">
      <button id="btnDrift" class="btn" style="background:rgba(244,63,94,0.15);color:var(--neon-rose-bright);border:1px solid var(--neon-rose)">${driftInjected ? '↺ Restore Conformance' : '⚡ Inject Container Drift'}</button>
      <button id="btnCalibrate" class="btn btn-secondary">🔧 Recalibrate Noise Floor</button>
    </div>
  </div>

  <!-- Conformance Status -->
  <div class="panel" style="padding:1rem;margin-bottom:1.5rem;border:1px solid ${allPass ? 'rgba(16,185,129,0.4)' : 'rgba(244,63,94,0.5)'};background:${allPass ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.08)'}">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:12px">
        <span class="badge ${allPass ? 'badge-emerald' : 'badge-rose'}" style="font-size:0.75rem;font-weight:700">${allPass ? 'CONTRACT: VALID ✔' : 'CONTRACT: VIOLATED ✖'}</span>
        <span class="font-mono" style="font-size:0.75rem;color:var(--text-secondary)">${allPass ? 'All 6 invariants verified against isolation-contract.yaml' : 'Container drift detected — 2 invariants violated'}</span>
      </div>
      <span class="font-mono" style="font-size:0.75rem;font-weight:700;color:${allPass ? 'var(--neon-emerald)' : 'var(--neon-rose)'}">${currentInvariants.filter(i => i.status === 'PASS').length}/6 PASS</span>
    </div>
  </div>

  <!-- Invariants Grid -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">
    <div class="panel" style="padding:1.25rem">
      <div class="font-mono" style="font-size:0.75rem;font-weight:700;color:var(--neon-blue-bright);margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:1px solid var(--border-subtle)">ISOLATION CONTRACT INVARIANTS</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${currentInvariants.map(inv => `
          <div class="panel-elevated" style="padding:8px 12px;border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;${inv.status === 'FAIL' ? 'border:1px solid rgba(244,63,94,0.4);background:rgba(244,63,94,0.06)' : ''}">
            <div>
              <div class="font-mono" style="font-size:0.6875rem;font-weight:600;color:var(--text-primary)">${inv.name}</div>
              <div class="font-mono" style="font-size:0.5625rem;color:${inv.status === 'FAIL' ? 'var(--neon-rose)' : 'var(--text-dim)'}">${inv.expected}</div>
            </div>
            <span class="badge badge-${inv.color}" style="font-size:0.5625rem">${inv.status}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="panel" style="padding:1.25rem">
      <div class="font-mono" style="font-size:0.75rem;font-weight:700;color:var(--neon-amber-bright);margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:1px solid var(--border-subtle)">🍯 CANARY HONEYTOKEN STATUS</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${canaries.map(c => `
          <div class="panel-elevated" style="padding:10px 12px;border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center">
            <div>
              <div class="font-mono" style="font-size:0.6875rem;font-weight:600;color:var(--text-primary)">${c.name}</div>
              <div class="font-mono" style="font-size:0.5625rem;color:var(--text-dim)">${c.location}</div>
            </div>
            <span class="badge badge-emerald" style="font-size:0.5625rem">${c.status} · NOT TRIGGERED</span>
          </div>
        `).join('')}
      </div>
      <div class="font-mono" style="font-size:0.625rem;color:var(--text-dim);margin-top:0.75rem;padding-top:0.5rem;border-top:1px solid var(--border-subtle)">
        If any cell reads a honeytoken it shouldn't have access to, the canary triggers and the evaluation is flagged.
      </div>
    </div>
  </div>

  <!-- Naked vs Sealed Comparison -->
  <div class="panel" style="padding:1.25rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-subtle)">
      <div>
        <div class="font-mono" style="font-size:0.625rem;color:var(--neon-rose);text-transform:uppercase;letter-spacing:0.1em">NAKED MODE vs SEALED MODE</div>
        <h2 style="font-size:1.125rem;font-weight:700;margin-top:4px">Response Latency Distribution Comparison</h2>
      </div>
      <div style="display:flex;gap:12px;align-items:center">
        <div style="display:flex;align-items:center;gap:4px"><div style="width:10px;height:10px;background:var(--neon-rose);border-radius:2px"></div><span class="font-mono" style="font-size:0.625rem;color:var(--text-dim)">Naked (Bimodal)</span></div>
        <div style="display:flex;align-items:center;gap:4px"><div style="width:10px;height:10px;background:var(--neon-emerald);border-radius:2px"></div><span class="font-mono" style="font-size:0.625rem;color:var(--text-dim)">Sealed (Unimodal)</span></div>
      </div>
    </div>
    <div id="histogramBox">
      <svg viewBox="0 0 760 170" style="width:100%;height:auto;font-family:'JetBrains Mono',monospace">
        <rect width="760" height="170" fill="var(--bg-void)"/>
        <line x1="40" y1="138" x2="730" y2="138" stroke="#334155" stroke-width="1.5"/>
        <!-- Naked Peak 1: Fast Block -->
        <rect x="75" y="55" width="22" height="83" fill="#F43F5E" fill-opacity="0.7" rx="2"/>
        <rect x="100" y="70" width="22" height="68" fill="#F43F5E" fill-opacity="0.5" rx="2"/>
        <text x="65" y="42" fill="#FDA4AF" font-size="9" font-weight="bold">Naked Block (~14ms)</text>
        <!-- Sealed Spike -->
        <rect x="355" y="16" width="32" height="122" fill="#10B981" rx="2"/>
        <text x="260" y="10" fill="#34D399" font-size="9.5" font-weight="bold">✔ TriSeal Paced (250.0ms ± 0.42ms σ)</text>
        <!-- Naked Peak 2: Slow Infer -->
        <rect x="575" y="60" width="22" height="78" fill="#F43F5E" fill-opacity="0.7" rx="2"/>
        <rect x="600" y="48" width="22" height="90" fill="#F43F5E" fill-opacity="0.8" rx="2"/>
        <rect x="625" y="74" width="22" height="64" fill="#F43F5E" fill-opacity="0.5" rx="2"/>
        <text x="545" y="36" fill="#FDA4AF" font-size="9" font-weight="bold">Naked Infer (~412ms)</text>
        <!-- Labels -->
        <text x="75" y="155" fill="#94A3B8" font-size="9">14ms</text>
        <text x="350" y="155" fill="#34D399" font-size="9.5" font-weight="bold">250.0ms</text>
        <text x="590" y="155" fill="#94A3B8" font-size="9">412ms</text>
      </svg>
    </div>
    <div class="panel-elevated" style="padding:1rem;margin-top:1rem;border-radius:var(--radius-sm)">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;text-align:center">
        <div>
          <div class="font-mono" style="font-size:0.5625rem;color:var(--text-dim)">NOISE FLOOR σ</div>
          <div id="noiseFloor" class="font-mono" style="font-size:1.25rem;font-weight:700;color:var(--neon-amber-bright)">0.42ms</div>
        </div>
        <div>
          <div class="font-mono" style="font-size:0.5625rem;color:var(--text-dim)">VALIDITY SCORE</div>
          <div id="validScore" class="font-mono" style="font-size:1.25rem;font-weight:700;color:var(--neon-emerald)">98.7/100</div>
        </div>
        <div>
          <div class="font-mono" style="font-size:0.5625rem;color:var(--text-dim)">DISTINGUISHABILITY</div>
          <div class="font-mono" style="font-size:1.25rem;font-weight:700;color:var(--neon-emerald)">NONE</div>
        </div>
      </div>
    </div>
  </div>

</main>
${renderFooter()}
  `;

  document.getElementById('btnDrift').addEventListener('click', () => {
    driftInjected = !driftInjected;
    showToast(
      driftInjected ? 'DRIFT INJECTED' : 'CONFORMANCE RESTORED',
      driftInjected ? 'Container restarted with writable /tmp and SYS_PTRACE.' : 'Canonical container state restored.',
      driftInjected ? 'rose' : 'emerald'
    );
    render();
  });

  document.getElementById('btnCalibrate').addEventListener('click', () => {
    const sigma = (0.36 + Math.random() * 0.12).toFixed(2);
    const score = (98.9 - parseFloat(sigma) * 0.8).toFixed(1);
    document.getElementById('noiseFloor').textContent = sigma + 'ms';
    document.getElementById('validScore').textContent = score + '/100';
    showToast('CALIBRATED', `Host jitter σ = ${sigma}ms (Score: ${score}/100).`, 'amber');
  });
}

render();
initScrollReveal();
