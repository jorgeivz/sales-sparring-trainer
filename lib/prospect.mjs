// Builds the prospect for one bootcamp day. The ElevenLabs agent is a blank shell: who the
// prospect is, how hard they are and what they are hiding all travel as a per-call override.

import { LEVELS } from './bootcamp.mjs';
import { PART_NAMES } from './checklist.mjs';

export const VOICES = {
  // ElevenLabs premade voices (checked by scripts/setup-agent.mjs).
  male: 'JBFqnCBsd6RMkjVDRZzb',
  female: 'EXAVITQu4vr4xnSDxMaL',
};

/** The objections this call hides: the one you handled worst last time goes first. */
export function pickObjections(w, d) {
  if (!d.objections) return [];
  const all = [...(w.objections || [])];
  const weak = all.findIndex((o) => o.says === w.weak_spot);
  if (weak > 0) all.unshift(...all.splice(weak, 1));
  else if (weak < 0) all.sort(() => Math.random() - 0.5);
  return all.slice(0, d.objections);
}

export function buildProspect(w, d) {
  const b = w.business;
  const p = w.persona;
  const objections = pickObjections(w, d);
  const scope = d.parts.length === 1
    ? `This practice call is about the rep's ${PART_NAMES[d.parts[0]].toUpperCase()}. Give them room to work on it. Once they are clearly past it, you may wrap up naturally ("OK, send me something" or "let's talk next week").`
    : 'This is a full sales call. Let it run from the opening to a decision.';

  const hidden = objections.length
    ? `You have ${objections.length === 1 ? 'one hidden objection' : 'hidden objections'}. Raise ${objections.length === 1 ? 'it' : 'them'} at natural moments, not all at once, and not in your first two answers:\n${objections.map((o, i) => `${i + 1}. You say something like: "${o.says}". The real reason: ${o.really}`).join('\n')}\nOnly let an objection go if the rep asks about it and answers the real reason.`
    : 'You have no prepared objection today, but you react honestly to what the rep says.';

  const prompt = `You are role-playing a prospect on a sales phone call. You are NOT an assistant. Never help the rep, never coach, never break character, never mention AI or practice.

Who you are: ${p.name}, ${p.role}. ${p.situation}
Who is calling: a rep from ${b.company}, who sells ${b.product}${b.price ? ` (${b.price})` : ''}. You did show some interest before, so the call is not totally cold.

How hard you are today: ${LEVELS[d.level].behavior}

${scope}

${hidden}

How you talk: like a real person on the phone. One or two short sentences per turn. Use fillers sometimes ("hmm", "yeah", "I mean"). Never list things. Use your own everyday words for your problem, not sales words.

Ending: if the rep understood you and asks for a clear next step, agree to it. If they keep pitching without listening, end the call politely ("Look, I've got to go").`;

  return {
    objections,
    overrides: {
      agent: { prompt: { prompt }, firstMessage: 'Hello?', language: 'en' },
      tts: { voiceId: VOICES[p.voice] || VOICES.male },
      conversation: { maxDurationSeconds: d.minutes * 60 },
    },
  };
}
