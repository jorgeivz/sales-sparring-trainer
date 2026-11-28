// Builds the prospects the rep calls, from the business and the locked script.
// One NEW person per bootcamp day, each in the day's scenario (lib/bootcamp.mjs `who`), so the
// calls get harder and more varied. All automatic: the rep never picks or edits who they call.
// Each one is built so discovery has something real to find:
//   pains   - the problems the script's pitch solves, planted in the prospect, in their words
//   hidden  - one fact per discovery topic, shared only when the rep asks about that topic
//   yes_if  - what makes this person say yes and buy on the call

import crypto from 'node:crypto';
import { askJson, verbatim } from './llm.mjs';
import { PARTS } from './checklist.mjs';
import { DAYS } from './bootcamp.mjs';

const clip = (s, n) => String(s ?? '').replace(/\r/g, '').trim().slice(0, n);

/** Style of the person. Stays the same every call; the day's difficulty is added on top. */
export const PERSONALITIES = {
  friendly: { name: 'Friendly', behavior: 'Warm and open. Once you trust the rep you talk easily and give examples from your own life.' },
  analytical: { name: 'Analytical', behavior: 'You want specifics: numbers, how it works, what exactly it costs. Vague claims make you doubtful and you ask for details.' },
  chatty: { name: 'Chatty', behavior: 'You drift into side stories. The rep has to steer you back politely. You are friendly but hard to keep on topic.' },
  rushed: { name: 'Rushed', behavior: 'You are busy and say so. Short answers. You only open up if the rep gets to the point fast and asks about you, not about the product.' },
  cautious: { name: 'Cautious', behavior: 'Careful with money and commitments. You like the idea but you are afraid of making a mistake, so you ask what happens if it goes wrong.' },
  skeptical: { name: 'Skeptical', behavior: 'A salesperson burned you before. You question claims ("how do I know that?") and you trust questions more than promises.' },
};

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
 "yes_if":"<what has to happen on the call for them to say yes and buy, on this call>",
 "objections":[{"says":"<what they say>","really":"<the real reason, true to THIS person>"}]}`;

const RULES = `Rules for a prospect:
- A real, ordinary person who matches "who they call". Not a caricature, not a perfect buyer.
- 2 or 3 pains, each one a problem the script's PITCH solves. "solved_by" must be words copied exactly from the pitch, and each pain gets a different phrase.
- Hidden facts are specific and consistent with each other and with the situation (numbers add up). Each fact says something new: never repeat a number or idea from another fact.
- The situation must NOT give away the hidden facts: those are for the rep to find with questions.
- "yes_if" must be reachable inside one phone call: things the rep can ask, say or confirm. Never documents, references or quotes sent before the call ends.
- 4 objections this person would really raise, each consistent with their facts (someone who lives alone never says "my spouse").
- Do not invent facts about the company. Only about the prospect.
- This is a full sale on one call: the rep is expected to answer price, payment, guarantee and timing questions on the call. The questions this person cares about (and "yes_if") may only need numbers and facts that appear in the business info above. Never require a number or a promise the business info does not give. If the business gives no numbers, "yes_if" is about feeling understood and a concrete commitment, not about figures.`;

const scriptText = (script) => PARTS.map((p) => `### ${p}\n${script.parts[p].text}`).join('\n\n');
/** The business as every prompt sees it. `facts` is the rep's sheet: numbers, terms, guarantees. */
export const businessText = (b) =>
  `Company: ${b.company}\nWhat they sell: ${b.product}\nWho they call: ${b.customer}\nPrice: ${b.price || 'not given'}\nWhy customers buy / proof: ${b.proof || 'not given'}\nNumbers and facts the rep can quote: ${b.facts ? `\n${b.facts}` : 'not given'}`;

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

// ElevenLabs premade voices, all American. Premade voices do not carry the
// `live_moderation_enabled` flag that drops a call on connect (checked 2026-11-27 via
// GET /v2/voices?category=premade). Warmth follows the day's difficulty, like Pirka's trainer.
export const VOICE_BANK = [
  // [voice_id, name, gender, warmth]   warmth: warm | neutral | hard
  ['cgSgspJ2msm6clMCkdW9', 'Jessica', 'female', 'warm'],
  ['hpp4J3VqNfWAUOO0d1Us', 'Bella', 'female', 'warm'],
  ['XrExE9yKIg1WjnnlVkGX', 'Matilda', 'female', 'neutral'],
  ['EXAVITQu4vr4xnSDxMaL', 'Sarah', 'female', 'hard'],
  ['FGY2WhTYpPnrIDTdsKH5', 'Laura', 'female', 'hard'],
  ['iP95p4xoKVk53GoZ742B', 'Chris', 'male', 'warm'],
  ['bIHbv24MWmeRgasZH58o', 'Will', 'male', 'warm'],
  ['cjVigY5qzO86Huf0OWal', 'Eric', 'male', 'neutral'],
  ['CwhRBWXzGAHq8TQ4Fs17', 'Roger', 'male', 'neutral'],
  ['pNInz6obpgDQGcFmaJgB', 'Adam', 'male', 'hard'],
  ['pqHfZKP75CvOlQylNhV4', 'Bill', 'male', 'hard'],
];
const WARMTH = { 1: ['warm'], 2: ['warm', 'neutral'], 3: ['neutral', 'hard'], 4: ['hard', 'neutral'] };

/** A voice for this difficulty and gender, avoiding the ones in `avoid` when possible. */
export function pickVoice(level, gender, avoid = [], rnd = Math.random) {
  const fits = VOICE_BANK.filter((v) => v[2] === gender && WARMTH[level].includes(v[3]));
  const pool = [fits.filter((v) => !avoid.includes(v[0])), fits, VOICE_BANK.filter((v) => v[2] === gender)].find((x) => x.length);
  return pool[Math.floor(rnd() * pool.length)][0];
}

// Different first letters, so the people on one ladder never share a name.
const INITIALS = ['M', 'D', 'R', 'J', 'T', 'S', 'K', 'A', 'L', 'C', 'N', 'E'];
const LAST_INITIALS = ['B', 'C', 'H', 'L', 'P', 'W', 'N', 'G', 'F', 'R', 'S', 'M'];
const rand = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * One prospect. `ctx` = {business, script, lead, problems, objections}. `opts` says who:
 *   who       {personality, voice (gender), scenario}
 *   level     difficulty 1-4 (picks the voice's warmth)
 *   firstPain the pitch problem this person leads with (variety is decided here, in code:
 *             left to the model, every person led with the same pain)
 *   initials  [first, last] letters of the name
 *   voiceId   the ElevenLabs voice
 */
async function buildOne(ctx, d, opts) {
  const { business, script, lead, objections } = ctx;
  const { personality, voice, scenario } = opts.who;
  const out = await askJson(
    `You create one practice prospect for a phone sales bootcamp, from a business and its locked sales script.
Every call the rep talks to a NEW person. This person:
- Personality: ${PERSONALITIES[personality].name}. ${PERSONALITIES[personality].behavior}
- Scenario: ${scenario}
- Voice: ${voice}. First name starts with "${opts.initials[0]}", last name with "${opts.initials[1]}". A full last name, never just an initial.
${opts.firstPain ? `- Their FIRST and biggest pain is this problem the pitch solves: "${opts.firstPain}". Any other pain is a different problem.\n` : ''}The lead: ${LEADS[lead.type]}. ${lead.context}
Give them 4 objections that fit THIS person and scenario. Use the likely objections from the review where they fit.
${RULES}
Return JSON: ${SHAPE}`,
    `${businessText(business)}\n\nLikely objections from the review: ${(objections || []).join(' | ') || 'none'}\n\nSCRIPT:\n${scriptText(script)}`,
  );
  const p = clean({ ...out, personality, voice }, [personality], script.parts.pitch.text);
  return { ...p, pid: crypto.randomUUID(), day: d.n, scenario, level: opts.level, voice_id: opts.voiceId };
}

/** The whole ladder: one prospect per day, built in parallel. A failed day gets one retry. */
export async function buildLadder(ctx) {
  const used = [];
  const plans = DAYS.map((d, i) => {
    const voiceId = pickVoice(d.level, d.who.voice, used);
    used.push(voiceId);
    const problems = ctx.problems || [];
    return { d, opts: { who: d.who, level: d.level, voiceId, initials: [INITIALS[i], LAST_INITIALS[i]], firstPain: problems.length ? problems[i % problems.length] : '' } };
  });
  const make = ({ d, opts }) => buildOne(ctx, d, opts);
  const first = await Promise.allSettled(plans.map(make));
  const people = await Promise.all(first.map((r, i) => (r.status === 'fulfilled' ? r.value : make(plans[i]))));
  return Object.fromEntries(people.map((p) => [p.day, p]));
}

/** What buildOne needs, from a saved workspace. */
export const contextOf = (w) => ({ business: w.business, script: w.script, lead: w.lead || { type: 'inbound', context: '' }, problems: w.pitch_problems || [], objections: w.diagnosis?.objections || [] });

/**
 * A NEW person for a day the rep already played (same scenario and difficulty, different
 * life, facts, name and voice), or for free practice (`free`: any scenario, level 2-4).
 */
export async function buildFresh(w, d, free = null) {
  const old = prospectFor(w, d);
  const gender = Math.random() < 0.5 ? 'female' : 'male';
  const who = free ? { ...free.who, voice: gender } : { ...d.who, voice: gender };
  const level = free ? free.level : d.level;
  // Avoid the initials everyone else on this workspace already has.
  const names = Object.values(w.prospects || {}).map((x) => String(x?.name || '').split(' '));
  const letters = (list, taken) => { const free = list.filter((x) => !taken.includes(x)); return rand(free.length ? free : list); };
  const problems = w.pitch_problems || [];
  return buildOne(contextOf(w), d, {
    who, level,
    voiceId: pickVoice(level, gender, [old?.voice_id]),
    initials: [letters(INITIALS, names.map((n) => n[0]?.[0])), letters(LAST_INITIALS, names.map((n) => n[1]?.[0]))],
    firstPain: problems.length ? rand(problems) : '',
  });
}

export const cleanLead = (raw) => ({ type: LEADS[raw?.type] ? raw.type : 'inbound', context: clip(raw?.context, 240) });
export const cleanProblems = (list) => (Array.isArray(list) ? list : []).map((x) => clip(x, 160)).filter(Boolean).slice(0, 5);

/** Which prospect a bootcamp day uses. Workspaces from before the ladder had two people. */
export const prospectFor = (w, d) => w.prospects?.[d.n] || (d.n >= 6 && w.persona_final ? w.persona_final : w.persona);
