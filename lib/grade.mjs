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
Scores: 0 = missing, 1 = attempted, 2 = done well. "closed" is true ONLY if the prospect explicitly agreed to a next step. Never invent quotes.`,
    `Company: ${w.business.company}. Product: ${w.business.product}.
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
  const score = Math.max(0, base - aidPenalty);
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
    breakdown: { judged, adherence, aid_penalty: aidPenalty },
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
    talk_ratio: talkRatio(turns),
    questions: questionCount(turns),
    model: MODEL(),
  };
}
