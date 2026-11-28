// The 7-day bootcamp. Each day says which part you practice, who you call (a new prospect
// every day, built from your script, each scenario harder than the last), how hard they are,
// how much of your script you can see during the call, and what the score looks at.
// The rep never picks or edits the prospect: otherwise they would pick the easy one.

export const PASS_SCORE = 70;

export const LEVELS = {
  1: { name: 'Friendly', behavior: 'You are cooperative. You answer what you are asked, with detail. If the rep does a reasonable job, you accept the next step.' },
  2: { name: 'Friendly, one brush-off', behavior: 'Early in the call you throw ONE brush-off ("I’m busy", "how did you get my number?"). If the rep handles it calmly, you become cooperative.' },
  3: { name: 'Normal', behavior: 'You give vague answers on purpose ("it’s fine", "depends", "the usual"). You only give real detail if the rep asks for more or for an example. A generic pitch does not convince you.' },
  4: { name: 'Hard', behavior: 'You are rushed and skeptical. You raise at least two different objections at different moments. If the rep argues or asserts instead of asking, you close up more. You only accept a next step if you feel understood.' },
};

export const AIDS = {
  script: { name: 'Script on screen', explain: 'Your whole script is on screen, in call order, and follows you through the call. Key lines tick themselves when you say them.' },
  hints: { name: 'Hints for today’s part', explain: 'The whole call is on screen and follows you, but today’s part shows only the first half of each key line. The full line is behind a tap, and every tap is counted.' },
  emergency: { name: 'Under pressure', explain: 'Clean screen. An emergency button shows only your next line, and every use is counted.' },
  none: { name: 'From memory', explain: 'Nothing on screen. This is graduation: pass or fail.' },
};

export const DAYS = [
  { n: 1, title: 'Find the pain', parts: ['discovery'], level: 1, minutes: 4, objections: 0, aid: 'script',
    who: { personality: 'friendly', voice: 'female', scenario: 'Interested and open. They asked to hear from you recently and the problem is fresh in their mind.' },
    focus: 'Let the prospect tell their story. Find and name the pain.',
    lesson: ['Before you sell the product, know who you are selling it to.', 'Listen to how they talk and which words they use. Use them back.', 'Today’s job: get them talking about their situation, then name their pain out loud.'] },
  { n: 2, title: 'The opener', parts: ['opener'], level: 2, minutes: 4, objections: 0, aid: 'script',
    who: { personality: 'chatty', voice: 'male', scenario: 'Picks up distracted, in the middle of something, and tries to brush the rep off before giving them a chance.' },
    focus: 'Who you are, why you are calling, agenda, permission. Survive the first brush-off.',
    lesson: ['Who you are, where you are calling from, and why. Short.', 'Say what will happen on the call, then ask permission to start.', 'If they brush you off ("no time"), stay calm and ask one question. Trust is won or lost here.'] },
  { n: 3, title: 'Discovery', parts: ['discovery'], level: 3, minutes: 5, objections: 0, aid: 'script',
    who: { personality: 'analytical', voice: 'female', scenario: 'Not sure the problem is big enough to fix. Answers vaguely until the rep digs.' },
    focus: 'Today vs. goal, what blocks them, go deeper, get a number, summarize and confirm.',
    lesson: ['The heaviest day: sales are won or lost here.', 'Where are they today, where do they want to be, what is stopping them, what does it cost.', 'Today the prospect is vague on purpose. Ask for more ("tell me more").', 'End with a summary and get them to confirm it.'] },
  { n: 4, title: 'Pitch and the numbers', parts: ['pitch'], level: 3, minutes: 5, objections: 0, aid: 'hints',
    who: { personality: 'analytical', voice: 'male', scenario: 'Already looked at another option or a competitor and is comparing. Wants to know what is different, in their own terms.' },
    focus: 'Bridge, problem-solution-benefit checked one by one, the real numbers on this call, short, ask for the decision.',
    lesson: ['Enter with a bridge: "Based on what you told me, can I show you how we’d help?"', 'Each problem they named gets its solution and its benefit. Check each one landed.', 'When they ask for the numbers, give them now: your numbers card is on screen. Never "someone else will tell you".', 'Under two minutes. Then ask for the decision and stop talking.'] },
  { n: 5, title: 'Close and objections', parts: ['close'], level: 3, minutes: 5, objections: 1, aid: 'hints',
    who: { personality: 'cautious', voice: 'female', scenario: 'Likes the idea but money or commitment worries them. Afraid of making a mistake they cannot undo.' },
    focus: 'Ask for the decision clearly, confirm the value, ask what worries them, answer with questions, ask again.',
    lesson: ['Ask with a clear question, then stay quiet.', 'If they say no: confirm the value and ask what worries them.', 'Answer the objection with a question, never an argument. Then ask again.'] },
  { n: 6, title: 'Full call under pressure', parts: ['opener', 'discovery', 'pitch', 'close'], level: 4, minutes: 6, objections: 2, aid: 'emergency',
    who: { personality: 'rushed', voice: 'male', scenario: 'Very busy, picks up between two other things and will end the call if the rep wastes their time.' },
    focus: 'The whole script, opener to decision, with a clean screen.',
    lesson: ['The whole script, start to finish.', 'A busy prospect with two hidden objections.', 'Clean screen. The emergency button is there, but every use is counted.'] },
  { n: 7, title: 'Graduation', parts: ['opener', 'discovery', 'pitch', 'close'], level: 4, minutes: 6, objections: 2, aid: 'none',
    who: { personality: 'skeptical', voice: 'female', scenario: 'Was burned by a salesperson before, and does not decide alone: someone else has a say.' },
    focus: 'From memory. Script adherence, summaries, objections handled: pass or fail.',
    lesson: ['From memory, nothing on screen.', 'We look at script adherence, summaries and how you handled the objections.', 'Pass and you are ready for real prospects.'] },
];

// Free practice, after graduation (idea from Pirka's trainer): the whole call, against a
// new person every time, with a scenario and a difficulty the rep does not choose.
// Not part of the ladder: it never unlocks anything. Its level comes from the person.
export const FREE_N = 8;
export const FREE = {
  n: FREE_N, free: true, title: 'Free practice', parts: ['opener', 'discovery', 'pitch', 'close'], minutes: 6, aid: 'emergency',
  focus: 'The whole call with someone new. You do not know how hard they are until you talk.',
  lesson: ['You graduated. Now keep your edge.', 'A new person every call: any of the seven scenarios, any difficulty from normal to hard.', 'Clean screen. The emergency button is there, but every use is counted.'],
};
const FREE_OBJECTIONS = { 2: 0, 3: 1, 4: 2 };
/** The free-practice "day" for one person: its difficulty and objections follow that person. */
export const freeDay = (p) => ({ ...FREE, level: p?.level || 3, objections: FREE_OBJECTIONS[p?.level] ?? 1 });
/** Picks who the next free-practice person is: a random scenario at level 2 to 4. */
export const freeDraw = () => ({ who: DAYS[Math.floor(Math.random() * DAYS.length)].who, level: 2 + Math.floor(Math.random() * 3) });

export const day = (n) => DAYS.find((d) => d.n === Number(n)) || null;
