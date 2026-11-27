// The script workshop: write a first draft, diagnose a script against the checklist,
// apply the changes the owner accepts, and lock it for the bootcamp.
// Every model output that claims to quote the script is checked against the script.

import { askJson, verbatim, flat } from './llm.mjs';
import { CHECKLIST, PARTS, PART_NAMES } from './checklist.mjs';
import { buildLadder, cleanLead } from './persona.mjs';

export const MAX_SCRIPT_CHARS = 8000;

const clip = (s, n) => String(s ?? '').replace(/\r/g, '').trim().slice(0, n);

export function cleanBusiness(b) {
  const out = {
    company: clip(b?.company, 80),
    product: clip(b?.product, 300),
    customer: clip(b?.customer, 300),
    price: clip(b?.price, 120),
    proof: clip(b?.proof, 300),
  };
  return out.company && out.product && out.customer ? out : null;
}

const businessText = (b) =>
  `Company: ${b.company}\nWhat they sell: ${b.product}\nWho they call: ${b.customer}\nPrice: ${b.price || 'not given'}\nWhy customers buy / proof: ${b.proof || 'not given'}`;

const checklistText = (field) =>
  PARTS.map((p) => `${PART_NAMES[p]}:\n${CHECKLIST.filter((c) => c.part === p).map((c) => `  - ${c.id}: ${c[field]}`).join('\n')}`).join('\n');

const emptyParts = () => Object.fromEntries(PARTS.map((p) => [p, { text: '', key_lines: [] }]));

/** A first script for a business that has none, written to pass the checklist. */
export async function draft(business) {
  const out = await askJson(
    `You write phone sales scripts for small businesses. Plain spoken English, short sentences, things a person can actually say out loud.
Write a script in four parts that meets every item of this checklist:
${checklistText('in_script')}
Use {name} where the prospect's name goes. Do not invent statistics, awards or customer names.
Return JSON: {"opener":"...","discovery":"...","pitch":"...","close":"..."}. Each part is the words the rep says, with questions on their own lines.`,
    businessText(business),
  );
  const parts = emptyParts();
  for (const p of PARTS) parts[p].text = clip(out[p], 2500);
  if (!PARTS.every((p) => parts[p].text)) throw new Error('The draft came back incomplete. Try again.');
  return { parts, version: 1, locked: false, source: 'draft' };
}

/** Split a pasted script into the four parts, verbatim. */
export async function split(raw) {
  const out = await askJson(
    `Split a sales script into four parts: opener, discovery, pitch, close. Copy the text EXACTLY as written, do not fix or rephrase anything. If a part is missing, return "" for it.
Return JSON: {"opener":"...","discovery":"...","pitch":"...","close":"..."}`,
    raw,
  );
  const parts = emptyParts();
  for (const p of PARTS) parts[p].text = clip(out[p], 3000);
  return { parts, version: 1, locked: false, source: 'pasted' };
}

/** Check a script against the checklist and propose concrete edits. */
export async function diagnose(business, script) {
  const text = PARTS.map((p) => `### ${p}\n${script.parts[p].text || '(missing)'}`).join('\n\n');
  const out = await askJson(
    `You are a demanding sales coach reviewing a phone script. Check it against this checklist:
${checklistText('in_script')}

Return JSON:
{"criteria":[{"id":"<checklist id>","pass":true|false,"evidence":"<words copied EXACTLY from the script that meet it, or empty>","note":"<one short sentence>"}],
 "changes":[{"criterion":"<checklist id>","part":"opener|discovery|pitch|close","before":"<text copied EXACTLY from that part to replace, or empty to add new text at the end of the part>","after":"<the new words>","why":"<one sentence>"}],
 "objections":["<the 4 objections this kind of prospect most likely raises, in their words>"],
 "summary":"<two sentences: the biggest strength and the biggest gap>"}
Rules: one entry per checklist id. Propose at most 8 changes, only for failed items, most important first. "before" must be copied exactly or be empty. Keep the owner's voice. Do not invent statistics or customer names.`,
    `${businessText(business)}\n\nSCRIPT:\n${text}`,
  );

  const criteria = CHECKLIST.map((c) => {
    const x = (out.criteria || []).find((y) => y.id === c.id) || {};
    return { id: c.id, part: c.part, name: c.name, pass: x.pass === true, evidence: verbatim(x.evidence, script.parts[c.part].text), note: clip(x.note, 240) };
  });
  const changes = [];
  for (const ch of out.changes || []) {
    if (!PARTS.includes(ch.part) || !clip(ch.after, 1)) continue;
    const before = clip(ch.before, 1500);
    // A "before" the script does not contain cannot be applied; drop it instead of guessing.
    if (before && !script.parts[ch.part].text.includes(before)) continue;
    const criterion = CHECKLIST.some((c) => c.id === ch.criterion) ? ch.criterion : null;
    // Two edits of the same text cannot both apply: keep the first, credit it with both criteria.
    const clash = before && changes.find((x) => x.part === ch.part && x.before && (x.before.includes(before) || before.includes(x.before)));
    if (clash) {
      if (criterion && !clash.criteria.includes(criterion)) clash.criteria.push(criterion);
      continue;
    }
    changes.push({ id: `c${changes.length + 1}`, criteria: criterion ? [criterion] : [], part: ch.part, before, after: clip(ch.after, 1500), why: clip(ch.why, 240) });
    if (changes.length >= 8) break;
  }
  const passed = criteria.filter((c) => c.pass).length;
  return {
    version: script.version,
    score: Math.round((passed / criteria.length) * 100),
    criteria,
    changes,
    objections: (out.objections || []).map((o) => clip(o, 200)).filter(Boolean).slice(0, 5),
    summary: clip(out.summary, 400),
  };
}

/** Apply the accepted changes. Done here, not by the model, so the owner gets exactly what they saw. */
export function applyChanges(script, changes, acceptedIds) {
  const next = structuredClone(script);
  const applied = [];
  for (const ch of changes) {
    if (!acceptedIds.includes(ch.id)) continue;
    const part = next.parts[ch.part];
    if (ch.before) {
      if (!part.text.includes(ch.before)) continue;
      part.text = part.text.replace(ch.before, ch.after);
    } else {
      part.text = `${part.text.trim()}\n${ch.after}`.trim();
    }
    applied.push(ch.id);
  }
  next.version = script.version + (applied.length ? 1 : 0);
  return { script: next, applied };
}

/** Lock the script: pick the key lines per part and build the seven prospects the rep will call. */
export async function lock(business, script, objections) {
  const text = PARTS.map((p) => `### ${p}\n${script.parts[p].text}`).join('\n\n');
  // The lead type comes first (every prospect needs it), the key lines run alongside.
  const lead = askJson(
    `Read this sales script's OPENER and decide what kind of lead it is written for: "cold" (never heard of the company), "inbound" (asked to be contacted) or "referral" (someone they know sent the rep). Write one sentence on how the prospect knows the company (for example "filled out the web form on Tuesday").
Return JSON: {"type":"cold|inbound|referral","context":"..."}`,
    `${businessText(business)}\n\nSCRIPT:\n${text}`,
  ).then(cleanLead);
  const [out, lead_, prospects] = await Promise.all([askJson(
    `You prepare a 7-day phone sales bootcamp from a locked script.
For each part pick 2 to 4 KEY LINES: the sentences the rep must say out loud. Copy each one EXACTLY from the script, one sentence each. Never pick stage directions or notes to the rep (like "If they say no:" or "Tell them..."): only words spoken to the prospect.
Return JSON:
{"key_lines":{"opener":["..."],"discovery":["..."],"pitch":["..."],"close":["..."]}}`,
    `${businessText(business)}\n\nSCRIPT:\n${text}`,
  ), lead, lead.then((l) => buildLadder(business, script, l, objections))]);
  const locked = structuredClone(script);
  for (const p of PARTS) {
    const src = locked.parts[p].text;
    const spoken = (l) => !/^\s*(if they|if the|tell them|note:|\()/i.test(l);
    const lines = (out.key_lines?.[p] || []).map((l) => verbatim(l, src)).filter((l) => l && spoken(l));
    // Fall back to the first sentences if the model's picks were not verbatim.
    // One sentence per key line, so a line can tick when it is said.
    const sentences = lines.flatMap((l) => l.split(/(?<=[.?!])\s+/)).map((x) => x.trim()).filter((x) => spoken(x) && flat(x).split(' ').length >= 4);
    locked.parts[p].key_lines = (sentences.length ? sentences.slice(0, 5) : lines.length ? lines : src.split(/(?<=[.?!])\s+|\n+/).map((s) => s.trim()).filter((s) => spoken(s) && flat(s).split(' ').length >= 4).slice(0, 3)).slice(0, 4);
  }
  locked.locked = true;
  return { script: locked, lead: lead_, prospects, objections: prospects[1]?.objections || [] };
}
