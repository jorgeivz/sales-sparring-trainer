// Creates (or re-applies) the blank ElevenLabs agent and checks it by reading it back.
// Works on the Sprite (through the connector) or on a laptop with MODE=direct.
//   node scripts/setup-agent.mjs        -> prints ELEVENLABS_AGENT_ID=... for .env

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}
const { call } = await import('../lib/upstream.mjs');
const { VOICES } = await import('../lib/prospect.mjs');

const PLACEHOLDER = 'You are a placeholder. Say only: "The prospect was not loaded." Then stay silent.';

const CONFIG = {
  name: 'Sales Sparring Trainer - prospect',
  conversation_config: {
    agent: { language: 'en', first_message: 'Hello?', prompt: { prompt: PLACEHOLDER, llm: process.env.VOICE_LLM || 'gpt-6-luna' } },
    tts: { model_id: 'eleven_flash_v2', voice_id: VOICES.male },
    turn: { turn_model: 'turn_v3', turn_eagerness: 'patient', turn_timeout: 3.0 },
    conversation: { max_duration_seconds: 300 },
  },
  platform_settings: {
    auth: { enable_auth: true },
    privacy: { record_voice: true, retention_days: 30, delete_audio: true },
    overrides: {
      conversation_config_override: {
        agent: { first_message: true, language: true, prompt: { prompt: true } },
        tts: { voice_id: true },
        conversation: { max_duration_seconds: true },
      },
    },
  },
};

async function must(p, opts) {
  const r = await call('elevenlabs', p, opts);
  if (!r.ok) throw new Error(`${r.status} ${p}\n${r.text.slice(0, 500)}`);
  return r.json;
}

for (const [name, id] of Object.entries(VOICES)) {
  const v = await call('elevenlabs', `/v1/voices/${id}`);
  console.log(`voice ${name} ${id}: ${v.ok ? v.json?.name : `MISSING (${v.status})`}`);
}

let id = process.env.ELEVENLABS_AGENT_ID;
if (!id) {
  id = (await must('/v1/convai/agents/create', { method: 'POST', body: CONFIG })).agent_id;
  console.log('created agent', id);
}
await must(`/v1/convai/agents/${id}`, { method: 'PATCH', body: CONFIG });

const a = await must(`/v1/convai/agents/${id}`);
const ov = a.platform_settings?.overrides?.conversation_config_override ?? {};
const checks = [
  ['language', a.conversation_config?.agent?.language, 'en'],
  ['llm', a.conversation_config?.agent?.prompt?.llm, CONFIG.conversation_config.agent.prompt.llm],
  ['turn_model', a.conversation_config?.turn?.turn_model, 'turn_v3'],
  ['auth', a.platform_settings?.auth?.enable_auth, true],
  ['override prompt', ov.agent?.prompt?.prompt, true],
  ['override first_message', ov.agent?.first_message, true],
  ['override voice', ov.tts?.voice_id, true],
  ['override max_duration', ov.conversation?.max_duration_seconds, true],
];
let ok = true;
for (const [k, real, want] of checks) {
  const pass = real === want;
  ok &&= pass;
  console.log(`[${pass ? 'OK' : 'FAIL'}] ${k} = ${JSON.stringify(real)}`);
}
console.log(`\nELEVENLABS_AGENT_ID=${id}`);
process.exit(ok ? 0 : 1);
