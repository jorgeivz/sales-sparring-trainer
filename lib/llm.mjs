// One JSON-in, JSON-out call to a model through the OpenRouter connector.
import { call } from './upstream.mjs';

export const MODEL = () => process.env.LLM_MODEL || process.env.GRADE_MODEL || 'openai/gpt-5-mini';

export async function askJson(system, user, { timeoutMs = 90000 } = {}) {
  const r = await call('openrouter', '/v1/chat/completions', {
    method: 'POST',
    timeoutMs,
    body: {
      model: MODEL(),
      response_format: { type: 'json_object' },
      // Reasoning models think for a long time by default; these tasks don't need it.
      reasoning: { effort: process.env.LLM_EFFORT || 'low' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    },
  });
  if (!r.ok || !r.json) throw new Error(`model call failed: ${r.status} ${r.text.slice(0, 200)}`);
  const content = r.json.choices?.[0]?.message?.content ?? '';
  try {
    return JSON.parse(content.replace(/^```(json)?\s*|\s*```$/g, ''));
  } catch {
    throw new Error('model returned non-JSON');
  }
}

/** Normalized text, for checking that a quote really appears in a source text. */
export const flat = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** The quote if it really appears in `source`, else ''. Models invent quotes; we do not show those. */
export function verbatim(quote, source) {
  const q = flat(quote);
  return q.length > 3 && flat(source).includes(q) ? String(quote).trim() : '';
}
