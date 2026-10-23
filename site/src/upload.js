/** Bring-your-own-data: drop zone, paste box, sample loader and tolerant parsers. Nothing leaves the browser. */
import { escapeHtml, sha256 } from './engine.js';
import { showToast } from './shared.js';

const MAX_BYTES = 8 * 1024 * 1024;

/** Every bundled sample. Re-uploading one of these — even as a file or paste — is still sample data. */
const SAMPLES = ['prompts.csv', 'timings-leaky.csv', 'timings-sealed.csv', 'twin-run.csv', 'ledger.json',
  'ledger-tampered.json', 'observed-config.yaml', 'isolation-contract.yaml'].map((f) => `/samples/${f}`);
const normalize = (t) => t.replace(/^﻿/, '').replace(/\r\n/g, '\n').trim();
let sampleFingerprints = null;

async function isBundledSample(text) {
  if (!sampleFingerprints) {
    sampleFingerprints = Promise.all(SAMPLES.map(async (href) => {
      try {
        const res = await fetch(href);
        return res.ok ? sha256(normalize(await res.text())) : null;
      } catch {
        return null;
      }
    })).then((list) => new Set(list.filter(Boolean)));
  }
  return (await sampleFingerprints).has(await sha256(normalize(text)));
}

export function uploadPanel({ id, title, blurb, formats, sampleHref, sampleLabel = 'Download sample' }) {
  return `
  <section class="upload plate" id="${id}" aria-labelledby="${id}-title">
    <div class="upload-head">
      <div>
        <p class="kicker" id="${id}-title">${title}</p>
        <p class="upload-blurb">${blurb}</p>
      </div>
      <span class="chip chip-ok" title="Parsed and evaluated locally with Web Crypto">runs 100% in your browser</span>
    </div>
    <label class="drop" data-drop>
      <input type="file" class="sr-only" data-file accept=".csv,.tsv,.json,.jsonl,.ndjson,.txt,.yaml,.yml">
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>
      <span><b>Drop a file</b> or <u>browse</u></span>
      <span class="hash">${formats}</span>
    </label>
    <div class="upload-actions">
      <button class="row-btn" type="button" data-sample>Try the sample</button>
      <button class="row-btn" type="button" data-paste-toggle>Paste instead</button>
      ${sampleHref ? `<a class="row-btn" href="${sampleHref}" download>${sampleLabel}</a>` : ''}
      <span class="hash upload-status" data-status aria-live="polite"></span>
    </div>
    <div class="paste hidden" data-paste>
      <textarea rows="6" data-paste-text placeholder="Paste CSV, JSON, JSONL or YAML here…"></textarea>
      <button class="press press-ink" type="button" data-paste-run>Run on pasted data</button>
    </div>
  </section>`;
}

/**
 * Wire up a panel rendered by uploadPanel().
 * onData({ name, text, source }) may throw; the message is shown to the user.
 * source is 'file' | 'paste' | 'sample' — only the first two count as the team's own evidence.
 */
export function bindUpload(id, { sampleHref, onData }) {
  const root = document.getElementById(id);
  const q = (sel) => root.querySelector(sel);
  const status = q('[data-status]');
  const drop = q('[data-drop]');

  const run = async (name, text, source) => {
    status.textContent = `reading ${name}…`;
    status.className = 'hash upload-status';
    try {
      if (source !== 'sample' && await isBundledSample(text)) source = 'sample';
      const msg = await onData({ name, text, source });
      status.textContent = `✔ ${name}${msg ? ' · ' + msg : ''}${source === 'sample' ? ' · sample data, not counted toward release' : ''}`;
      status.className = 'hash upload-status ok';
    } catch (err) {
      status.textContent = `✖ ${err.message || err}`;
      status.className = 'hash upload-status bad';
      showToast('Could not use that data', err.message || String(err), 'bad');
    }
  };

  const readFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      status.textContent = `✖ ${file.name} is ${(file.size / 1e6).toFixed(1)} MB — limit is 8 MB`;
      status.className = 'hash upload-status bad';
      return;
    }
    run(file.name, await file.text(), 'file');
  };

  q('[data-file]').addEventListener('change', (e) => readFile(e.target.files[0]));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('is-over');
    readFile(e.dataTransfer.files[0]);
  });
  q('[data-paste-toggle]').addEventListener('click', () => {
    q('[data-paste]').classList.toggle('hidden');
    q('[data-paste-text]').focus();
  });
  q('[data-paste-run]').addEventListener('click', () => {
    const text = q('[data-paste-text]').value;
    if (!text.trim()) { status.textContent = '✖ nothing pasted'; status.className = 'hash upload-status bad'; return; }
    run('pasted data', text, 'paste');
  });
  q('[data-sample]')?.addEventListener('click', async () => {
    try {
      const res = await fetch(sampleHref);
      if (!res.ok) throw new Error(`sample not found (${res.status})`);
      run(sampleHref.split('/').pop(), await res.text(), 'sample');
    } catch (err) {
      status.textContent = `✖ ${err.message}`;
      status.className = 'hash upload-status bad';
    }
  });
}

/* ------------------------------------------------------------------ parsers */

export function parseCSV(text) {
  const firstLine = text.slice(0, text.indexOf('\n') >>> 0 || text.length);
  const delim = [',', '\t', ';'].reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ',');
  const rows = [];
  let row = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v !== '')) rows.push(row);
  if (rows.length < 2) throw new Error('CSV needs a header row and at least one data row');
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

/** Tiny YAML subset: nested maps by indentation, scalars, inline [a, b] lists and "- item" lists. */
export function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, obj: root }];
  const opened = [];
  const scalar = (v) => {
    v = v.replace(/\s+#.*$/, '').trim();
    if (/^".*"$|^'.*'$/.test(v)) return v.slice(1, -1);
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null' || v === '~') return null;
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map((s) => scalar(s)).filter((s) => s !== '');
    return v;
  };
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.search(/\S/);
    const line = raw.trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1];
    if (line.startsWith('- ')) {
      if (!Array.isArray(parent.list)) throw new Error(`YAML list item without a key: "${line}"`);
      parent.list.push(scalar(line.slice(2)));
      continue;
    }
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) throw new Error(`Cannot read YAML line: "${line}"`);
    const key = m[1].trim();
    if (m[2] === '') {
      const child = {};
      parent.obj[key] = child;
      // A key followed by "- item" lines becomes a list once parsing ends.
      const frame = { indent, obj: child, key, holder: parent.obj, list: [] };
      stack.push(frame);
      opened.push(frame);
    } else {
      parent.obj[key] = scalar(m[2]);
    }
  }
  for (const f of opened) if (f.list.length) f.holder[f.key] = f.list;
  return root;
}

/** Parse any supported text into an array of plain records. */
export function parseRecords(text, name = '') {
  const t = text.replace(/^﻿/, '').trim();
  if (!t) throw new Error('the file is empty');
  const lower = name.toLowerCase();
  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      const data = JSON.parse(t);
      if (Array.isArray(data)) return data;
      for (const k of ['entries', 'ledger', 'rows', 'data', 'records', 'items', 'prompts']) {
        if (Array.isArray(data[k])) return data[k];
      }
      return [data];
    } catch (err) {
      if (!t.startsWith('{') || !t.includes('\n')) throw new Error('invalid JSON: ' + err.message);
    }
    // JSON Lines
    return t.split(/\r?\n/).filter((l) => l.trim()).map((l, i) => {
      try { return JSON.parse(l); } catch { throw new Error(`invalid JSONL on line ${i + 1}`); }
    });
  }
  if (lower.endsWith('.txt')) return t.split(/\r?\n/).filter((l) => l.trim()).map((l) => ({ text: l.trim() }));
  if (/[,\t;]/.test(t.split(/\r?\n/)[0])) return parseCSV(t);
  return t.split(/\r?\n/).filter((l) => l.trim()).map((l) => ({ text: l.trim() }));
}

/** Read the first matching column, case-insensitively. */
export function pick(row, aliases) {
  const keys = Object.keys(row);
  for (const a of aliases) {
    const k = keys.find((key) => key.toLowerCase() === a);
    if (k != null && row[k] !== '' && row[k] != null) return row[k];
  }
  return undefined;
}

export function downloadFile(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCSV(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
}

export const esc = escapeHtml;
