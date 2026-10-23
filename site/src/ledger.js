import './style.css';
import { wrapPage, showToast, plateHead, busy, refreshNav, evidenceChip } from './shared.js';
import {
  sha256, merkleRoot, merkleProof, verifyProof, loadSession, saveSession, hexPreview, escapeHtml, evidenceOf,
} from './engine.js';
import { uploadPanel, bindUpload, parseRecords, pick, downloadFile } from './upload.js';

const app = document.getElementById('app');
const GENESIS = '0'.repeat(64);
const session = loadSession();

/** Seed the catalog from what the other plates actually did in this browser. */
const seedEvents = [
  { cell: 'ALMANAC', type: 'SKY_MATCH', detail: session.drift ? `drift on ${session.driftCount} coordinate(s)` : 'runsc · three nets · read-only' },
  { cell: 'RED', type: 'COMMIT', detail: session.redCommit ? `payload ${hexPreview(session.redCommit, 12)}` : 'payload bound' },
  { cell: 'BLUE', type: 'COMMIT', detail: session.blueCommit ? `defense ${hexPreview(session.blueCommit, 12)}` : 'defense bound' },
  { cell: 'ORBIT', type: 'CHORD_REFUSED', detail: 'Red→Blue dropped' },
  { cell: 'BARYCENTER', type: 'RELAY', detail: session.lastRelay ? `${session.lastRelay.size}B · slot ${session.lastRelay.slot}` : '4096B · slot edge' },
  { cell: 'MODEL', type: 'WIPE', detail: 'session salt' },
];
if (session.datasetRun) {
  seedEvents.push({ cell: 'BARYCENTER', type: 'DATASET_RUN', detail: `${session.datasetRun.n} prompts · results ${hexPreview(session.datasetRun.hash, 12)}` });
}

/** What is stored on disk: rows with their hashes. `printedRoot` is the root published at the last checkpoint. */
let catalog = [];
let printedRoot = '';
let proofSeq = 5;
let tamperKind = null;

const entryPayload = (e, prev) => `${prev}|${e.seq}|${e.cell}|${e.type}|${e.detail}`;

async function appendEntry(e) {
  const prev = catalog.length ? catalog[catalog.length - 1].entryHash : GENESIS;
  const seq = catalog.length + 1;
  const row = { ...e, seq, prev };
  row.entryHash = await sha256(entryPayload(row, prev));
  catalog.push(row);
}

async function printCheckpoint() {
  printedRoot = await merkleRoot(catalog.map((c) => c.entryHash));
}

/** Independent auditor: recompute everything from the rows and compare against the printed root. */
async function audit() {
  let prev = GENESIS;
  let brokenAt = null;
  let reason = '';
  const recomputed = [];
  for (const row of catalog) {
    const again = await sha256(entryPayload(row, row.prev));
    recomputed.push(again);
    if (brokenAt == null) {
      if (row.prev !== prev) { brokenAt = row.seq; reason = 'prev-link does not match the entry before it'; }
      else if (again !== row.entryHash) { brokenAt = row.seq; reason = 'stored hash ≠ hash of stored note'; }
    }
    prev = row.entryHash;
  }
  const root = await merkleRoot(recomputed);
  const rootOk = root === printedRoot;
  if (brokenAt == null && !rootOk) reason = 'chain is self-consistent, but its root ≠ the printed checkpoint';
  return { brokenAt, reason, root, rootOk, recomputed, ok: brokenAt == null && rootOk };
}

function chainStrip(result) {
  return `<div class="chainstrip" id="strip" aria-label="Ledger chain, ${catalog.length} entries">
    ${catalog.map((e, i) => {
      const bad = (result.brokenAt != null && e.seq >= result.brokenAt) || (tamperKind === 'rehash' && e.seq >= 3);
      return `<button class="cblk ${bad ? 'bad' : ''} ${e.seq === proofSeq ? 'sel' : ''}" data-prove="${e.seq}" type="button" title="Show inclusion proof for #${e.seq}">
        <span class="s">#${e.seq} · ${e.cell}</span>
        <span class="d">${e.type}</span>
        <span class="h">${hexPreview(result.recomputed[i], 20)}…</span>
      </button>`;
    }).join('')}
  </div>`;
}

async function paint() {
  const result = await audit();
  const idx = Math.min(proofSeq, catalog.length) - 1;
  const proof = await merkleProof(catalog.map((c) => c.entryHash), idx);
  const proofOk = await verifyProof(result.recomputed[idx], proof, printedRoot);

  // The in-page ledger is a demo: it may stand in as simulated evidence, but never replaces a verified upload.
  if (loadSession().ledgerEvidence !== 'measured') {
    saveSession({
      merkleRoot: printedRoot,
      ledgerBroken: !result.ok,
      ledgerBrokenAt: result.brokenAt ?? (result.rootOk ? null : 'root'),
      ledgerEvidence: 'simulated',
      ledgerSource: 'demo ledger',
    });
  }

  const rows = catalog.map((e) => {
    const bad = result.brokenAt != null && e.seq >= result.brokenAt;
    const status = !result.ok && bad ? (e.seq === result.brokenAt ? 'tampered' : 'untrusted') : (!result.rootOk ? 'root mismatch' : 'verified');
    return `
    <tr class="${bad || !result.rootOk ? 'is-off' : ''}">
      <td class="num">${e.seq}</td>
      <td>${e.cell}</td>
      <td>${e.type}</td>
      <td>${escapeHtml(e.detail)}</td>
      <td class="hash">${hexPreview(e.prev, 10)}</td>
      <td class="hash">${hexPreview(e.entryHash, 10)}</td>
      <td class="${status === 'verified' ? 'ok' : 'bad'}">${status}</td>
      <td><button class="row-btn" data-prove="${e.seq}" type="button" ${e.seq === proofSeq ? 'aria-pressed="true"' : ''}>${e.seq === proofSeq ? 'proving' : 'prove'}</button></td>
    </tr>`;
  }).join('');

  const verdict = result.ok
    ? '<span class="chip chip-ok">chain holds</span> every link recomputes and the root matches the printed checkpoint'
    : `<span class="chip chip-bad">broken${result.brokenAt ? ' at seq ' + result.brokenAt : ''}</span> ${result.reason}`;

  document.getElementById('live').innerHTML = `
    <div class="btn-row">
      <button class="press press-red" id="tamperEdit" type="button" ${tamperKind ? 'disabled' : ''}>Edit entry 3</button>
      <button class="press press-red" id="tamperRehash" type="button" ${tamperKind ? 'disabled' : ''}>Edit &amp; rehash downstream</button>
      <button class="press" id="restore" type="button" ${tamperKind ? '' : 'disabled'}>Restore</button>
      <button class="press press-ink" id="append" type="button">Append an entry</button>
      <button class="press" id="export" type="button">Export ledger JSON</button>
    </div>

    ${chainStrip(result)}
    <p class="hash" style="margin:0.8rem 0 0.3rem">printed root&nbsp;&nbsp;&nbsp; ${printedRoot}</p>
    <p class="hash ${result.rootOk ? '' : 'bad'}" style="margin-bottom:0.8rem">recomputed root ${result.root}</p>
    <p style="margin-bottom:1rem">${verdict}</p>

    <div class="plate" style="overflow:auto">
      <table class="sheet">
        <thead><tr><th class="num">Seq</th><th>Cell</th><th>Event</th><th>Detail</th><th>Prev</th><th>Stored hash</th><th>Status</th><th></th></tr></thead>
        <tbody id="rows">${rows}</tbody>
      </table>
    </div>

    <hr class="rule">
    <div class="split-2">
      <div class="plate plate-pad">
        <p class="kicker">Inclusion proof for entry #${proofSeq}</p>
        <p class="hash">leaf (recomputed) ${result.recomputed[idx]}</p>
        ${proof.map((s, i) => `<p class="hash">${i + 1}. sibling on ${s.pos === 'L' ? 'left ' : 'right'} ${s.hash}</p>`).join('')}
        <p class="${proofOk ? 'ok' : 'bad'}" style="margin-top:0.6rem">${proofOk
          ? `Proof recomputes the published root — entry #${proofSeq} is in this log.`
          : `Proof fails — entry #${proofSeq} as stored is not in the published log.`}</p>
        <p class="hash" style="margin-top:0.4rem;opacity:0.7">${proof.length} hashes prove membership among ${catalog.length} entries (log₂ n, not n). Click any block or “prove” to switch.</p>
      </div>
      <div class="plate plate-pad">
        <p class="kicker">Printed certificate</p>
        <pre class="hash" style="white-space:pre-wrap">${escapeHtml(JSON.stringify({
          ledger: 'TriSeal 2.4.0',
          merkle_root: printedRoot,
          entries: catalog.length,
          audit: result.ok ? 'PASS' : 'FAIL',
          inclusion_entry: proofSeq,
          inclusion_valid: proofOk,
          hash: 'SHA-256 (Web Crypto)',
        }, null, 2))}</pre>
      </div>
    </div>
  `;

  const $ = (id) => document.getElementById(id);

  $('tamperEdit').onclick = busy($('tamperEdit'), async () => {
    catalog[2].detail = 'TAMPER · defense folio rewritten after bind';
    tamperKind = 'edit';
    showToast('Entry 3 edited', 'The note changed but its stored hash did not. The auditor catches it at seq 3.', 'bad');
    await paint();
  });

  $('tamperRehash').onclick = busy($('tamperRehash'), async () => {
    // A cunning forger rewrites the note AND every downstream hash, so each link looks fine.
    catalog[2].detail = 'TAMPER · defense folio rewritten after bind';
    for (let i = 2; i < catalog.length; i++) {
      catalog[i].prev = catalog[i - 1].entryHash;
      catalog[i].entryHash = await sha256(entryPayload(catalog[i], catalog[i].prev));
    }
    tamperKind = 'rehash';
    showToast('Rewritten & rehashed', 'Every link checks out — but the root no longer matches the printed checkpoint.', 'bad');
    await paint();
  });

  $('restore').onclick = busy($('restore'), async () => {
    const extra = catalog.slice(seedEvents.length).map(({ cell, type, detail }) => ({ cell, type, detail }));
    catalog = [];
    tamperKind = null;
    for (const e of seedEvents) await appendEntry(e);
    for (const e of extra) await appendEntry(e);
    await printCheckpoint();
    showToast('Restored', 'Canonical catalog returned and re-audited.', 'ok');
    await paint();
  });

  $('append').onclick = busy($('append'), async () => {
    const check = await audit();
    if (!check.ok) {
      showToast('Append refused', 'A broken chain cannot be extended. Restore first.', 'bad');
      return;
    }
    await appendEntry({ cell: 'HUNTER', type: 'PERTURB', detail: 'survey recorded ' + new Date().toISOString().slice(11, 19) });
    await printCheckpoint();
    showToast('Star catalogued', `Seq ${catalog.length} appended; a new checkpoint root was printed.`, 'ok');
    await paint();
  });

  $('export').onclick = () => {
    const entries = catalog.map(({ seq, cell, type, detail, prev, entryHash }) => ({ seq, cell, type, detail, prev, hash: entryHash }));
    downloadFile('triseal-ledger.json', JSON.stringify({ printed_root: printedRoot, entries }, null, 2));
    showToast('Exported', 'Drop the file into “Verify your own ledger” below — or edit a byte first.', 'ok');
  };

  $('strip').onclick = $('rows').onclick = async (e) => {
    const btn = e.target.closest('[data-prove]');
    if (!btn) return;
    proofSeq = Number(btn.dataset.prove);
    await paint();
  };

  refreshNav();
}

/* ------------------------------------------------------------ uploaded ledgers */

async function merkleWithSep(hashes, sep) {
  if (!hashes.length) return '';
  let layer = [...hashes];
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) next.push(await sha256(layer[i] + sep + (layer[i + 1] ?? layer[i])));
    layer = next;
  }
  return layer[0];
}

async function verifyUpload({ name, text, source }) {
  let printed = null;
  const t = text.trim();
  if (t.startsWith('{')) {
    try {
      const obj = JSON.parse(t);
      printed = obj.printed_root || obj.merkle_root || null;
    } catch { /* JSONL has no root */ }
  }
  const rows = parseRecords(text, name).map((r) => ({
    seq: Number(pick(r, ['seq', 'sequence', 'index', 'id'])),
    cell: String(pick(r, ['cell', 'party', 'actor']) ?? ''),
    type: String(pick(r, ['type', 'event_type', 'event', 'eventtype']) ?? ''),
    detail: String(pick(r, ['detail', 'details', 'note', 'message']) ?? ''),
    prev: String(pick(r, ['prev', 'prev_hash', 'previous', 'prevhash']) ?? ''),
    hash: String(pick(r, ['hash', 'entry_hash', 'entryhash', 'sha256']) ?? '').toLowerCase(),
  }));
  if (!rows.length) throw new Error('no ledger rows found');
  if (rows.some((r) => !r.hash || Number.isNaN(r.seq))) throw new Error('every row needs a numeric seq and a hash');

  // Detect the separator from the first row: this site uses "|", the CLI and API use "||".
  const first = rows[0];
  let sep = '|';
  for (const cand of ['|', '||']) {
    const h = await sha256([first.prev || GENESIS, first.seq, first.cell, first.type, first.detail].join(cand));
    if (h === first.hash) { sep = cand; break; }
  }

  let expectPrev = GENESIS;
  let brokenAt = null;
  let reason = '';
  const out = [];
  for (const r of rows) {
    const again = await sha256([expectPrev, r.seq, r.cell, r.type, r.detail].join(sep));
    if (brokenAt == null) {
      if (r.prev && r.prev !== expectPrev) { brokenAt = r.seq; reason = 'its prev link points at a different row'; }
      else if (again !== r.hash) { brokenAt = r.seq; reason = 'its stored hash ≠ SHA-256 of the row'; }
    }
    out.push({ ...r, again, ok: brokenAt == null });
    expectPrev = r.hash;
  }
  const hashes = rows.map((r) => r.hash);
  const roots = [await merkleWithSep(hashes, ''), await merkleWithSep(hashes, '||')];
  const rootMatch = printed ? roots.includes(String(printed).toLowerCase()) : null;
  const pass = brokenAt == null && rootMatch !== false;
  const evidence = evidenceOf(source);
  saveSession({
    merkleRoot: printed ?? rows[rows.length - 1].hash,
    ledgerBroken: !pass,
    ledgerBrokenAt: brokenAt ?? (rootMatch === false ? 'root' : null),
    ledgerEvidence: evidence,
    ledgerSource: name,
  });
  refreshNav();

  document.getElementById('upResult').innerHTML = `
    <div class="plate plate-pad">
      <div class="gate-banner">
        <div>
          <p class="kicker">Audit of ${escapeHtml(name)} ${evidenceChip(evidence)}</p>
          <p class="stat ${pass ? 'ok' : 'bad'}">${pass ? 'VALID' : 'TAMPERED'}</p>
        </div>
        <div class="stat-row" style="min-width:min(100%,420px)">
          <div><div class="stat-sm">${rows.length}</div><div class="stat-label">rows</div></div>
          <div><div class="stat-sm">${brokenAt == null ? rows.length : out.filter((r) => r.ok).length}</div><div class="stat-label">links verified</div></div>
          <div><div class="stat-sm">${sep === '||' ? 'CLI/API' : 'site'}</div><div class="stat-label">format</div></div>
        </div>
      </div>
      <p style="margin:0.6rem 0">${brokenAt != null
        ? `<span class="chip chip-bad">broken at seq ${brokenAt}</span> ${reason}. Every row after it is untrusted.`
        : '<span class="chip chip-ok">chain holds</span> every row recomputes from the one before it.'}
        <br>${rootMatch == null ? '<span class="chip chip-wait">no printed root</span> add <code>printed_root</code> to check the checkpoint.'
          : rootMatch ? '<span class="chip chip-ok">root matches</span> the printed checkpoint.'
          : '<span class="chip chip-bad">root mismatch</span> these rows do not produce the printed checkpoint.'}</p>
      <p class="hash">head ${rows[rows.length - 1].hash}</p>
      <div class="scroll-y" style="margin-top:0.8rem">
        <table class="sheet">
          <thead><tr><th class="num">Seq</th><th>Cell</th><th>Type</th><th>Detail</th><th>Stored</th><th>Recomputed</th><th></th></tr></thead>
          <tbody>${out.map((r) => `<tr class="${r.ok ? '' : 'is-off'}">
            <td class="num">${r.seq}</td><td>${escapeHtml(r.cell)}</td><td>${escapeHtml(r.type)}</td><td>${escapeHtml(r.detail)}</td>
            <td class="hash">${hexPreview(r.hash, 12)}</td><td class="hash">${hexPreview(r.again, 12)}</td>
            <td class="${r.ok ? 'ok' : 'bad'}">${r.ok ? '✔' : '✖'}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
  showToast(pass ? 'Ledger valid' : 'Tampering detected', pass ? `${rows.length} rows verified.` : `Broken at seq ${brokenAt ?? '(root)'}.`, pass ? 'ok' : 'bad');
  return `${rows.length} rows · ${pass ? 'valid' : 'tampered'}`;
}

async function init() {
  app.innerHTML = wrapPage('ledger', `
  <main class="inner">
    ${plateHead('Seal Ledger', 'A log you<br>can audit.',
      `Every event is SHA-256 hash-chained to the one before it, and a Merkle root is published at each checkpoint.
       An auditor recomputes every link from the stored notes — edit one, or even rewrite every hash after it,
       and the log no longer matches its checkpoint.`)}
    <div class="explain"><b>In plain terms</b>Every log row stores the hash of the row before it, so rows form a chain.
      A Merkle root squeezes the whole log into one 64-character fingerprint that you publish.
      Change any byte later and the fingerprint stops matching — that is how a third party can trust your results without trusting you.</div>
    <p class="sim-banner">${evidenceChip('simulated')} The ledger below is a live demo built from this session. Use it to explore tampering and proofs —
      to pass the release gate, <a href="#up-ledger">verify your own ledger export</a>.</p>
    <div id="live"></div>
    <hr class="rule">
    ${uploadPanel({
      id: 'up-ledger',
      title: 'Verify your own ledger',
      blurb: 'Upload a ledger exported from this page, from <code>/api/verify</code>, or from <code>cli/triseal_verify.py</code>. '
        + 'Rows need <code>seq, cell, type, detail, prev, hash</code> (<code>event_type</code>, <code>prev_hash</code>, <code>entry_hash</code> also work). '
        + 'Add <code>printed_root</code> to check the Merkle checkpoint too.',
      formats: 'JSON · JSONL · CSV',
      sampleHref: '/samples/ledger.json',
    })}
    <p class="hash" style="margin-top:0.6rem">Want to see a failure? <a href="/samples/ledger-tampered.json" download>Download a tampered ledger</a> and drop it in.</p>
    <div id="upResult" class="results"></div>
  </main>
  `);
  bindUpload('up-ledger', { sampleHref: '/samples/ledger.json', onData: verifyUpload });
  for (const e of seedEvents) await appendEntry(e);
  await printCheckpoint();
  await paint();
}

init();
