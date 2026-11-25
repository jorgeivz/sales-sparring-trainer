// Builds the prospect for one bootcamp day. The ElevenLabs agent is a blank shell: who the
// prospect is, how hard they are and what they are hiding all travel as a per-call override.

import { LEVELS } from './bootcamp.mjs';
import { PART_NAMES } from './checklist.mjs';
import { PERSONALITIES, TOPICS, LEADS, prospectFor } from './persona.mjs';

export const VOICES = {
  // ElevenLabs premade voices (checked by scripts/setup-agent.mjs).
  male: 'JBFqnCBsd6RMkjVDRZzb',
  female: 'EXAVITQu4vr4xnSDxMaL',
};

/** The objections this call hides: the one you handled worst last time goes first. */
export function pickObjections(w, d) {
  if (!d.objections) return [];
  const p = prospectFor(w, d);
  const all = [...(p?.objections?.length ? p.objections : w.objections || [])];
  const weak = all.findIndex((o) => o.says === w.weak_spot);
  if (weak > 0) all.unshift(...all.splice(weak, 1));
  else if (weak < 0) all.sort(() => Math.random() - 0.5);
  return all.slice(0, d.objections);
}

export function buildProspect(w, d) {
  const b = w.business;
  const p = prospectFor(w, d);
  const objections = pickObjections(w, d);
  const scope = d.parts.length === 1
    ? `This practice call is about the rep's ${PART_NAMES[d.parts[0]].toUpperCase()}. Give them room to work on it. Once they are clearly past it, you may wrap up naturally ("OK, send me something" or "let's talk next week").`
    : 'This is a full sales call. Let it run from the opening to a decision.';

  const hidden = objections.length
    ? `You have ${objections.length === 1 ? 'one hidden objection' : 'hidden objections'}. Raise ${objections.length === 1 ? 'it' : 'them'} at natural moments, not all at once, and not in your first two answers:\n${objections.map((o, i) => `${i + 1}. You say something like: "${o.says}". The real reason: ${o.really}`).join('\n')}\nOnly let an objection go if the rep asks about it and answers the real reason.`
    : 'You have no prepared objection today, but you react honestly to what the rep says.';

  const hiddenFacts = Object.entries(p.hidden || {});
  const facts = hiddenFacts.length
    ? `Facts about you that you NEVER volunteer. Share one only when the rep asks about that topic. A vague question gets a vague answer; a specific question gets the specific fact:\n${hiddenFacts.map(([k, v]) => `- ${TOPICS[k] || k}: ${v}`).join('\n')}`
    : '';
  const pains = p.pains?.length
    ? `Your problems, in your words. If asked how things are going, hint at the first one only. The others come out only when the rep asks follow-up questions:\n${p.pains.map((x) => `- ${x.pain}. You say it like: "${x.says}"`).join('\n')}\nIf the rep ties their offer to one of YOUR problems, you get more interested. A generic pitch leaves you cold.`
    : '';
  const words = p.their_words?.length ? `Words you use for your problem: ${p.their_words.map((x) => `"${x}"`).join(', ')}.` : '';
  const lead = w.lead
    ? `How you know them: ${w.lead.context || LEADS[w.lead.type]}${w.lead.type === 'cold' ? ' You were not expecting this call.' : ''}`
    : 'You did show some interest before, so the call is not totally cold.';
  const personality = PERSONALITIES[p.personality];

  const prompt = `You are role-playing a prospect on a sales phone call. You are NOT an assistant. Never help the rep, never coach, never break character, never mention AI or practice.

Who you are: ${p.name}, ${p.role}. ${p.situation}
${words}
Who is calling: a rep from ${b.company}, who sells ${b.product}${b.price ? ` (${b.price})` : ''}. ${lead}

${personality ? `Your personality, every call: ${personality.behavior}\n` : ''}How hard you are today, on top of your personality: ${LEVELS[d.level].behavior}

${pains}

${facts}

${scope}

${hidden}

How you talk: like a real person on the phone. One or two short sentences per turn. Use fillers sometimes ("hmm", "yeah", "I mean"). Never list things. Use your own everyday words for your problem, not sales words. Stay consistent with your facts: never contradict them, never invent new numbers for them.

Ending: ${p.yes_if ? `what it takes for you to agree to a next step: ${p.yes_if} If that happened` : 'If the rep understood you'} and they ask for a clear next step, agree to it. If they keep pitching without listening, end the call politely ("Look, I've got to go").`.replace(/\n{3,}/g, '\n\n');

  return {
    objections,
    persona: p,
    overrides: {
      agent: { prompt: { prompt }, firstMessage: 'Hello?', language: 'en' },
      tts: { voiceId: VOICES[p.voice] || VOICES.male },
      conversation: { maxDurationSeconds: d.minutes * 60 },
    },
  };
}
