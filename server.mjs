// Sales Sparring Trainer: build your sales script with a coach, then train it in a 7-day voice
// bootcamp against prospects that get harder every day.
// Runs on a Fly.io Sprite on port 8080. No dependencies: node server.mjs

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(ROOT, '.env'));

const { CHECKLIST, PARTS, PART_NAMES } = await import('./lib/checklist.mjs');
const { DAYS, AIDS, LEVELS, PASS_SCORE, day } = await import('./lib/bootcamp.mjs');
const store = await import('./lib/store.mjs');
const S = await import('./lib/script.mjs');
const { buildProspect } = await import('./lib/prospect.mjs');
const P = await import('./lib/persona.mjs');
const { callToken, transcript } = await import('./lib/voice.mjs');
const { grade } = await import('./lib/grade.mjs');
const { mode, gatewayList } = await import('./lib/upstream.mjs');

store.init(ROOT);
const PORT = Number(process.env.PORT) || 8080;
const DEMO_TEMPLATE = path.join(ROOT, 'data', 'demo-template.json');
const MIN_SECONDS = 20;

const fail = (status, error) => [status, { error }];
const mustW = (id) => store.load(id);

const routes = [
  ['GET', /^\/api\/meta$/, () => ({
    checklist: CHECKLIST, parts: PARTS, part_names: PART_NAMES, days: DAYS, aids: AIDS,
    levels: Object.fromEntries(Object.entries(LEVELS).map(([k, v]) => [k, v.name])),
    pass_score: PASS_SCORE, demo_available: fs.existsSync(DEMO_TEMPLATE), mode: mode(),
  })],

  ['POST', /^\/api\/w$/, () => ({ id: store.create().id })],

  ['POST', /^\/api\/w\/demo$/, () => {
    if (!fs.existsSync(DEMO_TEMPLATE)) return fail(404, 'No demo company on this server yet.');
    const t = JSON.parse(fs.readFileSync(DEMO_TEMPLATE, 'utf8'));
    delete t.id;
    return { id: store.create({ ...t, demo: true }).id };
  }],

  ['GET', /^\/api\/w\/([\w-]+)$/, (_, [id]) => {
    const w = mustW(id);
    return w ? store.publicView(w) : fail(404, 'Workspace not found.');
  }],

  ['PUT', /^\/api\/w\/([\w-]+)\/business$/, (body, [id]) => {
    const w = mustW(id);
    if (!w) return fail(404, 'Workspace not found.');
    const b = S.cleanBusiness(body);
    if (!b) return fail(400, 'Company, what you sell and who you call are required.');
    w.business = b;
    store.save(w);
    return store.publicView(w);
  }],

  // Script in: write one for me, or paste mine.
  ['POST', /^\/api\/w\/([\w-]+)\/script$/, async (body, [id]) => {
    const w = mustW(id);
    if (!w?.business) return fail(400, 'Tell us about the business first.');
    if (w.script?.locked) return fail(409, 'The script is locked. Unlock it to change it.');
    if (body.mode === 'draft') w.script = await S.draft(w.business);
    else {
      const raw = String(body.text || '').trim();
      if (raw.length < 80) return fail(400, 'Paste a script of at least a few lines.');
      if (raw.length > S.MAX_SCRIPT_CHARS) return fail(400, `Scripts are limited to ${S.MAX_SCRIPT_CHARS} characters (yours has ${raw.length}).`);
      w.script = await S.split(raw);
    }
    w.diagnosis = null;
    store.save(w);
    return store.publicView(w);
  }],

  // Manual edits to the parts before locking.
  ['PUT', /^\/api\/w\/([\w-]+)\/script$/, (body, [id]) => {
    const w = mustW(id);
    if (!w?.script) return fail(400, 'No script yet.');
    if (w.script.locked) return fail(409, 'The script is locked.');
    for (const p of PARTS) if (typeof body.parts?.[p] === 'string') w.script.parts[p].text = body.parts[p].slice(0, 3000);
    w.script.version++;
    w.diagnosis = null;
    store.save(w);
    return store.publicView(w);
  }],

  ['POST', /^\/api\/w\/([\w-]+)\/diagnose$/, async (_, [id]) => {
    const w = mustW(id);
    if (!w?.script) return fail(400, 'No script yet.');
    w.diagnosis = await S.diagnose(w.business, w.script);
    store.save(w);
    return store.publicView(w);
  }],

  ['POST', /^\/api\/w\/([\w-]+)\/apply$/, (body, [id]) => {
    const w = mustW(id);
    if (!w?.diagnosis) return fail(400, 'Run the review first.');
    const accepted = Array.isArray(body.accepted) ? body.accepted.map(String) : [];
    const { script, applied } = S.applyChanges(w.script, w.diagnosis.changes, accepted);
    w.script = script;
    w.diagnosis.applied = applied;
    w.diagnosis.decided = true;
    store.save(w);
    return store.publicView(w);
  }],

  ['POST', /^\/api\/w\/([\w-]+)\/lock$/, async (_, [id]) => {
    const w = mustW(id);
    if (!w?.script) return fail(400, 'No script yet.');
    if (!PARTS.every((p) => w.script.parts[p].text.trim())) return fail(400, 'Every part needs some text before you lock it.');
    const r = await S.lock(w.business, w.script, w.diagnosis?.objections);
    Object.assign(w, r);
    store.save(w);
    return store.publicView(w);
  }],

  // The prospect card. This one includes what they hide: the page shows it behind a spoiler.
  ['GET', /^\/api\/w\/([\w-]+)\/prospects$/, (_, [id]) => {
    const w = mustW(id);
    if (!w?.persona) return fail(400, 'Lock your script first: that is when your prospects are built.');
    return {
      lead: w.lead || null, main: w.persona, final: w.persona_final || null,
      personalities: Object.fromEntries(Object.entries(P.PERSONALITIES).map(([k, v]) => [k, v.name])),
      topics: P.TOPICS, leads: P.LEADS,
    };
  }],

  ['PUT', /^\/api\/w\/([\w-]+)\/prospects\/(main|final)$/, (body, [id, which]) => {
    const w = mustW(id);
    const key = which === 'final' ? 'persona_final' : 'persona';
    if (!w?.[key]) return fail(400, 'No prospect yet.');
    w[key] = P.editProspect(w[key], body);
    if (P.LEADS[body.lead]) w.lead = { ...(w.lead || {}), type: body.lead };
    store.save(w);
    return store.publicView(w);
  }],

  ['POST', /^\/api\/w\/([\w-]+)\/prospects\/(main|final)\/rebuild$/, async (body, [id, which]) => {
    const w = mustW(id);
    if (!w?.script?.locked) return fail(400, 'Lock your script first.');
    const p = await P.rebuildProspect(w, which, String(body.steer || ''));
    if (which === 'final') w.persona_final = p;
    else { w.persona = p; w.objections = p.objections; w.weak_spot = null; }
    store.save(w);
    return store.publicView(w);
  }],

  ['POST', /^\/api\/w\/([\w-]+)\/unlock$/, (_, [id]) => {
    const w = mustW(id);
    if (!w?.script) return fail(400, 'No script yet.');
    w.script.locked = false;
    store.save(w);
    return store.publicView(w);
  }],

  // A bootcamp call: token for the voice session plus what the rep may see on screen today.
  ['POST', /^\/api\/w\/([\w-]+)\/call$/, async (body, [id]) => {
    const w = mustW(id);
    if (!w?.script?.locked) return fail(400, 'Lock your script before the bootcamp.');
    const d = day(body.day);
    if (!d) return fail(400, 'No such day.');
    if (d.n > store.unlockedDay(w)) return fail(403, `Pass day ${d.n - 1} first.`);
    const limited = store.allowCall(w.id);
    if (limited) return fail(429, limited);
    const p = buildProspect(w, d);
    const token = await callToken();
    const attempt = { id: crypto.randomUUID(), day: d.n, created: new Date().toISOString(), conversation_id: null, objections: p.objections, persona: p.persona, result: null };
    w.attempts.push(attempt);
    store.save(w);
    const aid = d.aid === 'none' ? { level: 'none', parts: [] } : {
      level: d.aid,
      parts: d.parts.map((part) => ({ part, name: PART_NAMES[part], text: d.aid === 'script' ? w.script.parts[part].text : '', key_lines: w.script.parts[part].key_lines })),
    };
    return { attempt: attempt.id, token, overrides: p.overrides, aid, prospect: { name: p.persona.name, role: p.persona.role }, minutes: d.minutes };
  }],

  ['POST', /^\/api\/w\/([\w-]+)\/result$/, async (body, [id]) => {
    const w = mustW(id);
    const a = w?.attempts.find((x) => x.id === body.attempt);
    if (!a) return fail(404, 'Unknown call.');
    if (a.result) return a.result;
    if (!a.conversation_id) {
      if (typeof body.conversation_id !== 'string') return fail(400, 'conversation_id required');
      a.conversation_id = body.conversation_id;
      a.aids = body.aids || {};
      store.save(w);
    }
    const t = await transcript(a.conversation_id);
    if (!t) return [202, { pending: true }];
    const d = day(a.day);
    if (t.seconds < MIN_SECONDS || t.turns.filter((x) => x.role === 'rep').length < 2) {
      a.result = { empty: true, seconds: t.seconds, turns: t.turns, day: a.day };
    } else {
      const r = await grade({ w, d, turns: t.turns, objections: a.objections || [], aids: a.aids, persona: a.persona || P.prospectFor(w, d) });
      a.result = { ...r, day: a.day, seconds: t.seconds, turns: t.turns };
      // The coach remembers: the objection you fumbled comes back first next time.
      if (r.objection_missed) w.weak_spot = r.objection_missed;
      else if (r.passed && d.objections) w.weak_spot = null;
    }
    store.save(w);
    return a.result;
  }],

  ['GET', /^\/api\/w\/([\w-]+)\/attempts$/, (_, [id]) => {
    const w = mustW(id);
    if (!w) return fail(404, 'Workspace not found.');
    return { attempts: w.attempts.filter((a) => a.result && !a.result.empty).map((a) => ({ id: a.id, day: a.day, created: a.created, sample: !!a.sample, ...a.result })).reverse() };
  }],

  ['GET', /^\/api\/health$/, async () => {
    if (mode() !== 'gateway') return { ok: true, mode: mode() };
    const g = await gatewayList().catch((e) => ({ status: 0, body: String(e) }));
    let providers = [];
    try { providers = (JSON.parse(g.body).connections || []).map((c) => c.provider); } catch { /* not json */ }
    return { ok: g.status === 200, mode: mode(), providers };
  }],
];

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    for (const [method, re, fn] of routes) {
      const m = url.pathname.match(re);
      if (!m || method !== req.method) continue;
      try {
        const body = ['POST', 'PUT'].includes(req.method) ? await readJson(req) : null;
        let out = await fn(body, m.slice(1));
        let status = 200;
        if (Array.isArray(out)) [status, out] = out;
        send(res, status, JSON.stringify(out), 'application/json');
      } catch (e) {
        console.error(req.method, url.pathname, e);
        send(res, 502, JSON.stringify({ error: String(e.message || e) }), 'application/json');
      }
      return;
    }
    const rel = url.pathname === '/' || !path.extname(url.pathname) ? 'index.html' : path.normalize(url.pathname);
    const file = path.join(ROOT, 'public', rel);
    if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      return send(res, 404, 'Not found', 'text/plain');
    }
    send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream');
  })
  .listen(PORT, () => console.log(`Sales Sparring Trainer on :${PORT} (${mode()} mode)`));

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', (d) => {
      s += d;
      if (s.length > 40000) reject(new Error('body too large'));
    });
    req.on('end', () => {
      try { resolve(s ? JSON.parse(s) : {}); } catch { reject(new Error('bad json')); }
    });
  });
}

function loadEnv(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}
