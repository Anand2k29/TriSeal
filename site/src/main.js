import './style.css';
import { renderNav, renderFooter, initScrollReveal, createParticles, typeText, animateCounter, hashString } from './shared.js';

const app = document.getElementById('app');

app.innerHTML = `
${renderNav('home')}

<!-- HERO SECTION -->
<section class="hero bg-grid" id="hero">
  <div class="container" style="display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center">
    
    <!-- Left: Text Content -->
    <div class="hero-content animate-fade-in-up">
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1.25rem">
        <span class="badge badge-emerald">PS-4 SUBMISSION</span>
        <span class="badge badge-slate">TEAM PINNACLE</span>
        <span class="badge badge-amber">HACK IN HILLS</span>
      </div>
      <p class="hero-tag" id="heroTag"></p>
      <h1 class="hero-title">
        Three parties.<br>Three seals.<br><span class="accent">One finding you can prove.</span>
      </h1>
      <p class="hero-subtitle">
        TriSeal runs Red Team, Blue Team, and the Client's LLM in hardened, network-segmented cells. Every payload passes through a fixed-cadence normalizing Airlock. Every evaluation ships with an independently verifiable, ed25519-signed <strong style="color:var(--neon-violet-bright)">TriSeal Certificate</strong>.
      </p>
      <div class="hero-actions">
        <a href="#architecture" class="btn btn-primary">⛩ Explore Architecture</a>
        <a href="https://github.com/Anand2k29/TriSeal" target="_blank" rel="noopener" class="btn btn-secondary">GitHub ↗</a>
        <a href="#mvps" class="btn btn-outline-emerald">View MVPs →</a>
      </div>
      <div class="hero-metrics">
        <div class="hero-metric">
          <span class="hero-metric-value" id="metricCells">3</span>
          <span class="hero-metric-label">Isolated Cells</span>
        </div>
        <div class="hero-metric">
          <span class="hero-metric-value" style="color:var(--neon-amber-bright)">250ms</span>
          <span class="hero-metric-label">Fixed Cadence</span>
        </div>
        <div class="hero-metric">
          <span class="hero-metric-value" style="color:var(--neon-violet-bright)">4096B</span>
          <span class="hero-metric-label">Padded Envelope</span>
        </div>
        <div class="hero-metric">
          <span class="hero-metric-value" style="color:var(--neon-cyan-bright)">ed25519</span>
          <span class="hero-metric-label">Signed Proofs</span>
        </div>
      </div>
    </div>

    <!-- Right: Architecture Mini Diagram -->
    <div class="animate-fade-in-up delay-300" style="position:relative">
      <div class="panel panel-glow-emerald corner-ticks" style="padding:1.5rem;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-subtle)">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="status-dot"></div>
            <span class="font-mono" style="font-size:0.75rem;font-weight:700;color:var(--text-primary)">LIVE TOPOLOGY</span>
          </div>
          <span class="badge badge-emerald" style="font-size:0.5625rem">SEALED</span>
        </div>
        <svg viewBox="0 0 500 340" style="width:100%;height:auto" role="img" aria-label="TriSeal Architecture">
          <defs>
            <marker id="ae" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L10 5L0 9z" fill="#10B981"/></marker>
            <marker id="aa" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L10 5L0 9z" fill="#F59E0B"/></marker>
          </defs>
          <!-- Red Cell -->
          <rect x="10" y="20" width="130" height="70" rx="6" fill="rgba(244,63,94,0.08)" stroke="#F43F5E" stroke-width="1.5"/>
          <text x="25" y="45" fill="#FB7185" font-family="JetBrains Mono,monospace" font-size="11" font-weight="700">RED CELL</text>
          <text x="25" y="62" fill="#94A3B8" font-family="JetBrains Mono,monospace" font-size="8.5">Attack · gVisor · seccomp</text>
          <text x="25" y="78" fill="#64748B" font-family="JetBrains Mono,monospace" font-size="7.5">red_net · 10.10.1.0/24</text>
          
          <!-- Blue Cell -->
          <rect x="10" y="250" width="130" height="70" rx="6" fill="rgba(59,130,246,0.08)" stroke="#3B82F6" stroke-width="1.5"/>
          <text x="25" y="275" fill="#60A5FA" font-family="JetBrains Mono,monospace" font-size="11" font-weight="700">BLUE CELL</text>
          <text x="25" y="292" fill="#94A3B8" font-family="JetBrains Mono,monospace" font-size="8.5">Defense · gVisor · seccomp</text>
          <text x="25" y="308" fill="#64748B" font-family="JetBrains Mono,monospace" font-size="7.5">blue_net · 10.10.2.0/24</text>
          
          <!-- Blocked line -->
          <line x1="75" y1="90" x2="75" y2="250" stroke="#F43F5E" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.5"/>
          <rect x="30" y="157" width="90" height="22" rx="4" fill="rgba(244,63,94,0.15)" stroke="#F43F5E" stroke-width="1"/>
          <text x="42" y="172" fill="#FB7185" font-family="JetBrains Mono,monospace" font-size="8" font-weight="700">✖ BLOCKED</text>
          
          <!-- Airlock -->
          <rect x="175" y="55" width="150" height="230" rx="8" fill="rgba(245,158,11,0.06)" stroke="#F59E0B" stroke-width="2"/>
          <text x="210" y="82" fill="#FBBF24" font-family="JetBrains Mono,monospace" font-size="13" font-weight="700">⛩ AIRLOCK</text>
          <text x="190" y="100" fill="#F59E0B" font-family="JetBrains Mono,monospace" font-size="8">OPA · Macaroon · Normalize</text>
          <rect x="190" y="114" width="120" height="24" rx="4" fill="var(--bg-void)" stroke="rgba(245,158,11,0.3)"/>
          <text x="207" y="130" fill="#FDE68A" font-family="JetBrains Mono,monospace" font-size="9">1. Authenticate</text>
          <rect x="190" y="146" width="120" height="24" rx="4" fill="var(--bg-void)" stroke="rgba(245,158,11,0.3)"/>
          <text x="212" y="162" fill="#FDE68A" font-family="JetBrains Mono,monospace" font-size="9">2. Normalize</text>
          <rect x="190" y="178" width="120" height="24" rx="4" fill="var(--bg-void)" stroke="rgba(245,158,11,0.3)"/>
          <text x="204" y="194" fill="#FDE68A" font-family="JetBrains Mono,monospace" font-size="9">3. Pad (4096B)</text>
          <rect x="190" y="210" width="120" height="28" rx="4" fill="var(--bg-void)" stroke="#F59E0B" stroke-width="1.5"/>
          <text x="198" y="228" fill="#FBBF24" font-family="JetBrains Mono,monospace" font-size="9" font-weight="700">4. Pace (250ms)</text>
          
          <!-- Model Gateway + LLM -->
          <rect x="360" y="55" width="130" height="70" rx="6" fill="rgba(16,185,129,0.08)" stroke="#10B981" stroke-width="1.5"/>
          <text x="375" y="80" fill="#34D399" font-family="JetBrains Mono,monospace" font-size="10" font-weight="700">MODEL GATEWAY</text>
          <text x="375" y="96" fill="#94A3B8" font-family="JetBrains Mono,monospace" font-size="8">Session wipe · KV-salt</text>
          <text x="375" y="112" fill="#64748B" font-family="JetBrains Mono,monospace" font-size="7.5">llm_net · 10.10.3.0/24</text>
          
          <rect x="360" y="155" width="130" height="65" rx="6" fill="rgba(16,185,129,0.08)" stroke="#10B981" stroke-width="1.5"/>
          <text x="375" y="180" fill="#6EE7B7" font-family="JetBrains Mono,monospace" font-size="11" font-weight="700">🧠 LLM CELL</text>
          <text x="375" y="197" fill="#94A3B8" font-family="JetBrains Mono,monospace" font-size="8.5">Ollama / vLLM</text>
          <text x="375" y="210" fill="#34D399" font-family="JetBrains Mono,monospace" font-size="7.5">Qwen-2.5 · Llama 3B</text>
          
          <!-- Seal Ledger -->
          <rect x="175" y="300" width="315" height="35" rx="6" fill="rgba(168,85,247,0.08)" stroke="#A855F7" stroke-width="1.5"/>
          <text x="195" y="322" fill="#C084FC" font-family="JetBrains Mono,monospace" font-size="10" font-weight="700">⛓ SEAL LEDGER — SHA-256 · Merkle · ed25519</text>
          
          <!-- Flow arrows -->
          <line x1="140" y1="55" x2="173" y2="75" stroke="#F59E0B" stroke-width="1.5" class="animate-dash" marker-end="url(#aa)"/>
          <line x1="175" y1="285" x2="140" y2="285" stroke="#3B82F6" stroke-width="1.5" class="animate-dash"/>
          <line x1="325" y1="90" x2="358" y2="90" stroke="#10B981" stroke-width="1.5" class="animate-dash" marker-end="url(#ae)"/>
          <line x1="425" y1="125" x2="425" y2="153" stroke="#10B981" stroke-width="1.5" class="animate-dash" marker-end="url(#ae)"/>
          <line x1="250" y1="285" x2="250" y2="298" stroke="#A855F7" stroke-width="1.2"/>
        </svg>
      </div>
    </div>
  </div>
</section>

<!-- PROBLEM: WHY SHARED SANDBOXES FAIL -->
<section class="section" id="problems">
  <div class="container">
    <div class="section-header reveal">
      <p class="section-tag">THE PROBLEM</p>
      <h2 class="section-title">Why Shared Cloud Sandboxes Fail Audit Scrutiny</h2>
      <p class="section-desc">Today's AI safety evidence is "trust us" instead of cryptographic proof. TriSeal fixes four structural failure modes.</p>
    </div>
    <div class="feature-grid">
      <div class="feature-card rose reveal delay-100">
        <div class="feature-card-icon rose">🔓</div>
        <p class="feature-card-tag" style="color:var(--neon-rose)">FAILURE 01 · PEEKING</p>
        <h3 class="feature-card-title">Blue Sees Red's Raw Attack Payloads</h3>
        <p class="feature-card-desc">Shared networks let Blue inspect raw attack headers. Defense adapts to attacks it should never see — inflating safety scores artificially.</p>
        <div style="padding-top:0.75rem;border-top:1px solid var(--border-subtle);font-family:var(--font-mono);font-size:0.6875rem;color:var(--neon-emerald)">
          TriSeal Fix → Separate networks + bilateral commit-reveal + Airlock normalization
        </div>
      </div>
      <div class="feature-card amber reveal delay-200">
        <div class="feature-card-icon amber">⏱</div>
        <p class="feature-card-tag" style="color:var(--neon-amber)">FAILURE 02 · SIDE CHANNELS</p>
        <h3 class="feature-card-title">Timing & Size Leak Defense Logic</h3>
        <p class="feature-card-desc">12ms response = regex block, 420ms = LLM inference. Attackers reverse-engineer Blue's proprietary filter logic via timing differentials.</p>
        <div style="padding-top:0.75rem;border-top:1px solid var(--border-subtle);font-family:var(--font-mono);font-size:0.6875rem;color:var(--neon-emerald)">
          TriSeal Fix → 4096B deterministic padding + 250ms fixed-cadence + Leak Hunter CI
        </div>
      </div>
      <div class="feature-card blue reveal delay-300">
        <div class="feature-card-icon blue">🧠</div>
        <p class="feature-card-tag" style="color:var(--neon-blue)">FAILURE 03 · CONTAMINATION</p>
        <h3 class="feature-card-title">Model & KV-Cache Cross-Contamination</h3>
        <p class="feature-card-desc">Shared vLLM prefix caches and leftover session context mean scores reflect environmental artifacts, not true model safety.</p>
        <div style="padding-top:0.75rem;border-top:1px solid var(--border-subtle);font-family:var(--font-mono);font-size:0.6875rem;color:var(--neon-emerald)">
          TriSeal Fix → Session wipe + salted KV-cache + Twin-Run clean baseline
        </div>
      </div>
      <div class="feature-card violet reveal delay-400">
        <div class="feature-card-icon violet">📜</div>
        <p class="feature-card-tag" style="color:var(--neon-violet)">FAILURE 04 · NO PROVENANCE</p>
        <h3 class="feature-card-title">Findings Cannot Be Proven in Disputes</h3>
        <p class="feature-card-desc">Standard logs can be altered after test runs. Neither labs, vendors, nor regulators can independently verify that isolation held.</p>
        <div style="padding-top:0.75rem;border-top:1px solid var(--border-subtle);font-family:var(--font-mono);font-size:0.6875rem;color:var(--neon-emerald)">
          TriSeal Fix → SHA-256 hash chain + ed25519 Merkle checkpoints + Portable Certificate
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 8-STAGE PROTOCOL -->
<section class="section" id="protocol" style="background:var(--bg-base)">
  <div class="container">
    <div class="section-header reveal">
      <p class="section-tag">THE PROTOCOL</p>
      <h2 class="section-title">The 8-Stage TriSeal Protocol</h2>
      <p class="section-desc">End-to-end cryptographic workflow from contract declaration to certificate issuance.</p>
    </div>
    <div style="max-width:720px;margin:0 auto">
      <div class="protocol-steps" id="protocolSteps"></div>
    </div>
  </div>
</section>

<!-- ARCHITECTURE SECTION -->
<section class="section" id="architecture">
  <div class="container">
    <div class="section-header reveal">
      <p class="section-tag">SYSTEM DESIGN</p>
      <h2 class="section-title">High-Level Architecture & Security Boundaries</h2>
      <p class="section-desc">Click any node to inspect its specs, security properties, and API endpoints.</p>
    </div>
    <div class="reveal" style="max-width:900px;margin:0 auto">
      <div class="panel panel-glow-emerald" style="padding:1.5rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-subtle)">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="status-dot"></div>
            <span class="font-mono" style="font-size:0.75rem;font-weight:700">INTERACTIVE TOPOLOGY</span>
          </div>
          <span class="font-mono" style="font-size:0.6875rem;color:var(--text-dim)">Click any node to inspect</span>
        </div>
        <div id="archDiagram" style="text-align:center;padding:1rem 0;font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted)">
          <!-- Architecture nodes as interactive cards -->
          <div style="display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:1rem;align-items:start">
            <div style="display:flex;flex-direction:column;gap:0.75rem">
              <div class="arch-node panel" data-node="red" style="padding:1rem;border-color:var(--neon-rose);cursor:pointer;transition:all 0.2s">
                <div style="color:var(--neon-rose-bright);font-weight:700;font-size:0.8125rem">RED CELL</div>
                <div style="color:var(--text-dim);font-size:0.625rem;margin-top:4px">Attack · gVisor · seccomp<br>red_net · 10.10.1.0/24</div>
              </div>
              <div style="text-align:center;color:var(--neon-rose);font-size:0.625rem;font-weight:700">✖ BLOCKED ✖</div>
              <div class="arch-node panel" data-node="blue" style="padding:1rem;border-color:var(--neon-blue);cursor:pointer;transition:all 0.2s">
                <div style="color:var(--neon-blue-bright);font-weight:700;font-size:0.8125rem">BLUE CELL</div>
                <div style="color:var(--text-dim);font-size:0.625rem;margin-top:4px">Defense · gVisor · seccomp<br>blue_net · 10.10.2.0/24</div>
              </div>
            </div>
            <div>
              <div class="arch-node panel" data-node="airlock" style="padding:1.25rem;border-color:var(--neon-amber);cursor:pointer;transition:all 0.2s;min-height:220px">
                <div style="color:var(--neon-amber-bright);font-weight:700;font-size:1rem;margin-bottom:0.5rem">⛩ AIRLOCK</div>
                <div style="color:var(--neon-amber);font-size:0.625rem;margin-bottom:0.75rem">Dual-Homed · OPA · Macaroon</div>
                <div style="display:flex;flex-direction:column;gap:4px">
                  <div style="background:var(--bg-void);border:1px solid rgba(245,158,11,0.2);padding:5px 8px;border-radius:4px;font-size:0.625rem;color:var(--neon-amber-bright)">1. Authenticate</div>
                  <div style="background:var(--bg-void);border:1px solid rgba(245,158,11,0.2);padding:5px 8px;border-radius:4px;font-size:0.625rem;color:var(--neon-amber-bright)">2. Normalize</div>
                  <div style="background:var(--bg-void);border:1px solid rgba(245,158,11,0.2);padding:5px 8px;border-radius:4px;font-size:0.625rem;color:var(--neon-amber-bright)">3. Pad (4096B)</div>
                  <div style="background:var(--bg-void);border:1px solid var(--neon-amber);padding:5px 8px;border-radius:4px;font-size:0.625rem;color:var(--neon-amber-bright);font-weight:700">4. Pace (250ms)</div>
                </div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:0.75rem">
              <div class="arch-node panel" data-node="gateway" style="padding:1rem;border-color:var(--neon-emerald);cursor:pointer;transition:all 0.2s">
                <div style="color:var(--neon-emerald-bright);font-weight:700;font-size:0.8125rem">MODEL GATEWAY</div>
                <div style="color:var(--text-dim);font-size:0.625rem;margin-top:4px">Session wipe · KV-salt<br>Output sanitization</div>
              </div>
              <div class="arch-node panel" data-node="llm" style="padding:1rem;border-color:var(--neon-emerald);cursor:pointer;transition:all 0.2s">
                <div style="color:var(--neon-emerald-bright);font-weight:700;font-size:0.8125rem">🧠 LLM CELL</div>
                <div style="color:var(--text-dim);font-size:0.625rem;margin-top:4px">Ollama / vLLM<br>Qwen-2.5 · Llama 3B</div>
              </div>
              <div class="arch-node panel" data-node="certificate" style="padding:1rem;border-color:var(--neon-violet);cursor:pointer;transition:all 0.2s">
                <div style="color:var(--neon-violet-bright);font-weight:700;font-size:0.8125rem">📜 CERTIFICATE</div>
                <div style="color:var(--text-dim);font-size:0.625rem;margin-top:4px">ed25519 signed<br>Merkle proof · Portable</div>
              </div>
            </div>
          </div>
          <!-- Bottom: Seal Ledger -->
          <div class="arch-node panel" data-node="ledger" style="padding:1rem;border-color:var(--neon-violet);cursor:pointer;transition:all 0.2s;margin-top:1rem">
            <div style="color:var(--neon-violet-bright);font-weight:700;font-size:0.875rem">⛓ SEAL LEDGER — Tamper-Evident Proof Layer</div>
            <div style="color:var(--text-dim);font-size:0.625rem;margin-top:4px">SHA-256 hash chain · Signed Merkle checkpoints · ed25519 · SQLite / PostgreSQL</div>
          </div>
        </div>
        <!-- Node Inspector -->
        <div id="nodeInspector" class="panel-elevated" style="padding:1rem;margin-top:1rem;border-radius:var(--radius-md)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:0.5rem">
            <span id="inspBadge" class="badge badge-amber">AIRLOCK</span>
            <span id="inspRoute" class="font-mono" style="font-size:0.6875rem;color:var(--text-dim)">POST /relay, POST /commit</span>
          </div>
          <p id="inspDesc" style="font-size:0.8125rem;color:var(--text-secondary);line-height:1.6">
            The only dual-homed container bridging <code style="color:var(--neon-amber-bright)">red_net</code>, <code style="color:var(--neon-blue-bright)">blue_net</code>, and <code style="color:var(--neon-emerald-bright)">llm_net</code>. Enforces Macaroon tokens, OPA policy, metadata stripping, 4096B padding, and 250ms fixed-cadence release.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- MVPs: OPEN IN NEW TABS -->
<section class="section" id="mvps" style="background:var(--bg-base)">
  <div class="container">
    <div class="section-header reveal">
      <p class="section-tag">EXPLORE MVPs</p>
      <h2 class="section-title">Five Interactive MVPs — Each Opens in a New Tab</h2>
      <p class="section-desc">Click any card to launch the full interactive workspace in a dedicated browser tab.</p>
    </div>
    <div class="mvp-grid">
      
      <a href="/mvp-airlock.html" target="_blank" class="mvp-card reveal delay-100" style="border-top:2px solid var(--neon-amber)">
        <div class="mvp-card-header">
          <span class="mvp-card-number" style="color:var(--neon-amber)">01</span>
          <span class="mvp-card-badge badge-amber">TIER 1 · MVP</span>
        </div>
        <h3 class="mvp-card-title" style="color:var(--neon-amber-bright)">Sealed Cells & Airlock Relay</h3>
        <p class="mvp-card-desc">Bilateral commit-reveal, network breach blocking, fixed-cadence Airlock normalization, 4096B padding, and session-wiped LLM Gateway. Run 570-prompt benchmark suites.</p>
        <div class="mvp-card-footer">
          <div class="mvp-card-tech">
            <span class="mvp-card-tech-tag">gVisor</span>
            <span class="mvp-card-tech-tag">OPA</span>
            <span class="mvp-card-tech-tag">Macaroon</span>
            <span class="mvp-card-tech-tag">FastAPI</span>
          </div>
          <span class="mvp-card-arrow" style="color:var(--neon-amber)">→</span>
        </div>
      </a>

      <a href="/mvp-ledger.html" target="_blank" class="mvp-card reveal delay-200" style="border-top:2px solid var(--neon-violet)">
        <div class="mvp-card-header">
          <span class="mvp-card-number" style="color:var(--neon-violet)">02</span>
          <span class="mvp-card-badge badge-violet">TIER 1 · MVP</span>
        </div>
        <h3 class="mvp-card-title" style="color:var(--neon-violet-bright)">Seal Ledger & Certificate</h3>
        <p class="mvp-card-desc">SHA-256 hash-chained append-only ledger, interactive Merkle tree visualizer, ed25519-signed certificates, tamper detection, public verifier sandbox with QR proof.</p>
        <div class="mvp-card-footer">
          <div class="mvp-card-tech">
            <span class="mvp-card-tech-tag">SHA-256</span>
            <span class="mvp-card-tech-tag">Merkle</span>
            <span class="mvp-card-tech-tag">ed25519</span>
          </div>
          <span class="mvp-card-arrow" style="color:var(--neon-violet)">→</span>
        </div>
      </a>

      <a href="/conformance.html" target="_blank" class="mvp-card reveal delay-300" style="border-top:2px solid var(--neon-blue)">
        <div class="mvp-card-header">
          <span class="mvp-card-number" style="color:var(--neon-blue)">03</span>
          <span class="mvp-card-badge badge-blue">TIER 2</span>
        </div>
        <h3 class="mvp-card-title" style="color:var(--neon-blue-bright)">Conformance & Naked Mode</h3>
        <p class="mvp-card-desc">Live conformance checker verifying container state against the isolation contract. Compare Sealed vs Naked latency histograms. Inject drift to see detection.</p>
        <div class="mvp-card-footer">
          <div class="mvp-card-tech">
            <span class="mvp-card-tech-tag">runsc</span>
            <span class="mvp-card-tech-tag">seccomp</span>
            <span class="mvp-card-tech-tag">cgroup v2</span>
          </div>
          <span class="mvp-card-arrow" style="color:var(--neon-blue)">→</span>
        </div>
      </a>

      <a href="/leakhunter.html" target="_blank" class="mvp-card reveal delay-400" style="border-top:2px solid var(--neon-rose)">
        <div class="mvp-card-header">
          <span class="mvp-card-number" style="color:var(--neon-rose)">04</span>
          <span class="mvp-card-badge badge-rose">TIER 2</span>
        </div>
        <h3 class="mvp-card-title" style="color:var(--neon-rose-bright)">Leak Hunter & Twin-Run</h3>
        <p class="mvp-card-desc">N=1000 statistical distinguishability trials with 95% confidence intervals. Twin-Run baseline divergence testing. Empirical proof, never "zero leakage" claims.</p>
        <div class="mvp-card-footer">
          <div class="mvp-card-tech">
            <span class="mvp-card-tech-tag">NumPy</span>
            <span class="mvp-card-tech-tag">SciPy</span>
            <span class="mvp-card-tech-tag">Bootstrap CI</span>
          </div>
          <span class="mvp-card-arrow" style="color:var(--neon-rose)">→</span>
        </div>
      </a>

      <a href="/deploy.html" target="_blank" class="mvp-card reveal delay-500" style="border-top:2px solid var(--neon-cyan)">
        <div class="mvp-card-header">
          <span class="mvp-card-number" style="color:var(--neon-cyan)">05</span>
          <span class="mvp-card-badge badge-cyan">DEVOPS</span>
        </div>
        <h3 class="mvp-card-title" style="color:var(--neon-cyan-bright)">CLI, Docker & Vercel Deploy</h3>
        <p class="mvp-card-desc">Docker Compose topology, interactive CLI terminal, CI/CD release gate pipeline (6-step verification), SIEM export for Splunk/Elastic, K8s manifests.</p>
        <div class="mvp-card-footer">
          <div class="mvp-card-tech">
            <span class="mvp-card-tech-tag">Docker</span>
            <span class="mvp-card-tech-tag">Vercel</span>
            <span class="mvp-card-tech-tag">K8s</span>
            <span class="mvp-card-tech-tag">Cilium</span>
          </div>
          <span class="mvp-card-arrow" style="color:var(--neon-cyan)">→</span>
        </div>
      </a>
    </div>
  </div>
</section>

<!-- STATS -->
<section class="section" id="stats">
  <div class="container">
    <div class="stats-grid reveal">
      <div class="stat-card panel-glow-emerald">
        <div class="stat-value" style="color:var(--neon-emerald-bright)" id="statCells">0</div>
        <div class="stat-label">Isolated Cells</div>
      </div>
      <div class="stat-card panel-glow-amber">
        <div class="stat-value" style="color:var(--neon-amber-bright)" id="statNetworks">0</div>
        <div class="stat-label">Segmented Networks</div>
      </div>
      <div class="stat-card panel-glow-violet">
        <div class="stat-value" style="color:var(--neon-violet-bright)" id="statBenchmarks">0</div>
        <div class="stat-label">Attack Benchmarks</div>
      </div>
      <div class="stat-card panel-glow-cyan">
        <div class="stat-value" style="color:var(--neon-cyan-bright)" id="statEndpoints">0</div>
        <div class="stat-label">API Endpoints</div>
      </div>
      <div class="stat-card panel-glow-rose">
        <div class="stat-value" style="color:var(--neon-rose-bright)" id="statPrompts">0</div>
        <div class="stat-label">Test Prompts</div>
      </div>
    </div>
  </div>
</section>

<!-- TEAM -->
<section class="section" id="team" style="background:var(--bg-base)">
  <div class="container">
    <div class="section-header reveal">
      <p class="section-tag">TEAM PINNACLE</p>
      <h2 class="section-title">Engineering Ownership</h2>
      <p class="section-desc">Hack in Hills PS-4 · Built with verified isolation from the ground up.</p>
    </div>
    <div class="team-grid">
      <div class="team-card reveal delay-100">
        <div class="team-card-name">Jyotasana</div>
        <div class="team-card-role" style="color:var(--neon-emerald)">A · Infrastructure & Isolation</div>
        <p class="team-card-desc">Docker Compose separate networks, rootless/gVisor/seccomp, Red→Blue block & log, Conformance Checker, canary honeytokens, naked-mode toggle.</p>
      </div>
      <div class="team-card reveal delay-200">
        <div class="team-card-name">Arpita Matta</div>
        <div class="team-card-role" style="color:var(--neon-amber)">B · Core Backend & Airlock</div>
        <p class="team-card-desc">Airlock pipeline (token, OPA, normalize, pad, pace), bilateral commit-reveal, Model Gateway with session wipe, Ollama + LLM integration.</p>
      </div>
      <div class="team-card reveal delay-300">
        <div class="team-card-name">Anand Minejes</div>
        <div class="team-card-role" style="color:var(--neon-violet)">C · Evidence Layer & Frontend</div>
        <p class="team-card-desc">Hash-chained Seal Ledger, Merkle checkpoints, ed25519 signing, verify CLI, Certificate engine, Leak Hunter, Twin-Run, full dashboard.</p>
      </div>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="section" id="cta">
  <div class="container" style="text-align:center">
    <div class="reveal">
      <p class="section-tag">GET STARTED</p>
      <h2 class="section-title">Run TriSeal in 30 Seconds</h2>
      <div class="panel" style="max-width:600px;margin:2rem auto;padding:1.5rem;text-align:left">
        <pre class="font-mono" style="font-size:0.8125rem;color:var(--text-secondary);line-height:1.8"><span style="color:var(--text-dim)"># Clone & launch the sealed evaluation sandbox</span>
<span style="color:var(--neon-emerald)">$</span> git clone https://github.com/Anand2k29/TriSeal.git
<span style="color:var(--neon-emerald)">$</span> cd TriSeal
<span style="color:var(--neon-emerald)">$</span> docker compose up

<span style="color:var(--text-dim)"># Verify the certificate (tamper = exit 1)</span>
<span style="color:var(--neon-emerald)">$</span> python3 cli/triseal_verify.py --self-test
<span style="color:var(--neon-emerald-bright)">✔ Verdict: TRISEAL CERTIFICATE & SEAL LEDGER VALID (Exit Code 0)</span></pre>
      </div>
      <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
        <a href="https://github.com/Anand2k29/TriSeal" target="_blank" rel="noopener" class="btn btn-primary">View on GitHub ↗</a>
        <a href="/mvp-airlock.html" target="_blank" class="btn btn-secondary">Launch MVP 01: Airlock →</a>
      </div>
    </div>
  </div>
</section>

${renderFooter()}
`;

// ─── Boot Sequence ─────────────────────────────────────────
// Typing animation for hero tag
const heroTag = document.getElementById('heroTag');
if (heroTag) {
  typeText(heroTag, 'SEALED MULTI-PARTY AI SAFETY EVALUATION & VERIFICATION ENGINE', 30);
}

// Particles
const heroSection = document.getElementById('hero');
if (heroSection) createParticles(heroSection, 25);

// Scroll reveal
initScrollReveal();

// Protocol steps
const protocolData = [
  { num: '01', title: 'Contract', desc: 'Declare allowed topologies, syscalls & resource caps in isolation-contract.yaml. Every invariant is checked before containers start.' },
  { num: '02', title: 'Seal', desc: 'Launch Red, Blue, and LLM cells in rootless gVisor containers with cap_drop:ALL, read-only rootfs, and separate Docker networks.' },
  { num: '03', title: 'Bind', desc: 'Red and Blue independently commit SHA-256 hashes of their configs to the Airlock before seeing any test data.' },
  { num: '04', title: 'Relay', desc: 'Airlock authenticates (Macaroon), normalizes (strip headers), pads (4096B), and paces (250ms tick) every payload.' },
  { num: '05', title: 'Record', desc: 'Every event is SHA-256 hash-chained into the append-only Seal Ledger with Merkle checkpoints.' },
  { num: '06', title: 'Hunt', desc: 'Leak Hunter runs N=1000 distinguishability trials. Result: 50.6% accuracy (95% CI: 47.5–53.7%). Indistinguishable from chance.' },
  { num: '07', title: 'Twin-Run', desc: 'Same evaluation on a clean model instance. KL-divergence: 0.0041 (threshold: 0.020). Zero KV-cache contamination.' },
  { num: '08', title: 'Certify', desc: 'Merkle root signed with ed25519. Portable TriSeal Certificate issued with all proofs embedded for offline verification.' },
];

const stepsEl = document.getElementById('protocolSteps');
if (stepsEl) {
  stepsEl.innerHTML = protocolData.map((s, i) => `
    <div class="protocol-step reveal delay-${(i % 4 + 1) * 100}">
      <div class="protocol-step-number">
        <div class="protocol-step-dot" style="border-color:var(--neon-emerald);color:var(--neon-emerald)">${s.num}</div>
        ${i < protocolData.length - 1 ? '<div class="protocol-step-line"></div>' : ''}
      </div>
      <div class="protocol-step-content">
        <h3 class="protocol-step-title">${s.title}</h3>
        <p class="protocol-step-desc">${s.desc}</p>
      </div>
    </div>
  `).join('');
  // Re-init reveal for dynamically added elements
  initScrollReveal();
}

// Architecture node inspector
const nodeData = {
  red: { badge: 'badge-rose', label: 'RED CELL', route: 'red_net · 10.10.1.0/24', desc: 'Adversarial attack cell running JailbreakBench, AdvBench, HarmBench, ToxiGen, Gandalf, and HH-RLHF payloads. Rootless gVisor container with seccomp allowlist, cap_drop:ALL, read-only rootfs. Isolated on red_net — zero direct path to Blue or LLM.' },
  blue: { badge: 'badge-blue', label: 'BLUE CELL', route: 'blue_net · 10.10.2.0/24', desc: 'Defense/guardrail cell running Llama-Guard-3, regex filters, perplexity thresholds, and constitutional output filters. Sees only Airlock-normalized traffic — never raw Red headers or timing.' },
  airlock: { badge: 'badge-amber', label: 'AIRLOCK', route: 'POST /relay · POST /commit', desc: 'The only dual-homed container bridging red_net, blue_net, and llm_net. Enforces Macaroon tokens, OPA policy (airlock.rego), metadata stripping, 4096B deterministic padding, and 250ms fixed-cadence release.' },
  gateway: { badge: 'badge-emerald', label: 'MODEL GATEWAY', route: 'llm_net · Session Wipe', desc: 'Per-session context wipe + tenant-scoped KV-cache salting. Prevents leftover prompt context from contaminating subsequent evaluations. Output sanitization removes model metadata.' },
  llm: { badge: 'badge-emerald', label: 'LLM CELL', route: 'Ollama / vLLM', desc: 'Client model under test. Supports Qwen-2.5-3B-Instruct (Ollama) and Llama-3.2-3B-Instruct (vLLM). Isolated on llm_net, accessible only through the Model Gateway.' },
  certificate: { badge: 'badge-violet', label: 'CERTIFICATE', route: 'GET /certificate', desc: 'Portable JSON proof containing: Merkle root, ed25519 signature, bilateral commit-reveal hashes, Leak Hunter 95% CI bounds, Twin-Run KL-divergence, and conformance status.' },
  ledger: { badge: 'badge-violet', label: 'SEAL LEDGER', route: 'POST /verify · Append-Only', desc: 'Tamper-evident proof layer. Every event is SHA-256 hash-chained (H_i = SHA256(H_{i-1}||seq||cell||event||detail)). Merkle checkpoints are ed25519-signed at intervals. SQLite (demo) / PostgreSQL WAL (production).' },
};

document.querySelectorAll('.arch-node').forEach(node => {
  node.addEventListener('click', () => {
    const key = node.dataset.node;
    const d = nodeData[key];
    if (!d) return;
    document.getElementById('inspBadge').className = 'badge ' + d.badge;
    document.getElementById('inspBadge').textContent = d.label;
    document.getElementById('inspRoute').textContent = d.route;
    document.getElementById('inspDesc').textContent = d.desc;
    // Glow the clicked node
    document.querySelectorAll('.arch-node').forEach(n => n.style.boxShadow = 'none');
    node.style.boxShadow = '0 0 20px rgba(16,185,129,0.2)';
  });
});

// Animate counters when stats section is visible
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(document.getElementById('statCells'), 3, 1500);
      animateCounter(document.getElementById('statNetworks'), 4, 1500);
      animateCounter(document.getElementById('statBenchmarks'), 6, 1800);
      animateCounter(document.getElementById('statEndpoints'), 7, 1800);
      animateCounter(document.getElementById('statPrompts'), 570, 2200);
      statsObserver.disconnect();
    }
  });
}, { threshold: 0.3 });
const statsSection = document.getElementById('stats');
if (statsSection) statsObserver.observe(statsSection);

// Responsive hero grid
const heroGrid = document.querySelector('.hero .container');
if (heroGrid && window.innerWidth < 768) {
  heroGrid.style.gridTemplateColumns = '1fr';
}
