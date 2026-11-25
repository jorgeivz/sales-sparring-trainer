// Scores a finished call. The model must quote the rep's exact words as evidence;
// a quote that is not in the transcript is thrown away, so the score cannot cite
// things the rep never said.

import { call } from './upstream.mjs';

export const RUBRIC = [
  ['opener', 'Opening', 'Introduced themselves and the reason for the call, and earned permission to continue.'],
  ['discovery', 'Discovery', 'Asked open questions about the prospect’s situation before pitching.'],
  ['listening', 'Listening', 'Reflected back what the prospect said instead of jumping to the next line.'],
  ['concern', 'Handling the concern', 'Found the hidden concern and answered it with a question or specifics, not pressure.'],
  ['value', 'Value', 'Tied the product to something the prospect actually said, not a generic feature list.'],
  ['next_step', 'Next step', 'Asked for a clear, specific next step (time, date, action).'],
];

const MODEL = () => process.env.GRADE_MODEL || 'openai/gpt-5-mini';

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function talkRatio(turns) {
  const words = (who) => turns.filter((t) => t.role === who).reduce((n, t) => n + t.text.split(/\s+/).length, 0);
  const rep = words('rep');
  const total = rep + words('prospect');
  return total ? Math.round((rep / total) * 100) : 0;
}

export function questionCount(turns) {
  return turns.filter((t) => t.role === 'rep').reduce((n, t) => n + (t.text.match(/\?/g) || []).length, 0);
}

export async function grade(turns, summary) {
  const transcript = turns.map((t) => `${t.role === 'rep' ? 'REP' : 'PROSPECT'}: ${t.text}`).join('\n');
  const rubric = RUBRIC.map(([id, name, desc]) => `- ${id} (${name}): ${desc}`).join('\n');

  const r = await call('openrouter', '/v1/chat/completions', {
    method: 'POST',
    timeoutMs: 60000,
    body: {
      model: MODEL(),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a strict, fair sales coach. Score a practice call. Return JSON only:
{"criteria":[{"id":"<id>","score":0-2,"quote":"<the rep's EXACT words copied from the transcript, or empty>","why":"<one sentence>"}],
 "closed":true|false,
 "biggest_miss":{"quote":"<exact rep words or empty>","instead":"<what to say instead, one sentence the rep could say verbatim>"},
 "drill":"<one specific thing to practice on the next call>"}
Scores: 0 = missing, 1 = attempted, 2 = done well. "closed" is true ONLY if the prospect explicitly agreed to a next step. Never invent quotes.`,
        },
        {
          role: 'user',
          content: `Product: ${summary.product}\nProspect: ${summary.prospect}\nHidden concern: ${summary.concern}\n\nRubric:\n${rubric}\n\nTranscript:\n${transcript}`,
        },
      ],
    },
  });
  if (!r.ok || !r.json) throw new Error(`grading failed: ${r.status} ${r.text.slice(0, 300)}`);
  let out;
  try {
    out = JSON.parse(r.json.choices?.[0]?.message?.content ?? '');
  } catch {
    throw new Error('grading returned non-JSON');
  }

  const repText = norm(turns.filter((t) => t.role === 'rep').map((t) => t.text).join(' '));
  const verified = (q) => (q && norm(q).length > 3 && repText.includes(norm(q)) ? q : '');

  const criteria = RUBRIC.map(([id, name]) => {
    const c = (out.criteria || []).find((x) => x.id === id) || {};
    const score = Math.max(0, Math.min(2, Number(c.score) || 0));
    return { id, name, score, quote: verified(c.quote), why: String(c.why || '') };
  });
  const total = Math.round((criteria.reduce((n, c) => n + c.score, 0) / (RUBRIC.length * 2)) * 100);

  return {
    score: total,
    closed: out.closed === true,
    criteria,
    biggest_miss: { quote: verified(out.biggest_miss?.quote), instead: String(out.biggest_miss?.instead || '') },
    drill: String(out.drill || ''),
    talk_ratio: talkRatio(turns),
    questions: questionCount(turns),
    model: MODEL(),
  };
}
