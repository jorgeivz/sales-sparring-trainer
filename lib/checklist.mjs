// THE checklist. One place defines what a good opener, discovery, pitch and close are.
// Three things read it:
//   - the script diagnosis      (`in_script`)
//   - the score of every call   (`in_call`, always something you can hear)
//   - the bootcamp lessons      (`why`)

export const PARTS = ['opener', 'discovery', 'pitch', 'close'];

export const PART_NAMES = { opener: 'Opener', discovery: 'Discovery', pitch: 'Pitch', close: 'Close' };

export const CHECKLIST = [
  // Opener
  { id: 'who_why', part: 'opener', name: 'Says who they are and why they are calling',
    in_script: 'Starts with name, company and the specific reason for the call.',
    in_call: 'In the first lines the rep said their name, company and why they were calling.',
    why: 'The prospect decides in seconds whether to keep listening. No reason, no call.' },
  { id: 'agenda_permission', part: 'opener', name: 'Sets an agenda and asks permission',
    in_script: 'Says what will happen on the call and asks if it is OK to start.',
    in_call: 'The rep explained how the call would go and asked if that was OK.',
    why: 'When people know what they are agreeing to, they lower their guard.' },
  { id: 'short_open', part: 'opener', name: 'Short, no filler',
    in_script: 'The opener fits in 3 or 4 sentences. No weather talk, no company history.',
    in_call: 'The rep reached the first discovery question quickly, without rambling.',
    why: 'Every filler sentence is a chance for the prospect to tune out.' },
  // Discovery
  { id: 'now_and_goal', part: 'discovery', name: 'Asks where they are today and where they want to be',
    in_script: 'Has questions about the current situation and about the goal.',
    in_call: 'The rep asked about the prospect’s current situation and what they want.',
    why: 'The sale is the gap between those two points. Measure it or there is nothing to sell.' },
  { id: 'what_blocks', part: 'discovery', name: 'Asks what is stopping them and why now',
    in_script: 'Asks what kept them from solving it before and why it matters now.',
    in_call: 'The rep asked what has stopped them and why it matters now.',
    why: 'Today’s blocker is tomorrow’s objection. Better to hear it before the price.' },
  { id: 'go_deeper', part: 'discovery', name: 'Goes deeper ("tell me more", "for example?")',
    in_script: 'Includes follow-up questions that make the prospect expand.',
    in_call: 'After a vague answer the rep asked for more detail or an example instead of moving on.',
    why: 'The first answer is rarely the real one. The pain shows up in the second or third.' },
  { id: 'get_numbers', part: 'discovery', name: 'Gets numbers',
    in_script: 'Has questions that put a number on the problem: how much, how often, how long.',
    in_call: 'The rep got at least one concrete number from the prospect.',
    why: 'A problem with a number feels real. Without one, the fix feels like a luxury.' },
  { id: 'summarize_confirm', part: 'discovery', name: 'Summarizes the problem and confirms it',
    in_script: 'Ends discovery with a summary and a confirmation question.',
    in_call: 'The rep summarized the problem and asked if they got it right before pitching.',
    why: 'If the prospect confirms the problem in their own words, the pitch is half sold.' },
  // Pitch
  { id: 'bridge', part: 'pitch', name: 'Uses a bridge',
    in_script: 'Moves into the pitch with a bridge that asks permission ("Based on what you said, can I show you how…?").',
    in_call: 'Before pitching, the rep used a bridge tied to what the prospect said.',
    why: 'Without a bridge the pitch sounds like a brochure. With one, it sounds like an answer.' },
  { id: 'problem_solution_benefit', part: 'pitch', name: 'Problem, solution, benefit, confirmed',
    in_script: 'Ties each prospect problem to a solution and a benefit, and checks each one.',
    in_call: 'The rep tied at least one problem the prospect named to a solution and a benefit, and checked it landed.',
    why: 'A feature without the problem it solves means nothing to anyone.' },
  { id: 'their_words', part: 'pitch', name: 'Uses the prospect’s words',
    in_script: 'Tells the rep to reuse the prospect’s terms instead of company jargon.',
    in_call: 'The rep reused words the prospect had said when summarizing or pitching.',
    why: 'People are convinced by their own words, not by the brochure’s.' },
  { id: 'short_pitch', part: 'pitch', name: 'Under two minutes, about them',
    in_script: 'The pitch is short and talks about the prospect, not the company.',
    in_call: 'The pitch was short and about the prospect’s situation.',
    why: 'Long pitches are where prospects check their phone.' },
  // Close
  { id: 'ask_clearly', part: 'close', name: 'Asks for the next step in clear words, then stops talking',
    in_script: 'Has a direct ask for a specific next step.',
    in_call: 'The rep asked clearly for a specific next step and let the prospect answer.',
    why: 'If you never ask, the answer is always no.' },
  { id: 'what_worries', part: 'close', name: 'On a "no": confirms value and asks what worries them',
    in_script: 'Has a line for a "no" that confirms the value and asks what the concern is.',
    in_call: 'After hesitation, the rep confirmed the value and asked what worried them.',
    why: '"No" usually means "not yet, because…". Find the because.' },
  { id: 'objections_questions', part: 'close', name: 'Answers objections with questions',
    in_script: 'Handles the likely objections with a question, not an argument.',
    in_call: 'The rep answered an objection with a question instead of arguing.',
    why: 'Arguing makes people defend their position. Questions make them reconsider it.' },
  { id: 'ask_again', part: 'close', name: 'Asks again after handling the objection',
    in_script: 'After handling an objection, asks for the next step again.',
    in_call: 'After handling an objection, the rep asked for the next step again.',
    why: 'Most deals close on the second or third ask.' },
];

export const byPart = (part) => CHECKLIST.filter((c) => c.part === part);
