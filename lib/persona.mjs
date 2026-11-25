// Builds the prospects the rep calls, from the business and the locked script.
// Two people: the MAIN prospect (days 1-5, so the rep learns to read one person) and a
// harder FINAL prospect (days 6-7, so graduation is against a stranger).
// Each one is built so discovery has something real to find:
//   pains   - the problems the script's pitch solves, planted in the prospect, in their words
//   hidden  - one fact per discovery topic, shared only when the rep asks about that topic
//   yes_if  - what makes this person agree to a next step

import { askJson, verbatim } from './llm.mjs';
import { PARTS } from './checklist.mjs';

const clip = (s, n) => String(s ?? '').replace(/\r/g, '').trim().slice(0, n);

/** Style of the person. Stays the same every call; the day's difficulty is added on top. */
export const PERSONALITIES = {
  friendly: { name: 'Friendly', behavior: 'Warm and open. Once you trust the rep you talk easily and give examples from your own life.' },
  analytical: { name: 'Analytical', behavior: 'You want specifics: numbers, how it works, what exactly it costs. Vague claims make you doubtful and you ask for details.' },
  chatty: { name: 'Chatty', behavior: 'You drift into side stories. The rep has to steer you back politely. You are friendly but hard to keep on topic.' },
  rushed: { name: 'Rushed', behavior: 'You are busy and say so. Short answers. You only open up if the rep gets to the point fast and asks about you, not about the product.' },
  skeptical: { name: 'Skeptical', behavior: 'A salesperson burned you before. You question claims ("how do I know that?") and you trust questions more than promises.' },
};
const MAIN_TYPES = ['friendly', 'analytical', 'chatty'];
const FINAL_TYPES = ['rushed', 'skeptical'];

/** What a good discovery uncovers. One hidden fact per topic. */
export const TOPICS = {
  today: 'How they handle it today',
  cost: 'What the problem costs them',
};
// What each topic's fact must contain, so two facts never say the same thing.
const TOPIC_RULES = {
  today: 'what they use or do today about the problem, and what that is like day to day (not the money)',
  cost: 'what the problem costs them in money, time or stress, with a number',
  tried: 'something they already tried or looked at, and why it did not work out',
  goal: 'the concrete result they want, with a number if it fits',
  timeline: 'why they are looking now, and by when they want it solved',
  decision: 'who else has a say, and how they will decide',
  budget: 'what they can afford, with a number',
};
Object.assign(TOPICS, {
  tried: 'What they already tried',
  goal: 'Where they want to be',
  timeline: 'Why now, and by when',
  decision: 'Who else decides',
  budget: 'What they can spend',
});

export const LEADS = {
  cold: 'Cold: they have never heard of you',
  inbound: 'Inbound: they asked to be contacted',
  referral: 'Referral: someone they know sent you',
};

const SHAPE = `{"name":"<first name and last name>","role":"<who they are, a few words>","voice":"male|female",
 "personality":"<type>",
 "situation":"<2-3 sentences: their life or business, as they would describe it to a stranger. No hidden facts here.>",
 "their_words":["<2-3 short phrases they use for their problem, everyday words, not sales words>"],
 "pains":[{"pain":"<the problem>","says":"<how they say it>","solved_by":"<3 to 12 words copied EXACTLY from the script's PITCH that answer THIS pain and no other>"}],
 "hidden":{${Object.entries(TOPIC_RULES).map(([k, v]) => `"${k}":"<${v}>"`).join(',')}},
 "yes_if":"<what has to happen on the call for them to agree to a next step>",
 "objections":[{"says":"<what they say>","really":"<the real reason, true to THIS person>"}]}`;

const RULES = `Rules for a prospect:
- A real, ordinary person who matches "who they call". Not a caricature, not a perfect buyer.
- 2 or 3 pains, each one a problem the script's PITCH solves. "solved_by" must be words copied exactly from the pitch, and each pain gets a different phrase.
- Hidden facts are specific and consistent with each other and with the situation (numbers add up). Each fact says something new: never repeat a number or idea from another fact.
- The situation must NOT give away the hidden facts: those are for the rep to find with questions.
- "yes_if" must be reachable inside one phone call: things the rep can ask, say or confirm. Never documents, references or quotes sent before the call ends.
- 4 objections this person would really raise, each consistent with their facts (someone who lives alone never says "my spouse").
- Do not invent facts about the company. Only about the prospect.`;

const scriptText = (script) => PARTS.map((p) => `### ${p}\n${script.parts[p].text}`).join('\n\n');
const businessText = (b) =>
  `Company: ${b.company}\nWhat they sell: ${b.product}\nWho they call: ${b.customer}\nPrice: ${b.price || 'not given'}\nWhy customers buy / proof: ${b.proof || 'not given'}`;

const cleanObjections = (list) => (Array.isArray(list) ? list : [])
  .map((o) => ({ says: clip(o?.says, 200), really: clip(o?.really, 240) })).filter((o) => o.says).slice(0, 5);

function clean(raw, allowed, pitch) {
  const r = raw || {};
  const personality = allowed.includes(r.personality) ? r.personality : allowed[0];
  const hidden = Object.fromEntries(Object.keys(TOPICS).map((k) => [k, clip(r.hidden?.[k], 300)]).filter(([, v]) => v));
  return {
    name: clip(r.name, 40) || 'Alex',
    role: clip(r.role, 120),
    voice: r.voice === 'female' ? 'female' : 'male',
    personality,
    situation: clip(r.situation, 600),
    their_words: (Array.isArray(r.their_words) ? r.their_words : []).map((x) => clip(x, 120)).filter(Boolean).slice(0, 3),
    pains: (Array.isArray(r.pains) ? r.pains : []).map((x) => ({ pain: clip(x?.pain, 200).replace(/[.\s]+$/, ''), says: clip(x?.says, 200), solved_by: verbatim(x?.solved_by, pitch) })).filter((x) => x.pain).slice(0, 3),
    hidden,
    yes_if: clip(r.yes_if, 300),
    objections: cleanObjections(r.objections),
  };
}

function cleanLead(raw) {
  const type = LEADS[raw?.type] ? raw.type : 'inbound';
  return { type, context: clip(raw?.context, 240) };
}

/** Both prospects, the lead type and the objection pool, in one call so the two people differ. */
export async function buildProspects(business, script, reviewObjections) {
  const out = await askJson(
    `You create the practice prospects for a 7-day phone sales bootcamp, from a business and its locked sales script.
1. Read the script's OPENER and decide what kind of lead this script is written for: "cold", "inbound" or "referral". Write one sentence on how the prospect knows the company (for example "filled out the web form on Tuesday").
2. Create the MAIN prospect (days 1-5). Personality: one of ${MAIN_TYPES.join(', ')}.
3. Create the FINAL prospect (days 6-7): a DIFFERENT person, same kind of lead. Personality: one of ${FINAL_TYPES.join(', ')}. Make them differ from the main prospect in life or business situation, numbers, history and who decides. Their pains are still problems the pitch solves, but put a DIFFERENT pain first and word every pain differently: no pain may be a rewording of the main prospect's.
Each prospect gets their own 4 objections. Use the likely objections from the review where they fit that person.
${RULES}
Return JSON:
{"lead":{"type":"cold|inbound|referral","context":"..."},
 "main":${SHAPE},
 "final":${SHAPE}}`,
    `${businessText(business)}\n\nLikely objections from the review: ${(reviewObjections || []).join(' | ') || 'none'}\n\nSCRIPT:\n${scriptText(script)}`,
  );
  const pitch = script.parts.pitch.text;
  const persona = clean(out.main, MAIN_TYPES, pitch);
  return { lead: cleanLead(out.lead), persona, persona_final: clean(out.final, FINAL_TYPES, pitch), objections: persona.objections };
}

/** A new version of one prospect. `steer` is the owner's note ("make her a small landlord"). */
export async function rebuildProspect(w, which, steer) {
  const other = which === 'final' ? w.persona : w.persona_final;
  const allowed = which === 'final' ? FINAL_TYPES : MAIN_TYPES;
  const out = await askJson(
    `You create one practice prospect for a phone sales bootcamp, from a business and its locked sales script.
This is the ${which === 'final' ? 'FINAL prospect (days 6-7, harder)' : 'MAIN prospect (days 1-5)'}. Personality: one of ${allowed.join(', ')}.
The lead: ${LEADS[w.lead?.type || 'inbound']}. ${w.lead?.context || ''}
${other ? `It must be a different person from ${other.name} (${other.role}).` : ''}
${steer ? `The business owner asked for this, follow it: "${clip(steer, 400)}"` : 'Make a fresh person, not a copy of the previous one.'}
${RULES}
Return JSON: ${SHAPE}`,
    `${businessText(w.business)}\n\nSCRIPT:\n${scriptText(w.script)}`,
  );
  return clean(out, allowed, w.script.parts.pitch.text);
}

/** Owner edits from the prospect card. Hidden facts and pains are only changed by a rebuild. */
export function editProspect(p, body) {
  const next = { ...p };
  if (typeof body.name === 'string' && body.name.trim()) next.name = clip(body.name, 40);
  if (typeof body.role === 'string') next.role = clip(body.role, 120);
  if (typeof body.situation === 'string') next.situation = clip(body.situation, 600);
  if (PERSONALITIES[body.personality]) next.personality = body.personality;
  if (body.voice === 'male' || body.voice === 'female') next.voice = body.voice;
  return next;
}

/** Which prospect a bootcamp day uses. Old workspaces have only one. */
export const prospectFor = (w, d) => (d.prospect === 'final' && w.persona_final ? w.persona_final : w.persona);
