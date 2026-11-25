// Builds the simulated prospect the rep will call. The agent on ElevenLabs is a blank
// shell; everything that makes it a person comes from here as a per-call override.

export const VOICES = {
  // ElevenLabs premade voices (checked by scripts/setup-agent.mjs).
  male: 'JBFqnCBsd6RMkjVDRZzb',
  female: 'EXAVITQu4vr4xnSDxMaL',
};

export const LEVELS = {
  warm: {
    label: 'Warm',
    rule: 'You asked for information, so you are open. You raise your concern only once, mildly, and you accept a reasonable answer.',
  },
  skeptical: {
    label: 'Skeptical',
    rule: 'You are polite but guarded. You give short answers until the rep asks a real question about your situation. You raise your concern clearly and push back once on the first answer.',
  },
  brutal: {
    label: 'Brutal',
    rule: 'You are busy and slightly annoyed you picked up. You interrupt pitches, you say "just send me an email" early, and you only stay on the call if the rep earns it within the first 30 seconds. You push back twice on your concern.',
  },
};

export const PRESETS = [
  {
    id: 'solar',
    product: 'Home solar panels with financing, sold by a local installer',
    prospect: 'Dana, a homeowner who filled out a web form about solar two days ago',
    concern: 'She thinks the monthly loan payment will end up higher than her current power bill.',
    voice: 'female',
  },
  {
    id: 'saas',
    product: 'A scheduling and dispatch app for HVAC companies, $49 per technician per month',
    prospect: 'Mike, operations manager at an HVAC company with 14 technicians, who downloaded a guide',
    concern: 'He already uses spreadsheets and a group chat, and his techs hate learning new apps.',
    voice: 'male',
  },
  {
    id: 'gym',
    product: 'A 12-week personal training package at a neighborhood gym',
    prospect: 'Chris, who took a free trial class last week',
    concern: 'He has bought training packages before and quit after three weeks.',
    voice: 'male',
  },
];

const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export function buildProspect(input) {
  const preset = PRESETS.find((p) => p.id === input?.preset);
  const product = clip(input?.product || preset?.product, 300);
  const prospect = clip(input?.prospect || preset?.prospect, 300);
  const concern = clip(input?.concern || preset?.concern, 300);
  const level = LEVELS[input?.level] ? input.level : 'skeptical';
  const voice = VOICES[input?.voice || preset?.voice] ? input?.voice || preset?.voice : 'male';
  if (!product || !prospect || !concern) return null;

  const prompt = `You are role-playing a prospect on a sales phone call. You are NOT an assistant. Never help the rep, never coach, never break character, never mention AI.

Who you are: ${prospect}.
What the rep is selling: ${product}.
Your hidden concern: ${concern}
Do not reveal the hidden concern in your first answers. Reveal it only when the rep asks a genuine question about your situation, or when they try to close.

Difficulty: ${LEVELS[level].rule}

How you talk: like a real person on the phone. One or two short sentences per turn. Use fillers sometimes ("hmm", "yeah", "I mean"). Do not list things. Do not ask the rep more than one question at a time.

Ending: if the rep handles your concern well and asks for a clear next step, agree to it. If they keep pitching without listening, politely end the call ("Look, I have to go").`;

  return {
    level,
    voice,
    summary: { product, prospect, concern, level: LEVELS[level].label },
    overrides: {
      agent: { prompt: { prompt }, firstMessage: 'Hello?', language: 'en' },
      tts: { voiceId: VOICES[voice] },
    },
  };
}
