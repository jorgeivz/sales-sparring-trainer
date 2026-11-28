// Scores one bootcamp call. Two layers:
//   measured  - script adherence (key lines said, computed here on the real transcript),
//               talk ratio, questions asked, aids used (reported by the browser: a data point)
//   judged    - the checklist items of the day's parts, scored by a model that must quote the
//               rep's exact words. A quote that is not in the transcript is thrown away.

import { askJson, verbatim, MODEL } from './llm.mjs';
import { CHECKLIST } from './checklist.mjs';
import { PASS_SCORE } from './bootcamp.mjs';
import { TOPICS } from './persona.mjs';
import { linesSaid } from '../public/lines.js';

export function talkRatio(turns) {
  const words = (who) => turns.filter((t) => t.role === who).reduce((n, t) => n + t.text.split(/\s+/).length, 0);
  const rep = words('rep');
  const total = rep + words('prospect');
  return total ? Math.round((rep / total) * 100) : 0;
}

/**
 * Share of the call's TIME the rep was talking, from the transcript's timestamps (a turn
 * lasts until the next one starts). Falls back to the share of words without timestamps.
 * Shown as an observation, not scored: the simulated prospect answers in one or two
 * sentences, so the human ideal (rep talks ~20%, Hormozi) is not reachable here.
 */
export function talkTime(turns) {
  if (!turns.length || turns.some((t) => typeof t.at !== 'number')) return talkRatio(turns);
  const words = (t) => t.text.split(/\s+/).length;
  let rep = 0, all = 0;
  turns.forEach((t, i) => {
    const end = turns[i + 1]?.at ?? t.at + words(t) / 2.5;
    const len = Math.max(0, end - t.at);
    all += len;
    if (t.role === 'rep') rep += len;
  });
  return all ? Math.round((rep / all) * 100) : talkRatio(turns);
}

// Words that ask for a decision, not for information ("when do you need it by?" is not a close).
const CLOSE = /\b(next step|appointment|schedule|book|calendar|meeting|set (it|that|something|a time) up|sign|get (you )?started|move forward|go ahead|lock (it|that) in|come (out|by)|visit|consultation|demo|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|this week|next week|morning|afternoon|evening|\d{1,2}(:\d\d)?\s?(am|pm)|o'?clock|works? for you|ready to|paperwork|agreement|sign up)\b/i;

/**
 * The closing question and what the rep did right after it (rule from Pirka's trainer,
 * after Hormozi: ask, then stay quiet until they answer). Deterministic, no model.
 * The closing question is the LAST question in the second half of the call that asks for
 * a decision. "Kept talking" = 5+ more words in the same turn after it, or another rep turn
 * before the prospect answered.
 */
export function closeSilence(turns) {
  const half = Math.floor(turns.length / 2);
  for (let i = turns.length - 1; i >= half; i--) {
    const t = turns[i];
    if (t.role !== 'rep') continue;
    const qs = [...t.text.matchAll(/[^.?!]*\?/g)].filter((m) => CLOSE.test(m[0]));
    if (!qs.length) continue;
    const q = qs[qs.length - 1];
    const after = t.text.slice(q.index + q[0].length).trim();
    const moreWords = after ? after.split(/\s+/).length : 0;
    const nextRep = turns[i + 1]?.role === 'rep';
    const kept = moreWords >= 5 || nextRep;
    return { asked: true, question: q[0].trim(), waited: !kept, after: kept ? (moreWords >= 5 ? after : turns[i + 1].text).slice(0, 240) : '' };
  }
  return { asked: false };
}

export const questionCount = (turns) => turns.filter((t) => t.role === 'rep').reduce((n, t) => n + (t.text.match(/\?/g) || []).length, 0);

/** What a good discovery should find in this prospect: the hidden facts and the pains. */
export function findable(p) {
  return [
    ...Object.entries(p?.hidden || {}).map(([k, fact]) => ({ id: k, label: TOPICS[k] || k, fact })),
    ...(p?.pains || []).map((x, i) => ({ id: `pain${i + 1}`, label: `Pain: ${x.pain}`, fact: x.says })),
  ];
}

export async function grade({ w, d, turns, objections, aids, persona }) {
  const items = CHECKLIST.filter((c) => d.parts.includes(c.part));
  const repText = turns.filter((t) => t.role === 'rep').map((t) => t.text).join(' ');
  const prospectText = turns.filter((t) => t.role === 'prospect').map((t) => t.text).join(' ');
  const digs = d.parts.includes('discovery') ? findable(persona) : [];
  const transcript = turns.map((t) => `${t.role === 'rep' ? 'REP' : 'PROSPECT'}: ${t.text}`).join('\n');

  const keyLines = d.parts.flatMap((p) => w.script.parts[p].key_lines);
  const said = linesSaid(keyLines, repText);
  const adherence = keyLines.length ? Math.round((said.length / keyLines.length) * 100) : null;

  const out = await askJson(
    `You are a strict, fair sales coach scoring one practice call of a 7-day bootcamp.
Today is day ${d.n}, "${d.title}". Focus: ${d.focus}
Score ONLY these checklist items, from what you can hear in the transcript:
${items.map((c) => `- ${c.id}: ${c.in_call}`).join('\n')}

Return JSON:
{"criteria":[{"id":"<id>","score":0|1|2,"quote":"<the rep's EXACT words from the transcript, or empty>","why":"<one sentence>"}],
 "closed":true|false,
 "biggest_miss":{"quote":"<exact rep words or empty>","instead":"<one sentence the rep could say verbatim instead>"},
 "objection_missed":<index of the hidden objection the rep handled worst, or -1>,
 "drill":"<one specific thing to practice next round>"${digs.length ? ',\n "uncovered":[{"id":"<id of a fact below>","quote":"<the PROSPECT\'s exact words where it came out>"}]' : ''}}
Scores: 0 = missing, 1 = attempted, 2 = done well. "closed" is true ONLY if the prospect explicitly agreed to buy or to a concrete commitment. Never invent quotes.`,
    `Company: ${w.business.company}. Product: ${w.business.product}.
Company facts the rep may quote (a number that contradicts these is wrong, and fails real_numbers): ${[w.business.price, w.business.proof, w.business.facts].filter(Boolean).join(' | ') || 'none given'}
${digs.length ? `Facts the prospect was hiding (list in "uncovered" only the ones the rep got the prospect to reveal, with the prospect's exact words):\n${digs.map((x) => `- ${x.id}: ${x.label}: ${x.fact}`).join('\n')}\n` : ''}Hidden objections in this call: ${objections.length ? objections.map((o, i) => `[${i}] "${o.says}" (real reason: ${o.really})`).join('; ') : 'none'}

Transcript:
${transcript}`,
  );

  const criteria = items.map((c) => {
    const x = (out.criteria || []).find((y) => y.id === c.id) || {};
    return { id: c.id, part: c.part, name: c.name, why_it_matters: c.why, score: Math.max(0, Math.min(2, Number(x.score) || 0)), quote: verbatim(x.quote, repText), why: String(x.why || '').slice(0, 300) };
  });

  const judged = Math.round((criteria.reduce((n, c) => n + c.score, 0) / (criteria.length * 2)) * 100);
  const reveals = Math.max(0, Number(aids?.reveals) || 0);
  const emergencies = Math.max(0, Number(aids?.emergencies) || 0);
  const aidPenalty = Math.min(10, reveals * 2) + Math.min(16, emergencies * 4);
  const base = adherence === null ? judged : Math.round(judged * 0.8 + adherence * 0.2);
  // Days that ask for a next step: if the rep kept talking after the closing question,
  // the score stops one point under the pass mark (Pirka caps at 7 with a pass of 8).
  const silence = d.parts.some((p) => p === 'pitch' || p === 'close') ? closeSilence(turns) : null;
  const capped = !!(silence?.asked && !silence.waited);
  const raw = Math.max(0, base - aidPenalty);
  const score = capped ? Math.min(raw, PASS_SCORE - 1) : raw;
  // Graduation also needs the script itself, not just good instincts.
  const passed = score >= PASS_SCORE && (d.aid !== 'none' || (adherence ?? 0) >= 50);

  const got = new Map();
  for (const u of Array.isArray(out.uncovered) ? out.uncovered : []) {
    const quote = verbatim(u?.quote, prospectText);
    if (quote && digs.some((x) => x.id === u.id) && !got.has(u.id)) got.set(u.id, quote);
  }
  const uncovered = digs.map((x) => ({ id: x.id, label: x.label, found: got.has(x.id), quote: got.get(x.id) || '' }));

  const missed = Number.isInteger(out.objection_missed) ? objections[out.objection_missed] : null;
  return {
    score,
    passed,
    breakdown: { judged, adherence, aid_penalty: aidPenalty, capped },
    close_silence: silence,
    closed: out.closed === true,
    criteria,
    key_lines: keyLines.map((l, i) => ({ line: l, said: said.includes(i) })),
    aids: { reveals, emergencies },
    biggest_miss: { quote: verbatim(out.biggest_miss?.quote, repText), instead: String(out.biggest_miss?.instead || '').slice(0, 300) },
    objection_missed: missed ? missed.says : null,
    objections: objections.map((o) => o.says),
    drill: String(out.drill || '').slice(0, 300),
    uncovered,
    prospect: persona ? { name: persona.name, role: persona.role } : null,
    talk_ratio: talkTime(turns),
    questions: questionCount(turns),
    model: MODEL(),
  };
}
