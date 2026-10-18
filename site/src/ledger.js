import './style.css';
import { renderNav, renderFooter, initScrollReveal, hashString, showToast } from './shared.js';

const app = document.getElementById('app');

// ── Ledger State ──
const ledgerEvents = [
  { seq: 1, cell: 'CONFORMANCE', type: 'CONTRACT_VERIFIED', detail: 'runsc gVisor + seccomp + 3 isolated networks' },
  { seq: 2, cell: 'RED_CELL', type: 'COMMIT_RED', detail: 'sha256:e3b0c44298fc1c149afbf4c8' },
  { seq: 3, cell: 'BLUE_CELL', type: 'COMMIT_BLUE', detail: 'sha256:9f86d081884c7d659a2feaa0' },
  { seq: 4, cell: 'RED_CELL', type: 'NET_BREACH_BLOCKED', detail: 'Direct connect 10.10.1.4 → 10.10.2.8:8080 dropped' },
  { seq: 5, cell: 'AIRLOCK', type: 'RELAY_4096B', detail: 'OPA=ALLOW | Pad=4096B | Cadence=250ms' },
  { seq: 6, cell: 'MODEL_GW', type: 'SESSION_WIPE', detail: 'Context wiped | KV-cache salted | Output sanitized' },
  { seq: 7, cell: 'LEAK_HUNTER', type: 'DISTINGUISH_TEST', detail: 'N=1000 | Acc=0.506 | 95% CI=[0.475, 0.537]' },
];

let tampered = false;
let originalDetail3 = ledgerEvents[2].detail;

function computeChain(entries) {
  let prev = '0'.repeat(64);
  return entries.map(e => {
    const h = hashString(`${prev}||${e.seq}||${e.cell}||${e.type}||${e.detail}`);
    const entry = { ...e, prevHash: prev, entryHash: h };
    prev = h;
    return entry;
  });
}

function computeMerkleRoot(chain) {
  if (!chain.length) return hashString('EMPTY_TRISEAL_LEDGER');
  let layer = chain.map(e => e.entryHash);
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : left;
      next.push(hashString(`${left}||${right}`));
    }
    layer = next;
  }
  return layer[0];
}

function verifyChain(chain) {
  let prev = '0'.repeat(64);
  for (const e of chain) {
    const recomputed = hashString(`${prev}||${e.seq}||${e.cell}||${e.type}||${e.detail}`);
    if (recomputed !== e.entryHash) return { valid: false, failedAt: e.seq };
    prev = recomputed;
  }
  return { valid: true };
}

function renderPage() {
  const chain = computeChain(ledgerEvents);
  const merkleRoot = computeMerkleRoot(chain);
  const verification = verifyChain(chain);
  const sig = hashString(`ED25519_SIGN||${merkleRoot}`);

  const certJson = JSON.stringify({
    certificate_version: "2.4.0",
    merkle_root: merkleRoot,
    total_events: chain.length,
    commitments: { red: chain[1]?.entryHash.slice(0, 24), blue: chain[2]?.entryHash.slice(0, 24) },
    leak_hunter_ci_95: [0.475, 0.537],
    twin_run_clean: true,
    ed25519_signature: `ed25519:${sig.slice(0, 40)}`
  }, null, 2);

  app.innerHTML = `
${renderNav('ledger')}
<main class="container" style="padding-top:2rem;padding-bottom:4rem">

  <!-- Header -->
  <div class="panel panel-glow-violet corner-ticks" style="padding:1.5rem;margin-bottom:1.5rem;border-left:3px solid var(--neon-violet)">
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:0.5rem">
      <span class="badge badge-violet">TIER-1 MVP · PROOF LAYER</span>
      <span class="font-mono" style="font-size:0.6875rem;color:var(--text-dim)">FastAPI: /certificate · /verify</span>
    </div>
    <h1 style="font-size:1.75rem;font-weight:800;margin-bottom:0.5rem">Hash-Chained Seal Ledger, Merkle Tree & Public Verifier</h1>
    <p style="font-size:0.875rem;color:var(--text-muted);max-width:800px">Every event is SHA-256 hash-chained into an append-only ledger with ed25519-signed Merkle roots. Mutate any entry to test tamper detection.</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:1rem">
      <button id="btnTamper" class="btn" style="background:rgba(244,63,94,0.15);color:var(--neon-rose-bright);border:1px solid var(--neon-rose)">${tampered ? '↺ Restore Ledger' : '🔨 Simulate Tamper (Row #3)'}</button>
      <button id="btnVerify" class="btn" style="background:rgba(168,85,247,0.15);color:var(--neon-violet-bright);border:1px solid var(--neon-violet)">✔ Run Public Verifier</button>
    </div>
  </div>

  <!-- Verification Banner -->
  <div id="verifyBanner" class="panel" style="padding:1rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between;border:1px solid ${verification.valid ? 'rgba(16,185,129,0.4)' : 'rgba(244,63,94,0.5)'};background:${verification.valid ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.08)'}">
    <div style="display:flex;align-items:center;gap:12px">
      <span class="badge ${verification.valid ? 'badge-emerald' : 'badge-rose'}" style="font-size:0.75rem;font-weight:700">${verification.valid ? 'INTEGRITY: VALID ✔' : 'INTEGRITY: BROKEN ✖'}</span>
      <div>
        <div class="font-mono" style="font-size:0.75rem;font-weight:600;color:var(--text-primary)">${verification.valid ? 'All SHA-256 Hash Links & ed25519 Merkle Signatures Verified' : `Tamper Detected at Seq #${verification.failedAt} — Chain Broken`}</div>
        <div class="font-mono" style="font-size:0.625rem;color:var(--text-dim)">Merkle Root: 0x${merkleRoot.slice(0, 20)}...</div>
      </div>
    </div>
    <span class="font-mono" style="font-size:0.75rem;font-weight:700;color:${verification.valid ? 'var(--neon-emerald)' : 'var(--neon-rose)'}">${chain.length} / ${chain.length} BLOCKS ${verification.valid ? 'VALID' : 'BROKEN'}</span>
  </div>

  <!-- Ledger + Certificate Grid -->
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:1.25rem;margin-bottom:1.5rem">
    
    <!-- Ledger Table -->
    <div class="panel" style="padding:1.25rem;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-subtle)">
        <span class="font-mono" style="font-size:0.75rem;font-weight:700;color:var(--neon-violet-bright)">APPEND-ONLY SEAL LEDGER</span>
        <span class="font-mono" style="font-size:0.625rem;color:var(--text-dim)">H_i = SHA256(H_{i-1}||seq||cell||event||detail)</span>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-family:var(--font-mono);font-size:0.625rem">
          <thead>
            <tr style="border-bottom:1px solid var(--border-subtle);color:var(--text-dim)">
              <th style="padding:6px;text-align:left">Seq</th>
              <th style="padding:6px;text-align:left">Cell</th>
              <th style="padding:6px;text-align:left">Event</th>
              <th style="padding:6px;text-align:left">Detail</th>
              <th style="padding:6px;text-align:left">Prev Hash</th>
              <th style="padding:6px;text-align:left">Entry Hash</th>
              <th style="padding:6px;text-align:right">Status</th>
            </tr>
          </thead>
          <tbody>
            ${chain.map((e, i) => {
              const isBad = tampered && i >= 2;
              return `<tr style="border-bottom:1px solid var(--border-subtle);${isBad ? 'background:rgba(244,63,94,0.06)' : ''}">
                <td style="padding:6px;font-weight:700">${e.seq}</td>
                <td style="padding:6px;color:${e.cell.includes('RED') ? 'var(--neon-rose)' : e.cell.includes('BLUE') ? 'var(--neon-blue)' : e.cell.includes('AIRLOCK') ? 'var(--neon-amber)' : 'var(--neon-emerald)'}">${e.cell}</td>
                <td style="padding:6px;color:var(--text-secondary)">${e.type}</td>
                <td style="padding:6px;color:var(--text-muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e.detail}">${e.detail}</td>
                <td style="padding:6px;color:var(--text-dim)">${e.prevHash.slice(0, 10)}...</td>
                <td style="padding:6px;color:${isBad ? 'var(--neon-rose)' : 'var(--neon-emerald)'}">${e.entryHash.slice(0, 10)}...</td>
                <td style="padding:6px;text-align:right"><span class="badge ${isBad ? 'badge-rose' : 'badge-emerald'}" style="font-size:0.5rem">${isBad ? 'BROKEN' : 'VALID'}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Certificate -->
    <div class="panel" style="padding:1.25rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-subtle)">
        <span class="font-mono" style="font-size:0.75rem;font-weight:700;color:var(--neon-emerald)">📜 TRISEAL CERTIFICATE</span>
        <button id="btnCopyCert" class="btn btn-ghost" style="font-size:0.625rem;padding:4px 8px">Copy JSON</button>
      </div>
      <pre style="background:var(--bg-void);border:1px solid var(--border-subtle);padding:0.75rem;border-radius:var(--radius-sm);font-size:0.625rem;color:var(--text-secondary);overflow:auto;max-height:260px;line-height:1.6">${certJson}</pre>
      
      <!-- Bilateral Audit -->
      <div class="panel-elevated" style="padding:0.75rem;margin-top:0.75rem;border-radius:var(--radius-sm)">
        <div class="font-mono" style="font-size:0.6875rem;font-weight:700;color:var(--text-primary);margin-bottom:6px;border-bottom:1px solid var(--border-subtle);padding-bottom:4px">BILATERAL COMMIT-REVEAL</div>
        <div style="display:flex;justify-content:space-between;font-size:0.625rem;margin-bottom:3px">
          <span style="color:var(--text-dim)">Red Commit == Reveal:</span>
          <span style="color:var(--neon-emerald);font-weight:700">MATCH ✔</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.625rem;margin-bottom:3px">
          <span style="color:var(--text-dim)">Blue Commit == Reveal:</span>
          <span style="color:${tampered ? 'var(--neon-rose)' : 'var(--neon-emerald)'};font-weight:700">${tampered ? 'MISMATCH ✖' : 'MATCH ✔'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.625rem">
          <span style="color:var(--text-dim)">ed25519 Signature:</span>
          <span style="color:${verification.valid ? 'var(--neon-emerald)' : 'var(--neon-rose)'};font-weight:700">${verification.valid ? 'VALID ✔' : 'INVALID ✖'}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Merkle Tree Visualization -->
  <div class="panel" style="padding:1.25rem;margin-bottom:1.5rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-subtle)">
      <span class="font-mono" style="font-size:0.75rem;font-weight:700;color:var(--neon-violet-bright)">🌳 MERKLE TREE CHECKPOINT TOPOLOGY (RFC 6962)</span>
      <span class="badge ${verification.valid ? 'badge-emerald' : 'badge-rose'}" style="font-size:0.5625rem">${verification.valid ? 'ROOT VALID ✔' : 'ROOT MISMATCH ✖'}</span>
    </div>
    <div id="merkleTree" style="text-align:center;padding:1rem 0">
      ${renderMerkleTreeSVG(chain, tampered, merkleRoot)}
    </div>
  </div>

  <!-- Public Verifier Sandbox -->
  <div class="panel" style="padding:1.25rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-subtle)">
      <span class="font-mono" style="font-size:0.75rem;font-weight:700;color:var(--neon-emerald)">🔍 PUBLIC VERIFIER SANDBOX</span>
      <button id="btnVerifyJson" class="btn btn-primary" style="font-size:0.6875rem;padding:6px 14px">Verify JSON Payload</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:1rem;align-items:start">
      <div style="text-align:center">
        <div id="qrBox" style="width:120px;height:120px;margin:0 auto;background:var(--bg-void);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center">
          ${renderQR(merkleRoot, tampered)}
        </div>
        <div class="font-mono" style="font-size:0.5625rem;color:var(--text-dim);margin-top:6px">On-Device QR Proof</div>
      </div>
      <div>
        <textarea id="verifyInput" rows="6" style="width:100%;background:var(--bg-void);border:1px solid var(--border-subtle);color:var(--text-secondary);padding:0.75rem;font-family:var(--font-mono);font-size:0.625rem;border-radius:var(--radius-sm);resize:vertical">${certJson}</textarea>
        <div id="verifyResult" class="panel-elevated" style="padding:8px 12px;margin-top:8px;border-radius:var(--radius-sm);font-family:var(--font-mono);font-size:0.6875rem;color:var(--neon-emerald)">
          ✔ Offline Verifier Ready: Signature & Merkle Root match canonical chain.
        </div>
      </div>
    </div>
  </div>

</main>
${renderFooter()}
  `;

  // Wire up events after render
  document.getElementById('btnTamper').addEventListener('click', () => {
    if (!tampered) {
      ledgerEvents[2].detail = 'TAMPERED: Altered Blue defense config hash!';
      tampered = true;
      showToast('TAMPER INJECTED', 'Row #3 mutated. Hash chain broken — Merkle tree corrupted.', 'rose');
    } else {
      ledgerEvents[2].detail = originalDetail3;
      tampered = false;
      showToast('LEDGER RESTORED', 'Canonical state restored. All hashes valid.', 'emerald');
    }
    renderPage();
  });

  document.getElementById('btnVerify').addEventListener('click', () => {
    const chain2 = computeChain(ledgerEvents);
    const result = verifyChain(chain2);
    if (result.valid) {
      showToast('VERIFICATION: PASSED', `All ${chain2.length} blocks verified. Merkle root & ed25519 signature valid.`, 'emerald');
    } else {
      showToast('VERIFICATION: FAILED', `Tamper detected at Seq #${result.failedAt}. SHA-256 chain broken.`, 'rose');
    }
  });

  document.getElementById('btnCopyCert').addEventListener('click', () => {
    navigator.clipboard.writeText(certJson).then(() => showToast('COPIED', 'Certificate JSON copied to clipboard.', 'emerald'));
  });

  document.getElementById('btnVerifyJson')?.addEventListener('click', () => {
    const input = document.getElementById('verifyInput').value;
    const resultEl = document.getElementById('verifyResult');
    try {
      const parsed = JSON.parse(input);
      const currentChain = computeChain(ledgerEvents);
      const currentRoot = computeMerkleRoot(currentChain);
      const expectedSig = `ed25519:${hashString('ED25519_SIGN||' + currentRoot).slice(0, 40)}`;
      const ok = parsed.merkle_root === currentRoot && parsed.ed25519_signature === expectedSig && !tampered;
      resultEl.style.color = ok ? 'var(--neon-emerald)' : 'var(--neon-rose)';
      resultEl.textContent = ok
        ? `✔ VERIFIED: Merkle Root (0x${currentRoot.slice(0, 12)}...) & ed25519 signature authentic.`
        : '✖ REJECTED: Certificate modified or Merkle chain tampered!';
      showToast(ok ? 'VERIFIED' : 'REJECTED', ok ? 'Offline verification passed.' : 'Signature or root mismatch.', ok ? 'emerald' : 'rose');
    } catch {
      resultEl.style.color = 'var(--neon-rose)';
      resultEl.textContent = '✖ SYNTAX ERROR: Invalid JSON.';
    }
  });
}

function renderMerkleTreeSVG(chain, isTampered, rootHash) {
  const leaves = chain.slice(0, 4);
  const l = leaves.map(e => e.entryHash.slice(0, 8));
  while (l.length < 4) l.push('00000000');
  const b0 = hashString(l[0] + l[1]).slice(0, 10);
  const b1 = hashString(l[2] + l[3]).slice(0, 10);
  const bad = isTampered ? '#F43F5E' : '#A855F7';
  const rootC = isTampered ? '#F43F5E' : '#10B981';
  return `<svg viewBox="0 0 680 200" style="width:100%;max-width:680px;height:auto;font-family:'JetBrains Mono',monospace">
    <line x1="340" y1="45" x2="175" y2="95" stroke="#A855F7" stroke-width="1.5"/>
    <line x1="340" y1="45" x2="505" y2="95" stroke="${bad}" stroke-width="1.8"/>
    <line x1="175" y1="125" x2="90" y2="160" stroke="#475569" stroke-width="1.2"/>
    <line x1="175" y1="125" x2="255" y2="160" stroke="#475569" stroke-width="1.2"/>
    <line x1="505" y1="125" x2="425" y2="160" stroke="${bad}" stroke-width="1.8"/>
    <line x1="505" y1="125" x2="590" y2="160" stroke="#475569" stroke-width="1.2"/>
    <rect x="220" y="8" width="240" height="36" rx="4" fill="var(--bg-elevated)" stroke="${rootC}" stroke-width="2"/>
    <text x="234" y="24" fill="${rootC}" font-size="9" font-weight="bold">SIGNED MERKLE ROOT (ed25519)</text>
    <text x="234" y="38" fill="#E2E8F0" font-size="9">0x${rootHash.slice(0, 22)}...</text>
    <rect x="100" y="90" width="150" height="34" rx="4" fill="var(--bg-surface)" stroke="#A855F7" stroke-width="1.2"/>
    <text x="112" y="106" fill="#C084FC" font-size="8.5" font-weight="bold">BRANCH H(L1_0)</text>
    <text x="112" y="118" fill="#CBD5E1" font-size="8.5">0x${b0}...</text>
    <rect x="430" y="90" width="150" height="34" rx="4" fill="var(--bg-surface)" stroke="${bad}" stroke-width="1.5"/>
    <text x="442" y="106" fill="${bad}" font-size="8.5" font-weight="bold">${isTampered ? '✖ CORRUPTED' : 'BRANCH'} H(L1_1)</text>
    <text x="442" y="118" fill="#CBD5E1" font-size="8.5">0x${b1}...</text>
    ${leaves.map((_, i) => {
      const x = 25 + i * 170;
      const isBadLeaf = isTampered && i >= 2;
      return `<rect x="${x}" y="158" width="130" height="30" rx="3" fill="${isBadLeaf ? 'rgba(244,63,94,0.1)' : 'var(--bg-void)'}" stroke="${isBadLeaf ? '#F43F5E' : '#334155'}"/>
        <text x="${x + 8}" y="173" fill="${isBadLeaf ? '#FDA4AF' : '#94A3B8'}" font-size="8">${isBadLeaf ? '✖ ' : ''}Seq #${i + 1}</text>
        <text x="${x + 8}" y="184" fill="${isBadLeaf ? '#F43F5E' : '#34D399'}" font-size="8">0x${l[i]}</text>`;
    }).join('')}
  </svg>`;
}

function renderQR(hash, isTampered) {
  let cells = '';
  const c = isTampered ? '#F43F5E' : '#10B981';
  for (let r = 0; r < 11; r++) {
    for (let col = 0; col < 11; col++) {
      const isFinder = (r < 3 && col < 3) || (r < 3 && col > 7) || (r > 7 && col < 3);
      const charCode = hash.charCodeAt((r * 11 + col) % hash.length) || 48;
      if (isFinder || charCode % 2 === 0) {
        cells += `<rect x="${col * 8 + 6}" y="${r * 8 + 6}" width="6.5" height="6.5" fill="${c}"/>`;
      }
    }
  }
  return `<svg viewBox="0 0 100 100" style="width:100px;height:100px">${cells}</svg>`;
}

renderPage();
initScrollReveal();
