# TriSeal (PS-4) — Sealed Multi-Party AI Safety Evaluation & Verification Engine

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 220" width="100%" height="220">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#07080A"/>
      <stop offset="50%" stop-color="#0E131B"/>
      <stop offset="100%" stop-color="#07080A"/>
    </linearGradient>
    <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
      <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#1E2636" stroke-width="0.8"/>
    </pattern>
  </defs>
  <rect width="960" height="220" fill="url(#bgGrad)" rx="6" stroke="#232936" stroke-width="2"/>
  <rect width="960" height="220" fill="url(#grid)" rx="6"/>
  
  <!-- Animated Scanning Security Beam -->
  <line x1="0" y1="0" x2="960" y2="0" stroke="#10B981" stroke-width="1.5" stroke-opacity="0.45">
    <animate attributeName="y1" values="0;220;0" dur="7s" repeatCount="indefinite"/>
    <animate attributeName="y2" values="0;220;0" dur="7s" repeatCount="indefinite"/>
  </line>

  <!-- Status Badge -->
  <rect x="36" y="28" width="330" height="24" rx="3" fill="#09261E" stroke="#10B981" stroke-width="1"/>
  <circle cx="50" cy="40" r="4" fill="#10B981">
    <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite"/>
  </circle>
  <text x="62" y="44" fill="#34D399" font-family="monospace" font-size="11" font-weight="bold">PS-4 // SEALED AI EVALUATION ENGINE · v2.4.0</text>

  <!-- Title & Tagline -->
  <text x="36" y="92" fill="#F8FAFC" font-family="sans-serif" font-size="34" font-weight="800" letter-spacing="-0.5">TRISEAL // Team Pinnacle</text>
  <text x="36" y="124" fill="#10B981" font-family="monospace" font-size="16" font-weight="bold">"Three parties. Three seals. One finding you can prove."</text>
  <text x="36" y="154" fill="#94A3B8" font-family="sans-serif" font-size="13">Rootless gVisor Cells · Dual-Homed Fixed-Cadence Airlock · SHA-256 Merkle Seal Ledger · Leak Hunter 95% CI</text>

  <!-- Right Side Animated Telemetry Badges -->
  <g transform="translate(650, 32)">
    <rect x="0" y="0" width="274" height="44" rx="4" fill="#101319" stroke="#F43F5E" stroke-width="1.2"/>
    <text x="14" y="18" fill="#FB7185" font-family="monospace" font-size="10" font-weight="bold">RED → BLUE DIRECT PATH</text>
    <text x="14" y="34" fill="#F8FAFC" font-family="monospace" font-size="12" font-weight="bold">✖ BLOCKED &amp; LOGGED (nftables)</text>

    <rect x="0" y="56" width="274" height="44" rx="4" fill="#101319" stroke="#F59E0B" stroke-width="1.2"/>
    <text x="14" y="74" fill="#FBBF24" font-family="monospace" font-size="10" font-weight="bold">AIRLOCK TRAFFIC SHAPING</text>
    <text x="14" y="90" fill="#F8FAFC" font-family="monospace" font-size="12" font-weight="bold">4096B PAD · 250.0ms PACED</text>

    <rect x="0" y="112" width="274" height="44" rx="4" fill="#101319" stroke="#A855F7" stroke-width="1.2"/>
    <text x="14" y="130" fill="#C084FC" font-family="monospace" font-size="10" font-weight="bold">LEAK HUNTER EMPIRICAL BOUND</text>
    <text x="14" y="146" fill="#34D399" font-family="monospace" font-size="12" font-weight="bold">50.6% vs 50% (95% CI 47–54%)</text>
  </g>
</svg>

> **Tagline:** *"Three parties. Three seals. One finding you can prove."*
> **Team Pinnacle (Hack In Hills — PS-4 Submission):** **Jyotasana** (Infra & Isolation) · **Arpita Matta** (Core Backend) · **Anand Minejes** (Evidence & Frontend)

## 1. Executive Summary & Problem Statement

In contemporary AI safety evaluations, the **Red Team** (attackers), **Blue Team** (defenders), and the **Client's LLM** share a single Docker-based cloud sandbox. However, the validity of every safety finding depends entirely on strict isolation between them—and today that evidence is merely *"trust us."*

1. **Red payloads can be seen by Blue:** When containers share networks or staging mounts, the defense adapts dynamically to attacks it should not have seen, making guardrail efficacy look artificially stronger than it really is (e.g., inflating block rates from `66%` to `96%`).
2. **Blue logic can be inferred by Red:** Response timing differentials (`14ms` filter block vs. `410ms` LLM generation), packet lengths, shared files, or DNS/ICMP side channels let attackers reverse-engineer proprietary defense logic.
3. **The LLM gets contaminated:** Shared multi-tenant KV-caches ([NDSS 2025](https://www.ndss-symposium.org)), leftover session context, and noisy-neighbor CPU/IO contention mean evaluation scores reflect environmental artifacts rather than the model itself.
4. **Findings cannot be proven:** Standard container logs can be edited after the fact, leaving no tamper-evident audit trail to reconstruct or defend a safety claim under [EU AI Act](https://artificialintelligenceact.eu/), [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework), or ISO/IEC 42001 scrutiny.

**TriSeal** solves this in pure open-source software (`docker compose up` on any Linux host or laptop, with zero proprietary SGX/SEV hardware required) by running Red, Blue, and the Model simultaneously in **sealed rootless gVisor cells**, routing all traffic through a **normalizing, 4096-byte padded, 250ms fixed-cadence Airlock**, and issuing a cryptographically signed **TriSeal Certificate** verifiable by any third party.

## 2. Animated Architecture & Zero-Trust Data Flow

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 310" width="100%" height="310">
  <rect width="960" height="310" fill="#07080A" rx="6" stroke="#232936" stroke-width="2"/>
  
  <!-- Red Cell -->
  <rect x="24" y="30" width="180" height="90" rx="4" fill="#220D14" stroke="#F43F5E" stroke-width="1.8"/>
  <text x="38" y="56" fill="#FDA4AF" font-family="monospace" font-size="13" font-weight="bold">1. RED CELL</text>
  <text x="38" y="76" fill="#F43F5E" font-family="monospace" font-size="10">JailbreakBench / AdvBench</text>
  <text x="38" y="96" fill="#CBD5E1" font-family="monospace" font-size="10">rootless · gVisor · red_net</text>

  <!-- Direct Breach Attempt Blocked -->
  <line x1="114" y1="120" x2="114" y2="190" stroke="#F43F5E" stroke-width="2" stroke-dasharray="4 4"/>
  <rect x="44" y="142" width="140" height="24" rx="3" fill="#281117" stroke="#F43F5E"/>
  <text x="54" y="158" fill="#FDA4AF" font-family="monospace" font-size="10" font-weight="bold">✖ DIRECT PATH DROPPED</text>

  <!-- Blue Cell -->
  <rect x="24" y="190" width="180" height="90" rx="4" fill="#0D192B" stroke="#3B82F6" stroke-width="1.8"/>
  <text x="38" y="216" fill="#93C5FD" font-family="monospace" font-size="13" font-weight="bold">2. BLUE CELL</text>
  <text x="38" y="236" fill="#60A5FA" font-family="monospace" font-size="10">Normalized Traffic Filter</text>
  <text x="38" y="256" fill="#CBD5E1" font-family="monospace" font-size="10">rootless · gVisor · blue_net</text>

  <!-- Dual-Homed Airlock -->
  <rect x="270" y="30" width="210" height="190" rx="4" fill="#1C160B" stroke="#F59E0B" stroke-width="2"/>
  <text x="290" y="56" fill="#FCD34D" font-family="monospace" font-size="14" font-weight="bold">3. DUAL-HOMED AIRLOCK</text>
  <text x="290" y="76" fill="#F59E0B" font-family="monospace" font-size="10">• Macaroon + OPA Policy Check</text>
  <text x="290" y="96" fill="#F59E0B" font-family="monospace" font-size="10">• Strip Identifying Headers</text>
  <text x="290" y="116" fill="#F59E0B" font-family="monospace" font-size="10">• Deterministic 4096B Pad</text>
  <text x="290" y="136" fill="#F59E0B" font-family="monospace" font-size="10">• Fixed-Cadence 250ms Release</text>
  <rect x="288" y="156" width="174" height="44" rx="3" fill="#0B0D11" stroke="#78350F"/>
  <text x="300" y="176" fill="#34D399" font-family="monospace" font-size="10" font-weight="bold">Bilateral Commit-Reveal</text>
  <text x="300" y="191" fill="#94A3B8" font-family="monospace" font-size="9">SHA-256 Pre-Test Binding</text>

  <!-- Model Gateway & LLM Cell -->
  <rect x="546" y="30" width="195" height="190" rx="4" fill="#09221A" stroke="#10B981" stroke-width="1.8"/>
  <text x="562" y="56" fill="#6EE7B7" font-family="monospace" font-size="13" font-weight="bold">4. MODEL GATEWAY</text>
  <text x="562" y="78" fill="#34D399" font-family="monospace" font-size="10">• Per-Session Context Wipe</text>
  <text x="562" y="98" fill="#34D399" font-family="monospace" font-size="10">• Salted KV-Cache Scoping</text>
  <text x="562" y="118" fill="#34D399" font-family="monospace" font-size="10">• Egress Output Sanitizer</text>
  <rect x="562" y="138" width="163" height="64" rx="3" fill="#0B0D11" stroke="#065F46"/>
  <text x="574" y="160" fill="#A7F3D0" font-family="monospace" font-size="11" font-weight="bold">🧠 LLM CELL (llm_net)</text>
  <text x="574" y="178" fill="#94A3B8" font-family="monospace" font-size="9.5">Ollama / vLLM (Qwen/Llama)</text>
  <text x="574" y="192" fill="#94A3B8" font-family="monospace" font-size="9.5">Twin-Run Baseline Check</text>

  <!-- Portable TriSeal Certificate -->
  <rect x="795" y="30" width="142" height="190" rx="4" fill="#171326" stroke="#A855F7" stroke-width="1.8"/>
  <text x="812" y="58" fill="#E9D5FF" font-family="monospace" font-size="12" font-weight="bold">5. CERTIFICATE</text>
  <text x="812" y="82" fill="#C084FC" font-family="monospace" font-size="10">• ed25519 Signed</text>
  <text x="812" y="102" fill="#C084FC" font-family="monospace" font-size="10">• Merkle Root</text>
  <text x="812" y="122" fill="#C084FC" font-family="monospace" font-size="10">• Leak 95% CI</text>
  <text x="812" y="142" fill="#C084FC" font-family="monospace" font-size="10">• Twin-Run Proof</text>
  <rect x="810" y="166" width="112" height="34" rx="3" fill="#2E1065" stroke="#A855F7"/>
  <text x="820" y="187" fill="#F3E8FF" font-family="monospace" font-size="10" font-weight="bold">PUBLIC VERIFY</text>

  <!-- Bottom Seal Ledger Bar -->
  <rect x="270" y="242" width="667" height="44" rx="4" fill="#1A1423" stroke="#A855F7" stroke-width="1.5"/>
  <text x="290" y="268" fill="#E9D5FF" font-family="monospace" font-size="12" font-weight="bold">⛓ HASH-CHAINED SEAL LEDGER (SHA-256 + Signed Merkle Checkpoints + One-Way Falco eBPF Diode)</text>

  <!-- Animated Packet Dots Flowing Across Airlock -->
  <line x1="204" y1="75" x2="270" y2="75" stroke="#F59E0B" stroke-width="2" stroke-dasharray="5 5">
    <animate attributeName="stroke-dashoffset" values="20;0" dur="1s" repeatCount="indefinite"/>
  </line>
  <line x1="270" y1="210" x2="204" y2="210" stroke="#3B82F6" stroke-width="2" stroke-dasharray="5 5">
    <animate attributeName="stroke-dashoffset" values="20;0" dur="1s" repeatCount="indefinite"/>
  </line>
  <line x1="480" y1="120" x2="546" y2="120" stroke="#10B981" stroke-width="2" stroke-dasharray="5 5">
    <animate attributeName="stroke-dashoffset" values="20;0" dur="1s" repeatCount="indefinite"/>
  </line>
  <line x1="741" y1="120" x2="795" y2="120" stroke="#A855F7" stroke-width="2" stroke-dasharray="5 5">
    <animate attributeName="stroke-dashoffset" values="20;0" dur="1s" repeatCount="indefinite"/>
  </line>
</svg>

### The 8-Stage TriSeal Protocol

| Stage | Protocol Step | Technical Mechanism | FastAPI Endpoint / Tooling |
| :--- | :--- | :--- | :--- |
| **01** | **Contract** | An explicit `isolation-contract.yaml` declares allowed network flows, syscalls, and cgroup v2 caps. | `GET /api/contract/check` |
| **02** | **Seal** | Each party runs in a rootless [gVisor (`runsc`)](https://gvisor.dev) container; live state is verified against the contract. | Docker + `runsc` + `seccomp` |
| **03** | **Bind** | Red commits a SHA-256 hash of its salted payload set; Blue commits a SHA-256 hash of its defense config. | `POST /api/commit` |
| **04** | **Relay** | Traffic crosses the Dual-Homed Airlock: Macaroon token check, [OPA](https://www.openpolicyagent.org) policy, strip headers, pad to `4096B`, pace at `250ms`. | `POST /api/relay` → `/api/defend` |
| **05** | **Record** | Every event is appended to a SHA-256 hash-chained ledger with `ed25519`-signed Merkle checkpoints ([RFC 6962](https://datatracker.ietf.org/doc/html/rfc6962)). | `POST /api/ledger/append` |
| **06** | **Hunt** | **Leak Hunter** probes timing, volume, cache, and DNS/ICMP channels, reporting accuracy with a 95% bootstrap CI. | `POST /api/leakhunt` (SciPy) |
| **07** | **Twin-Run** | Attacks replay in a solo clean-room baseline container; KL-divergence flags any cross-session contamination. | `POST /api/twinrun` |
| **08** | **Certify** | Reveals are checked against pre-test commitments and bundled into a portable, `ed25519`-signed **TriSeal Certificate**. | `GET /api/certificate`, `POST /api/verify` |

## 3. Complete PS-4 Theme Alignment (All 7 Verticals & 6 Objectives)

| PS-4 Security Vertical | TriSeal Engineering Implementation | Verification Method |
| :--- | :--- | :--- |
| **1. Container & Sandbox Isolation** | Rootless containers, [gVisor (`runsc`)](https://gvisor.dev) (fallback: hardened `runc`), `seccomp` allowlists, `cap_drop: [ALL]`, `read_only` rootfs, cgroup v2 | Runtime Conformance Checker (`GET /api/contract/check`) |
| **2. Network Segmentation** | One internal bridge network per cell (`red_net`, `blue_net`, `llm_net`), default-deny `nftables` / [Cilium](https://cilium.io); only Airlock is dual-homed | Deterministic Red→Blue socket breach test (`DROP` + log) |
| **3. Access Control & Secrets** | Short-lived Macaroon capability tokens scoped per cell and action, [Open Policy Agent (OPA)](https://www.openpolicyagent.org), HashiCorp Vault / SOPS | Airlock policy gate (`policy/airlock.rego`) |
| **4. Audit Trails & Provenance** | Append-only SHA-256 hash chain, `ed25519`-signed Merkle tree checkpoints, bilateral commit-reveal, offline public verifier | `python3 cli/triseal_verify.py --cert cert.json` |
| **5. Resource Governance & Fairness** | cgroup v2 CPU/memory/IO limits, CPU pinning, `250ms` fixed-cadence Airlock release, host noise-floor calibration (`0.42ms σ`) | Validity Score & Cadence jitter monitor |
| **6. LLM-Specific Threats** | Model Gateway per-session context wipe, tenant-scoped KV-cache salting/flush ([vLLM](https://docs.vllm.ai) / Ollama), output sanitization, Twin-Run | Twin-Run Differential Check (`KL-Div < 0.020`) |
| **7. Observability & Anomaly Detection** | [Falco](https://falco.org) eBPF syscall/network anomaly detection, one-way data diode to dashboard, armed **Canary Honeytokens** in every vault | Canary tripwire & one-way diode stream |

## 4. MVP Scope & Tiered Architecture

- **Tier 1 — Working Core MVP (Implemented & Interactive in Tabs 01 & 02):**
  1. Multi-network `docker-compose.yml` isolating `red_cell`, `blue_cell`, `llm_cell`, `airlock`, and `seal_ledger`.
  2. Deterministic Red-to-Blue direct connection attempt that fails at the network layer and is logged to the ledger.
  3. Airlock relay with Macaroon token check, OPA policy, `4096B` padding, `250ms` fixed-cadence release, and bilateral commit-reveal using [JailbreakBench](https://jailbreakbench.github.io) and [AdvBench](https://github.com/llm-attacks/llm-attacks) subsets.
  4. Local LLM cell (`Qwen-2.5-3B` / `Llama-3.2-3B` via Ollama/vLLM) behind a Model Gateway enforcing per-session context wipe.
  5. SHA-256 hash-chained Seal Ledger and `triseal_verify.py` CLI that detects single-byte historical tampering.
  6. Portable **TriSeal Certificate** generation and public signature/Merkle verification.
- **Tier 2 — Differentiators (Implemented & Interactive in Tabs 03 & 04):**
  7. Declarative `isolation-contract.yaml` and live Runtime Conformance Checker with container drift injection testing.
  8. **Isolation ON ("Sealed Mode") vs. Isolation OFF ("Naked Mode")** experimental benchmark comparison.
  9. **Leak Hunter** empirical distinguishability suite reporting `50.6% accuracy vs 50.0% chance (95% CI: 47.5%–53.7%, N=1000)`.
  10. **Twin-Run Differential Check** replaying identical prompts in a clean solo baseline to detect contamination.
  11. Armed **Canary Honeytokens** in every vault and live 5×5 **Isolation Matrix** dashboard.
- **Tier 3 — Enterprise Hardening (Implemented in Tab 05 & Repo):**
  12. Fixed-cadence traffic shaping, noise-floor calibration (`0.42ms σ`), Falco eBPF rules, signed Merkle checkpoints, and CI/CD release gate (`triseal ci-gate --strict`).

## 5. Quick Start: Deploy to Vercel or Run Locally with Docker Compose

### Option A: One-Click / CLI Deployment to Vercel

This repository is pre-configured with `vercel.json`, `index.html`, and the Python FastAPI serverless backend (`api/index.py`).

```bash
# 1. Install Vercel CLI (if not already installed)
npm i -g vercel

# 2. Deploy preview or production build directly
vercel --prod
```

### Option B: Local Full-Stack Execution (`docker compose up`)

```bash
# 1. Launch all 3 sealed cells, Dual-Homed Airlock, and Seal Ledger
docker compose up --build -d

# 2. Verify live container conformance against isolation-contract.yaml
python3 cli/triseal_verify.py --check-contract

# 3. Verify a generated TriSeal Certificate & test tamper detection
python3 cli/triseal_verify.py --cert ./triseal_certificate_ps4.json --simulate-tamper
```

## 6. Honest Threat Model & Residual Risk Matrix

| Protects Against (Verified Invariants) | Does Not Protect Against / Where Guarantees Fail |
| :--- | :--- |
| Cross-team payload and defense visibility via container network, filesystem, and direct API paths | Hardware microarchitectural side channels (Spectre/Meltdown-class) on shared physical CPU cores |
| Cross-session LLM contamination from shared KV-cache prefixes or leftover context | Compromised host Linux kernel, container-runtime escape, or engines without native cache isolation |
| Post-hoc log tampering, cherry-picking, or defense config alteration after a test run | Malicious cloud infrastructure operator or compromise of the minimal Trusted Computing Base (Airlock/Ledger) |
| Timing, packet volume, resource, and DNS/ICMP covert channels ([arXiv:2409.20002](https://arxiv.org/abs/2409.20002)) | Sub-noise-floor covert channels operating below Leak Hunter's measured statistical threshold |

## 7. Team Pinnacle — Engineering Ownership

| Member | Role | Core Deliverables |
| :--- | :--- | :--- |
| **Jyotasana** | **A: Infra & Isolation** | `docker-compose.yml` with separate internal bridge networks, rootless/gVisor/seccomp profiles, Red-to-Blue block & log, Conformance Checker, Canary Honeytokens, Naked-Mode toggle |
| **Arpita Matta** | **B: Core Backend** | Dual-Homed Airlock (Macaroon token check, OPA policy, normalize, `4096B` pad, `250ms` fixed-cadence release), bilateral commit-reveal, Model Gateway with session wipe, Ollama/vLLM integration |
| **Anand Minejes** | **C: Evidence & Frontend** | SHA-256 hash-chained Seal Ledger, signed Merkle checkpoints (`ed25519`), `triseal_verify.py` CLI tamper detector, TriSeal Certificate, Leak Hunter, Twin-Run, and Isolation Matrix UI |

## 8. Animated Merkle Proof & CI/CD Release Gate Architecture (`Tab 06`)

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 210" width="100%" height="210">
  <rect width="960" height="210" fill="#07080A" rx="6" stroke="#232936" stroke-width="2"/>
  
  <!-- Left: Merkle Root Checkpoint -->
  <rect x="28" y="34" width="250" height="142" rx="4" fill="#171326" stroke="#A855F7" stroke-width="1.8"/>
  <text x="44" y="62" fill="#E9D5FF" font-family="monospace" font-size="13" font-weight="bold">1. MERKLE SEAL LEDGER</text>
  <text x="44" y="86" fill="#C084FC" font-family="monospace" font-size="10.5">• SHA-256 Event Chain</text>
  <text x="44" y="106" fill="#C084FC" font-family="monospace" font-size="10.5">• Bilateral Reveals Matched</text>
  <text x="44" y="126" fill="#C084FC" font-family="monospace" font-size="10.5">• ed25519 Signed Checkpoint</text>
  <text x="44" y="152" fill="#34D399" font-family="monospace" font-size="10.5" font-weight="bold">✔ QR + Offline Public Verify</text>

  <!-- Center: CI/CD Release Gate -->
  <rect x="355" y="34" width="250" height="142" rx="4" fill="#09221A" stroke="#10B981" stroke-width="1.8"/>
  <text x="371" y="62" fill="#6EE7B7" font-family="monospace" font-size="13" font-weight="bold">2. CI/CD RELEASE GATE</text>
  <text x="371" y="86" fill="#34D399" font-family="monospace" font-size="10.5">• GitHub Actions / GitLab CI</text>
  <text x="371" y="106" fill="#34D399" font-family="monospace" font-size="10.5">• Leak 95% CI &lt; 55% Bound</text>
  <text x="371" y="126" fill="#34D399" font-family="monospace" font-size="10.5">• Twin-Run KL-Div &lt; 0.020</text>
  <text x="371" y="152" fill="#FBBF24" font-family="monospace" font-size="10.5" font-weight="bold">⚡ Blocks Tampered Releases</text>

  <!-- Right: Enterprise SIEM & K8s MicroVMs -->
  <rect x="682" y="34" width="250" height="142" rx="4" fill="#0D192B" stroke="#3B82F6" stroke-width="1.8"/>
  <text x="698" y="62" fill="#93C5FD" font-family="monospace" font-size="13" font-weight="bold">3. SIEM &amp; K8S MICROVMS</text>
  <text x="698" y="86" fill="#60A5FA" font-family="monospace" font-size="10.5">• Splunk HEC / Elastic ECS</text>
  <text x="698" y="106" fill="#60A5FA" font-family="monospace" font-size="10.5">• Kata / Firecracker microVMs</text>
  <text x="698" y="126" fill="#60A5FA" font-family="monospace" font-size="10.5">• Cilium Zero-Trust L7 Policy</text>
  <text x="698" y="152" fill="#38BDF8" font-family="monospace" font-size="10.5" font-weight="bold">🌐 Sigstore Rekor Anchoring</text>

  <!-- Animated Flow Connectors -->
  <line x1="278" y1="105" x2="355" y2="105" stroke="#A855F7" stroke-width="2.2" stroke-dasharray="6 6">
    <animate attributeName="stroke-dashoffset" values="24;0" dur="1s" repeatCount="indefinite"/>
  </line>
  <line x1="605" y1="105" x2="682" y2="105" stroke="#10B981" stroke-width="2.2" stroke-dasharray="6 6">
    <animate attributeName="stroke-dashoffset" values="24;0" dur="1s" repeatCount="indefinite"/>
  </line>
</svg>
