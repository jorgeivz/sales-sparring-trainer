// Builds the demo company judges can explore, by running the REAL pipeline:
// paste a weak script -> split -> review -> accept every edit -> lock -> score three sample
// rounds (transcripts written by us, scored by the real coach). Writes data/demo-template.json.
//   node scripts/seed-demo.mjs

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}
const S = await import('../lib/script.mjs');
const { grade } = await import('../lib/grade.mjs');
const { day } = await import('../lib/bootcamp.mjs');
const { pickObjections } = await import('../lib/prospect.mjs');
const { prospectFor } = await import('../lib/persona.mjs');

const business = S.cleanBusiness({
  company: 'Bright Roof Solar',
  product: 'Rooftop solar panels with $0-down financing, installed in 2 days',
  customer: 'Homeowners in Phoenix who filled out a web form asking about solar',
  price: 'About $120/month on a 20-year loan',
  proof: 'Local installer since 2014, 25-year panel warranty',
});

const weakScript = `Hi, is this {name}? Great! How are you doing today? This is Alex with Bright Roof Solar, we're the number one solar installer in the Valley and we've been in business since 2014, family owned and operated.

So I'm calling because you showed interest in solar. Do you own your home?

Solar is a great way to save money. With our 0 down program you can get panels installed in just 2 days and start saving right away. Our panels have a 25 year warranty and they're top quality. Most of our customers save a lot of money every month. Plus there's the tax credit.

So would you like to go ahead and set up an appointment? We can do Saturday.

If they say it's too expensive: Tell them it's 0 down and they will save money.
If they say they need to think: Tell them prices are going up next month.`;

const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);

let script = await S.split(weakScript);
log('split');
const before = await S.diagnose(business, script);
log(`review: ${before.score}/100, ${before.changes.length} edits`);
const { script: improved, applied } = S.applyChanges(script, before.changes, before.changes.map((c) => c.id));
log(`applied ${applied.length}`);
const locked = await S.lock(business, improved, before.objections);
log(`locked, lead ${locked.lead.type}, prospects: ${Object.values(locked.prospects).map((p) => `d${p.day} ${p.name} (${p.personality})`).join(', ')}`);

const w = {
  business,
  script: locked.script,
  diagnosis: { ...before, applied, decided: true },
  prospects: locked.prospects,
  lead: locked.lead,
  objections: locked.objections,
  attempts: [],
  weak_spot: null,
};

// Sample rounds, played by "our test rep". Transcripts are ours; the scores are the real coach's.
const n = w.prospects[1].name.split(' ')[0];
const lines = (p) => w.script.parts[p].key_lines;
const rounds = [
  { d: 1, turns: [
    ['prospect', 'Hello?'],
    ['rep', `Hi ${n}, it's Alex from Bright Roof Solar, you asked about solar on our site. ${lines('discovery')[0] || 'Do you own the home?'}`],
    ['prospect', 'Yeah, we own it. Bought it six years ago.'],
    ['rep', lines('discovery')[1] || 'How much is your bill?'],
    ['prospect', 'It is around two twenty, but in the summer it jumps to like three twenty. I want it under a hundred.'],
    ['rep', 'Three twenty in summer. Tell me more, what does that do to your month?'],
    ['prospect', 'Honestly it kills our budget. July and August we cut back on everything else.'],
    ['rep', `${lines('discovery')[2] || 'Have you looked into solar before?'} What stopped you back then?`],
    ['prospect', 'I got one quote, but they wanted money upfront and I was not sure we would stay long enough.'],
    ['rep', 'How many years do you plan to stay in the house?'],
    ['prospect', 'Probably ten more.'],
    ['rep', 'So: bills up to three twenty in summer that kill your budget, you want under a hundred, you plan to stay ten years, and last time the upfront cost stopped you. Did I get that right?'],
    ['prospect', 'Yeah, that is exactly it.'],
  ] },
  { d: 2, turns: [
    ['prospect', 'Hello?'],
    ['rep', lines('opener').join(' ').replace('{name}', n) || `Hi ${n}, this is Alex from Bright Roof Solar.`],
    ['prospect', 'Look, I am kind of busy right now.'],
    ['rep', 'Totally fair. Is it better if I take just two minutes now, or call you back tonight at six?'],
    ['prospect', 'OK, two minutes. Go ahead.'],
    ['rep', 'Thank you. Here is the plan: I ask you two quick questions, and if solar makes sense we book a free roof check. If not, I let you go. Fair?'],
    ['prospect', 'Fair.'],
    ['rep', 'What made you fill out the form last week?'],
    ['prospect', 'Our summer bills are brutal.'],
  ] },
  { d: 3, turns: [
    ['prospect', 'Hello?'],
    ['rep', `Hi ${n}, Alex from Bright Roof Solar again. Got a few minutes to talk about your bills?`],
    ['prospect', 'I guess.'],
    ['rep', 'How are your power bills these days?'],
    ['prospect', 'They are fine. The usual.'],
    ['rep', 'Got it. Well, solar can save you a lot. We have zero down and a 25 year warranty.'],
    ['prospect', 'Hmm. OK.'],
    ['rep', 'So do you want to book an appointment Saturday?'],
    ['prospect', 'Let me think about it. Send me an email.'],
  ] },
  { d: 3, turns: [
    ['prospect', 'Hello?'],
    ['rep', `Hi ${n}, Alex from Bright Roof Solar. Is now still a good time for a few questions?`],
    ['prospect', 'Sure.'],
    ['rep', 'How are your power bills these days?'],
    ['prospect', 'They are fine. The usual.'],
    ['rep', 'Tell me more. What is the usual in summer versus winter, roughly?'],
    ['prospect', 'Hmm, summer maybe three eighty. Winter like one fifty.'],
    ['rep', 'Three eighty is a lot. Where would you want that bill to be?'],
    ['prospect', 'I mean, I would like it to be the same every month, under two hundred.'],
    ['rep', 'What has stopped you from fixing it before now?'],
    ['prospect', 'Honestly I thought solar was expensive upfront, and our neighbor had a bad installer.'],
    ['rep', 'Can you give me an example of what went wrong with the neighbor?'],
    ['prospect', 'They left a leak in the roof and never came back.'],
    ['rep', 'So, you are paying up to three eighty in summer, you want under two hundred every month, and you are worried about upfront cost and an installer who disappears. Is that right?'],
    ['prospect', 'Yeah, that is it exactly.'],
  ] },
];

const started = Date.now() - 3 * 86400000;
for (const [i, r] of rounds.entries()) {
  const d = day(r.d);
  const turns = r.turns.map(([role, text]) => ({ role, text }));
  const objections = pickObjections(w, d);
  const persona = prospectFor(w, d);
  const res = await grade({ w, d, turns, objections, aids: {}, persona });
  const seconds = 40 + turns.length * 9;
  w.attempts.push({ id: crypto.randomUUID(), day: d.n, sample: true, created: new Date(started + i * 20 * 3600000).toISOString(), objections, persona, result: { ...res, day: d.n, seconds, turns } });
  log(`day ${d.n}: ${res.score} ${res.passed ? 'PASS' : 'fail'} (checklist ${res.breakdown.judged}, script ${res.breakdown.adherence}%)`);
}

fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'demo-template.json'), JSON.stringify(w, null, 2));
log('wrote data/demo-template.json');
