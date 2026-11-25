// The 7-day bootcamp. Each day says which part you practice, how hard the prospect is,
// how much of your script you can see during the call, and what the score looks at.

export const PASS_SCORE = 70;

export const LEVELS = {
  1: { name: 'Friendly', behavior: 'You are cooperative. You answer what you are asked, with detail. If the rep does a reasonable job, you accept the next step.' },
  2: { name: 'Friendly, one brush-off', behavior: 'Early in the call you throw ONE brush-off ("I’m busy", "how did you get my number?"). If the rep handles it calmly, you become cooperative.' },
  3: { name: 'Normal', behavior: 'You give vague answers on purpose ("it’s fine", "depends", "the usual"). You only give real detail if the rep asks for more or for an example. A generic pitch does not convince you.' },
  4: { name: 'Hard', behavior: 'You are rushed and skeptical. You raise at least two different objections at different moments. If the rep argues or asserts instead of asking, you close up more. You only accept a next step if you feel understood.' },
};

export const AIDS = {
  script: { name: 'Script on screen', explain: 'Your whole script is visible and key lines tick themselves when you say them.' },
  hints: { name: 'Hints only', explain: 'You see the first words of each key line. The full line is behind a tap, and every tap is counted.' },
  emergency: { name: 'Under pressure', explain: 'Clean screen. An emergency button shows only your next line, and every use is counted.' },
  none: { name: 'From memory', explain: 'Nothing on screen. This is graduation: pass or fail.' },
};

export const DAYS = [
  { n: 1, title: 'Meet the prospect', parts: ['discovery'], level: 1, minutes: 4, objections: 0, aid: 'script',
    focus: 'Let the prospect tell their story. Find and name the pain.',
    lesson: ['Before you sell the product, know who you are selling it to.', 'Listen to how they talk and which words they use. Use them back.', 'Today’s job: get them talking about their situation, then name their pain out loud.'] },
  { n: 2, title: 'The opener', parts: ['opener'], level: 2, minutes: 4, objections: 0, aid: 'script',
    focus: 'Who you are, why you are calling, agenda, permission. Survive the first brush-off.',
    lesson: ['Who you are, where you are calling from, and why. Short.', 'Say what will happen on the call, then ask permission to start.', 'If they brush you off ("no time"), stay calm and ask one question. Trust is won or lost here.'] },
  { n: 3, title: 'Discovery', parts: ['discovery'], level: 3, minutes: 5, objections: 0, aid: 'script',
    focus: 'Today vs. goal, what blocks them, go deeper, get a number, summarize and confirm.',
    lesson: ['The heaviest day: sales are won or lost here.', 'Where are they today, where do they want to be, what is stopping them, what does it cost.', 'Today the prospect is vague on purpose. Ask for more ("tell me more").', 'End with a summary and get them to confirm it.'] },
  { n: 4, title: 'Pitch and next step', parts: ['pitch'], level: 3, minutes: 5, objections: 0, aid: 'hints',
    focus: 'Bridge, problem-solution-benefit checked one by one, short, ask for the next step.',
    lesson: ['Enter with a bridge: "Based on what you told me, can I show you how we’d help?"', 'Each problem they named gets its solution and its benefit. Check each one landed.', 'Under two minutes. Then ask for the next step and stop talking.'] },
  { n: 5, title: 'Close and objections', parts: ['close'], level: 3, minutes: 5, objections: 1, aid: 'hints',
    focus: 'Ask clearly, confirm the value, ask what worries them, answer with questions, ask again.',
    lesson: ['Ask with a clear question, then stay quiet.', 'If they say no: confirm the value and ask what worries them.', 'Answer the objection with a question, never an argument. Then ask again.'] },
  { n: 6, title: 'Full call under pressure', parts: ['opener', 'discovery', 'pitch', 'close'], level: 4, minutes: 6, objections: 2, aid: 'emergency',
    focus: 'The whole script, opener to next step, with a clean screen.',
    lesson: ['The whole script, start to finish.', 'Hard prospect, two hidden objections.', 'Clean screen. The emergency button is there, but every use is counted.'] },
  { n: 7, title: 'Graduation', parts: ['opener', 'discovery', 'pitch', 'close'], level: 4, minutes: 6, objections: 2, aid: 'none',
    focus: 'From memory. Script adherence, summaries, objections handled: pass or fail.',
    lesson: ['From memory, nothing on screen.', 'We look at script adherence, summaries and how you handled the objections.', 'Pass and you are ready for real prospects.'] },
];

export const day = (n) => DAYS.find((d) => d.n === Number(n)) || null;
