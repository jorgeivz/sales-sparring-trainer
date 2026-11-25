// ElevenLabs Conversational AI: one-use call tokens and finished transcripts.

import { call } from './upstream.mjs';

const agentId = () => {
  const id = process.env.ELEVENLABS_AGENT_ID;
  if (!id) throw new Error('Missing ELEVENLABS_AGENT_ID (run scripts/setup-agent.mjs)');
  return id;
};

export async function callToken() {
  const r = await call('elevenlabs', `/v1/convai/conversation/token?agent_id=${agentId()}`);
  if (!r.ok || !r.json?.token) throw new Error(`token failed: ${r.status} ${r.text.slice(0, 300)}`);
  return r.json.token;
}

// The silent room gets transcribed as "..." turns; those are not speech.
const isNoise = (s) => !/[\p{L}\p{N}]/u.test(String(s ?? ''));

/** null = not ready yet (the caller polls). */
export async function transcript(conversationId) {
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(conversationId)) throw new Error('bad conversation id');
  const r = await call('elevenlabs', `/v1/convai/conversations/${conversationId}`);
  if (r.status === 404) return null;
  if (!r.ok || !r.json) throw new Error(`transcript failed: ${r.status}`);
  if (r.json.status !== 'done' && r.json.status !== 'failed') return null;
  const turns = (r.json.transcript || [])
    .map((t) => ({ role: t.role === 'agent' ? 'prospect' : 'rep', text: String(t.message ?? '').trim(), at: t.time_in_call_secs }))
    .filter((t) => !isNoise(t.text));
  return { turns, seconds: Number(r.json.metadata?.call_duration_secs) || 0 };
}
