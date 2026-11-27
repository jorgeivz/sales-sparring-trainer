// Workspaces live as JSON files on the Sprite's persistent disk. A workspace is one
// business, its script and one rep's progress through the bootcamp. The id is the key:
// whoever has the link has the workspace (fine for a demo, no accounts).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DAYS, PASS_SCORE, FREE, FREE_N } from './bootcamp.mjs';
import { prospectFor } from './persona.mjs';

let DIR = null;
export function init(root) {
  DIR = path.join(root, 'data', 'w');
  fs.mkdirSync(DIR, { recursive: true });
}

const file = (id) => path.join(DIR, `${id}.json`);
const okId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{8,40}$/.test(id);

export function create(seed = {}) {
  const id = crypto.randomBytes(9).toString('base64url');
  const w = { business: null, script: null, diagnosis: null, persona: null, objections: [], attempts: [], ...structuredClone(seed), id, created: new Date().toISOString() };
  save(w);
  return w;
}

export function load(id) {
  if (!okId(id) || !fs.existsSync(file(id))) return null;
  return JSON.parse(fs.readFileSync(file(id), 'utf8'));
}

export function save(w) {
  const tmp = `${file(w.id)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(w, null, 2));
  fs.renameSync(tmp, file(w.id));
}

/** Highest day you may open: the day after your last pass (demo workspaces open everything). */
export function unlockedDay(w) {
  if (w.demo) return DAYS.length;
  const passed = w.attempts.filter((a) => a.result?.passed && a.day !== FREE_N).map((a) => a.day);
  return Math.min(DAYS.length, (passed.length ? Math.max(...passed) : 0) + 1);
}

/** Passed day 7. Opens free practice. */
export const graduated = (w) => !!w.demo || w.attempts.some((a) => a.day === 7 && a.result?.passed);

/** True once the rep has had a scored call with this person: the next call gets someone new. */
export const alreadyCalled = (w, p) => w.attempts.some((a) => a.result && !a.result.empty
  && (p.pid ? a.persona?.pid === p.pid : a.persona?.name === p.name));

// What a rep would know before dialing: name, who they are, the kind of call. Never what they hide.
// Someone already called is not who you call next: a new person is being lined up.
const card = (w, p) => (!p || alreadyCalled(w, p) ? null : { name: p.name, role: p.role, personality: p.personality || null });

/** What the browser gets. Hidden facts, pains and objections stay on the server. */
export function publicView(w) {
  return {
    id: w.id,
    demo: !!w.demo,
    business: w.business,
    script: w.script,
    diagnosis: w.diagnosis,
    prospects: Object.fromEntries(DAYS.map((d) => [d.n, card(w, prospectFor(w, d))])),
    lead: w.lead || null,
    unlocked: unlockedDay(w),
    pass_score: PASS_SCORE,
    days: DAYS.map((d) => {
      const tries = w.attempts.filter((a) => a.day === d.n && a.result && !a.result.empty);
      const best = tries.reduce((m, a) => Math.max(m, a.result.score), -1);
      return { ...d, tries: tries.length, best: best < 0 ? null : best, passed: tries.some((a) => a.result.passed) };
    }),
    weak_spot: w.weak_spot || null,
    free: (() => {
      const tries = w.attempts.filter((a) => a.day === FREE_N && a.result && !a.result.empty);
      const best = tries.reduce((m, a) => Math.max(m, a.result.score), -1);
      const next = w.prospects?.[FREE_N];
      return { ...FREE, open: graduated(w), tries: tries.length, best: best < 0 ? null : best, prospect: next ? card(w, next) : null };
    })(),
  };
}

// Abuse guard for the public demo: every call costs voice minutes, on a plan shared with
// another product. The count lives on disk: the Sprite sleeps and restarts its service, and
// an in-memory count reset on every wake-up. Defaults: 30 calls a day, 10 per workspace.
const limitsFile = () => path.join(DIR, '..', 'limits.json');
export function allowCall(id) {
  const today = new Date().toISOString().slice(0, 10);
  let counts = { day: today, total: 0, per: {} };
  try {
    const saved = JSON.parse(fs.readFileSync(limitsFile(), 'utf8'));
    if (saved.day === today) counts = saved;
  } catch { /* first call of the day, or no file yet */ }
  const max = Number(process.env.MAX_CALLS_PER_DAY) || 30;
  const maxPer = Number(process.env.MAX_CALLS_PER_WORKSPACE) || 10;
  if (counts.total >= max) return 'The demo hit its daily call limit. Try again tomorrow.';
  if ((counts.per[id] || 0) >= maxPer) return 'This workspace hit its daily call limit.';
  counts.total++;
  counts.per[id] = (counts.per[id] || 0) + 1;
  fs.writeFileSync(limitsFile(), JSON.stringify(counts));
  return null;
}
