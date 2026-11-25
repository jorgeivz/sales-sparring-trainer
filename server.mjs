// Sales Sparring: a voice prospect you can practice a sales call against.
// Runs on a Fly.io Sprite on port 8080. No dependencies: node server.mjs

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildProspect, PRESETS, LEVELS } from './lib/prospect.mjs';
import { callToken, transcript } from './lib/voice.mjs';
import { grade } from './lib/grade.mjs';
import { mode, gatewayList } from './lib/upstream.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(ROOT, '.env'));
const PORT = Number(process.env.PORT) || 8080;
const DATA = path.join(ROOT, 'data');
fs.mkdirSync(DATA, { recursive: true });

// Calls survive restarts and Sprite sleep: the Sprite disk is persistent.
const DB = path.join(DATA, 'calls.json');
const calls = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, 'utf8')) : {};
const save = () => fs.writeFileSync(DB, JSON.stringify(calls, null, 2));

const MIN_SECONDS = 20;
const MAX_CALL_SECONDS = 300;

const routes = {
  'GET /api/config': () => ({ presets: PRESETS, levels: Object.fromEntries(Object.entries(LEVELS).map(([k, v]) => [k, v.label])), mode: mode() }),

  'POST /api/session': async (body) => {
    const p = buildProspect(body);
    if (!p) return [400, { error: 'Fill in product, prospect and concern.' }];
    const token = await callToken();
    const id = crypto.randomUUID();
    calls[id] = { id, created: new Date().toISOString(), summary: p.summary, conversation_id: null, result: null };
    save();
    p.overrides.conversation = { maxDurationSeconds: MAX_CALL_SECONDS };
    return { id, token, overrides: p.overrides, summary: p.summary };
  },

  'POST /api/result': async (body) => {
    const c = calls[body?.id];
    if (!c) return [404, { error: 'Unknown call' }];
    if (c.result) return c.result;
    if (!c.conversation_id) {
      if (typeof body.conversation_id !== 'string') return [400, { error: 'conversation_id required' }];
      c.conversation_id = body.conversation_id;
      save();
    }
    const t = await transcript(c.conversation_id);
    if (!t) return [202, { pending: true }];
    if (t.seconds < MIN_SECONDS || t.turns.filter((x) => x.role === 'rep').length < 2) {
      c.result = { empty: true, seconds: t.seconds, turns: t.turns };
    } else {
      c.result = { ...(await grade(t.turns, c.summary)), seconds: t.seconds, turns: t.turns };
    }
    save();
    return c.result;
  },

  'GET /api/history': () => ({
    calls: Object.values(calls)
      .filter((c) => c.result && !c.result.empty)
      .sort((a, b) => b.created.localeCompare(a.created))
      .slice(0, 10)
      .map((c) => ({ created: c.created, level: c.summary.level, prospect: c.summary.prospect, score: c.result.score, closed: c.result.closed })),
  }),

  // Which connector providers this Sprite can see (names only, no ids).
  'GET /api/health': async () => {
    if (mode() !== 'gateway') return { ok: true, mode: mode() };
    const g = await gatewayList().catch((e) => ({ status: 0, body: String(e) }));
    const providers = [...g.body.matchAll(/"provider"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
    return { ok: g.status === 200, mode: mode(), gateway_status: g.status, providers };
  },
};

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const route = routes[`${req.method} ${url.pathname}`];
    if (route) {
      try {
        const body = req.method === 'POST' ? await readJson(req) : null;
        let out = await route(body);
        let status = 200;
        if (Array.isArray(out)) [status, out] = out;
        send(res, status, JSON.stringify(out), 'application/json');
      } catch (e) {
        console.error(url.pathname, e);
        send(res, 502, JSON.stringify({ error: String(e.message || e) }), 'application/json');
      }
      return;
    }
    const file = path.join(ROOT, 'public', url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
    if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      return send(res, 404, 'Not found', 'text/plain');
    }
    send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream');
  })
  .listen(PORT, () => console.log(`Sales Sparring on :${PORT} (${mode()} mode)`));

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', (d) => {
      s += d;
      if (s.length > 20000) reject(new Error('body too large'));
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
