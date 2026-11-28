// Every diagram in the product. Each one says ONE idea. Drawn by sketch.js.
// Shapes: box {x,y,w,h,fill}, circle {x,y,d,fill}, line {x1,y1,x2,y2,arrow,dash},
// path {d,arrow:[x1,y1,x2,y2]}, text {x,y,txt,size,bold,anchor,inv}, underline {x,y,w}.
// c:'rope' paints a shape in the accent red; fill:'solid' for shapes with words on top.

const W = 640;

export const HOW = {
  title: 'How it works: your script, a coach review, then seven calls that get harder',
  width: W, height: 250,
  shapes: [
    // 1. the script
    { t: 'box', x: 20, y: 54, w: 168, h: 120 },
    { t: 'text', x: 104, y: 86, txt: 'your script', size: 21, bold: true },
    { t: 'line', x1: 44, y1: 108, x2: 164, y2: 108 },
    { t: 'line', x1: 44, y1: 128, x2: 150, y2: 128 },
    { t: 'line', x1: 44, y1: 148, x2: 132, y2: 148 },
    { t: 'text', x: 104, y: 204, txt: 'paste yours\nor get a draft', size: 16 },
    { t: 'line', x1: 196, y1: 114, x2: 234, y2: 114, arrow: true },
    // 2. the review
    { t: 'box', x: 242, y: 54, w: 168, h: 120 },
    { t: 'text', x: 326, y: 86, txt: 'coach review', size: 21, bold: true },
    { t: 'text', x: 296, y: 124, txt: '✓  ✓', size: 22 },
    { t: 'text', x: 360, y: 124, txt: '✗', size: 24, c: 'rope', bold: true },
    { t: 'text', x: 326, y: 156, txt: '16 rules', size: 17 },
    { t: 'text', x: 326, y: 204, txt: 'accept or reject\nevery edit', size: 16 },
    { t: 'line', x1: 418, y1: 114, x2: 456, y2: 114, arrow: true },
    // 3. the bootcamp
    { t: 'box', x: 464, y: 34, w: 160, h: 160, fill: 'solid', c: 'rope' },
    { t: 'text', x: 544, y: 104, txt: '7', size: 64, bold: true, inv: true },
    { t: 'text', x: 544, y: 140, txt: 'voice calls', size: 20, bold: true, inv: true },
    { t: 'text', x: 544, y: 168, txt: 'harder every day', size: 15, inv: true },
    { t: 'text', x: 544, y: 224, txt: 'score 70+ to move on', size: 16 },
    { t: 'text', x: 320, y: 30, txt: 'from a messy script to a rep who knows it cold', size: 18 },
  ],
};

export const LADDER = {
  title: 'Seven days: the prospect gets harder while your screen help disappears',
  width: W, height: 300,
  shapes: [
    ...[1, 2, 3, 4, 5, 6, 7].flatMap((n, i) => {
      const x = 26 + i * 84, h = 34 + i * 23, y = 238 - h;
      return [
        { t: 'box', x, y, w: 74, h, ...(n === 7 ? { fill: 'solid', c: 'rope' } : {}) },
        { t: 'text', x: x + 37, y: y + 28, txt: String(n), size: 24, bold: true, inv: n === 7 },
      ];
    }),
    { t: 'line', x1: 50, y1: 156, x2: 470, y2: 44, arrow: true, c: 'rope' },
    { t: 'text', x: 214, y: 76, txt: 'the prospect gets harder', size: 18, c: 'rope', bold: true },
    { t: 'line', x1: 26, y1: 256, x2: 614, y2: 256, dash: true },
    { t: 'text', x: 136, y: 282, txt: 'script on screen', size: 15 },
    { t: 'text', x: 358, y: 282, txt: 'hints', size: 15 },
    { t: 'text', x: 483, y: 282, txt: 'panic button', size: 15 },
    { t: 'text', x: 583, y: 282, txt: 'memory', size: 15, bold: true },
  ],
};

export const FOUR_PARTS = {
  title: 'A script has four parts, and discovery is where the sale is won or lost',
  width: W, height: 250,
  shapes: [
    { t: 'text', x: 320, y: 28, txt: 'a call that sells', size: 21, bold: true },
    { t: 'box', x: 14, y: 70, w: 118, h: 74 },
    { t: 'text', x: 73, y: 114, txt: 'Opener', size: 20 },
    { t: 'line', x1: 136, y1: 107, x2: 160, y2: 107, arrow: true },
    { t: 'box', x: 166, y: 50, w: 190, h: 114, fill: 'solid' },
    { t: 'text', x: 261, y: 100, txt: 'Discovery', size: 25, bold: true, inv: true },
    { t: 'text', x: 261, y: 130, txt: 'won or lost here', size: 16, inv: true },
    { t: 'line', x1: 360, y1: 107, x2: 384, y2: 107, arrow: true },
    { t: 'box', x: 390, y: 70, w: 118, h: 74 },
    { t: 'text', x: 449, y: 114, txt: 'Pitch', size: 20 },
    { t: 'line', x1: 512, y1: 107, x2: 536, y2: 107, arrow: true },
    { t: 'box', x: 542, y: 70, w: 86, h: 74, c: 'rope' },
    { t: 'text', x: 585, y: 114, txt: 'Close', size: 20, c: 'rope', bold: true },
    { t: 'text', x: 73, y: 186, txt: 'who, why,\nOK to start?', size: 15 },
    { t: 'text', x: 261, y: 196, txt: 'today → goal · what blocks\nthem · numbers · summary', size: 15 },
    { t: 'text', x: 449, y: 186, txt: 'problem →\nsolution, ×3', size: 15 },
    { t: 'text', x: 585, y: 186, txt: 'ask,\nthen stop', size: 15 },
  ],
};

export const LOOP = {
  title: 'The coach remembers: the objection you fumble comes back on your next call',
  width: W, height: 260,
  shapes: [
    { t: 'box', x: 30, y: 98, w: 140, h: 62, fill: 'solid' },
    { t: 'text', x: 100, y: 136, txt: 'your call', size: 20, bold: true, inv: true },
    { t: 'path', d: 'M 120 92 Q 200 20 270 40', arrow: [240, 30, 270, 40] },
    { t: 'box', x: 274, y: 14, w: 120, h: 56 },
    { t: 'text', x: 334, y: 48, txt: 'scored', size: 19 },
    { t: 'path', d: 'M 398 46 Q 500 40 520 92', arrow: [516, 66, 520, 92] },
    { t: 'box', x: 438, y: 98, w: 182, h: 62, c: 'rope' },
    { t: 'text', x: 529, y: 124, txt: '“too expensive”', size: 17, c: 'rope', bold: true },
    { t: 'text', x: 529, y: 147, txt: 'got past you', size: 15, c: 'rope' },
    { t: 'path', d: 'M 520 166 Q 500 228 400 226', arrow: [430, 230, 400, 226] },
    { t: 'box', x: 216, y: 196, w: 182, h: 58 },
    { t: 'text', x: 307, y: 220, txt: 'next prospect', size: 17 },
    { t: 'text', x: 307, y: 242, txt: 'raises it first', size: 17, bold: true },
    { t: 'path', d: 'M 212 224 Q 110 226 100 166', arrow: [104, 192, 100, 166] },
    { t: 'text', x: 320, y: 132, txt: 'until you\nhandle it', size: 18, bold: true },
  ],
};

export const GAP = {
  title: 'What you sell is the gap between where the prospect is and where they want to be',
  width: W, height: 260,
  shapes: [
    { t: 'text', x: 320, y: 30, txt: 'this gap is what you sell', size: 19, bold: true },
    { t: 'box', x: 40, y: 150, w: 150, h: 70 },
    { t: 'text', x: 115, y: 192, txt: 'Today', size: 23, bold: true },
    { t: 'text', x: 115, y: 246, txt: '$320 bill in July', size: 15 },
    { t: 'box', x: 450, y: 58, w: 150, h: 70, fill: 'solid', c: 'rope' },
    { t: 'text', x: 525, y: 100, txt: 'Goal', size: 23, bold: true, inv: true },
    { t: 'text', x: 525, y: 152, txt: 'under $100, every month', size: 15 },
    { t: 'line', x1: 196, y1: 176, x2: 444, y2: 100, dash: true, arrow: true },
    { t: 'text', x: 320, y: 168, txt: 'what is stopping them?', size: 17, c: 'rope' },
  ],
};

// ---------------------------------------------------------------- one per day

export const DAY = {
  1: {
    title: 'Know who you are selling to: what hurts, the words they use, what they want',
    width: W, height: 260,
    shapes: [
      { t: 'circle', x: 120, y: 78, d: 66 },
      { t: 'box', x: 80, y: 118, w: 80, h: 96 },
      { t: 'text', x: 120, y: 244, txt: 'your prospect', size: 17, bold: true },
      { t: 'path', d: 'M 160 64 Q 230 14 300 34' },
      { t: 'box', x: 300, y: 12, w: 320, h: 50, c: 'rope' },
      { t: 'text', x: 460, y: 44, txt: '“that summer bill is killing me”', size: 17, c: 'rope' },
      { t: 'line', x1: 178, y1: 136, x2: 300, y2: 116, arrow: true },
      { t: 'text', x: 312, y: 122, txt: 'what hurts', size: 19, bold: true, anchor: 'start' },
      { t: 'line', x1: 178, y1: 166, x2: 300, y2: 166, arrow: true },
      { t: 'text', x: 312, y: 172, txt: 'the words they use', size: 19, bold: true, anchor: 'start' },
      { t: 'line', x1: 178, y1: 196, x2: 300, y2: 216, arrow: true },
      { t: 'text', x: 312, y: 222, txt: 'what they want instead', size: 19, bold: true, anchor: 'start' },
    ],
  },
  2: {
    title: 'The opener in four short steps, and what to do with the first brush-off',
    width: W, height: 250,
    shapes: [
      { t: 'text', x: 320, y: 24, txt: 'under 30 seconds', size: 16 },
      ...['who I am', 'why I call', 'the plan', 'OK to start?'].flatMap((txt, i) => {
        const x = 12 + i * 158;
        return [
          { t: 'box', x, y: 40, w: 140, h: 54, ...(i === 3 ? { fill: 'solid', c: 'rope' } : {}) },
          { t: 'text', x: x + 70, y: 73, txt, size: 18, inv: i === 3, bold: i === 3 },
          ...(i < 3 ? [{ t: 'line', x1: x + 142, y1: 67, x2: x + 156, y2: 67, arrow: true }] : []),
        ];
      }),
      { t: 'path', d: 'M 82 100 Q 110 160 196 170' },
      { t: 'box', x: 196, y: 146, w: 196, h: 50, c: 'rope' },
      { t: 'text', x: 294, y: 177, txt: '“I’m busy”', size: 19, c: 'rope', bold: true },
      { t: 'line', x1: 398, y1: 171, x2: 436, y2: 171, arrow: true },
      { t: 'text', x: 446, y: 164, txt: 'stay calm +', size: 17, anchor: 'start' },
      { t: 'text', x: 446, y: 188, txt: 'one question', size: 17, anchor: 'start', bold: true },
      { t: 'text', x: 320, y: 234, txt: '“Two minutes now, or should I call back at six?”', size: 15 },
    ],
  },
  3: {
    title: 'The first answer is rarely the real one: keep asking until you reach the pain',
    width: W, height: 272,
    shapes: [
      { t: 'box', x: 40, y: 22, w: 470, h: 52 },
      { t: 'text', x: 275, y: 54, txt: '“it’s fine, the usual”', size: 18 },
      { t: 'box', x: 100, y: 104, w: 350, h: 52 },
      { t: 'text', x: 275, y: 136, txt: '“about $320 in summer”', size: 18 },
      { t: 'box', x: 138, y: 186, w: 274, h: 58, fill: 'solid', c: 'rope' },
      { t: 'text', x: 275, y: 221, txt: '“we cut back on everything”', size: 17, bold: true, inv: true },
      { t: 'line', x1: 520, y1: 70, x2: 470, y2: 112, arrow: true },
      { t: 'text', x: 570, y: 86, txt: '“tell me\nmore”', size: 16 },
      { t: 'line', x1: 470, y1: 158, x2: 406, y2: 196, arrow: true },
      { t: 'text', x: 540, y: 176, txt: '“what does\nthat cost\nyou?”', size: 16 },
      { t: 'text', x: 60, y: 210, txt: 'the real\npain', size: 18, bold: true, c: 'rope' },
      { t: 'line', x1: 100, y1: 216, x2: 132, y2: 216, arrow: true, c: 'rope' },
    ],
  },
  4: {
    title: 'Bridge from what they told you, match each problem to a solution, then ask',
    width: W, height: 260,
    shapes: [
      { t: 'box', x: 12, y: 120, w: 150, h: 72 },
      { t: 'text', x: 87, y: 150, txt: 'what they', size: 17 },
      { t: 'text', x: 87, y: 174, txt: 'told you', size: 17 },
      { t: 'path', d: 'M 160 128 Q 262 16 362 128', arrow: [334, 98, 362, 128] },
      { t: 'text', x: 262, y: 36, txt: '“Based on what you said,\ncan I show you how we’d help?”', size: 15 },
      ...[0, 1, 2].flatMap((i) => [
        { t: 'box', x: 368, y: 110 + i * 38, w: 154, h: 32 },
        { t: 'text', x: 445, y: 132 + i * 38, txt: `problem ${i + 1} → fix ✓`, size: 15 },
      ]),
      { t: 'line', x1: 526, y1: 148, x2: 548, y2: 148, arrow: true },
      { t: 'circle', x: 592, y: 148, d: 84, fill: 'solid', c: 'rope' },
      { t: 'text', x: 592, y: 144, txt: 'ask', size: 21, bold: true, inv: true },
      { t: 'text', x: 592, y: 166, txt: 'then stop', size: 14, inv: true },
      { t: 'text', x: 445, y: 244, txt: 'under two minutes, in their words', size: 15 },
    ],
  },
  5: {
    title: 'Ask and stop talking. On a no: confirm the value, ask what worries them, ask again',
    width: W, height: 290,
    shapes: [
      { t: 'box', x: 20, y: 40, w: 128, h: 58, fill: 'solid', c: 'rope' },
      { t: 'text', x: 84, y: 77, txt: 'Ask', size: 25, bold: true, inv: true },
      { t: 'line', x1: 152, y1: 69, x2: 212, y2: 69, arrow: true },
      { t: 'box', x: 218, y: 40, w: 150, h: 58 },
      { t: 'text', x: 293, y: 66, txt: 'silence', size: 21, bold: true },
      { t: 'text', x: 293, y: 88, txt: 'let them talk', size: 14 },
      { t: 'line', x1: 372, y1: 58, x2: 446, y2: 40, arrow: true },
      { t: 'text', x: 534, y: 44, txt: 'yes → next step', size: 18 },
      { t: 'line', x1: 372, y1: 84, x2: 446, y2: 122, arrow: true },
      { t: 'text', x: 488, y: 136, txt: 'no?', size: 24, bold: true, c: 'rope' },
      { t: 'box', x: 426, y: 162, w: 200, h: 50 },
      { t: 'text', x: 526, y: 193, txt: '1 · confirm the value', size: 16 },
      { t: 'line', x1: 422, y1: 200, x2: 384, y2: 230, arrow: true },
      { t: 'box', x: 190, y: 220, w: 190, h: 50 },
      { t: 'text', x: 285, y: 251, txt: '2 · what worries you?', size: 16 },
      { t: 'line', x1: 186, y1: 236, x2: 152, y2: 206, arrow: true },
      { t: 'box', x: 14, y: 150, w: 176, h: 50 },
      { t: 'text', x: 102, y: 181, txt: '3 · answer with a question', size: 14 },
      { t: 'line', x1: 84, y1: 146, x2: 84, y2: 104, arrow: true, c: 'rope' },
      { t: 'text', x: 300, y: 150, txt: 'the “no” is the job', size: 19, bold: true, c: 'rope' },
    ],
  },
  6: {
    title: 'The whole call, start to finish, against a prospect who objects at any moment',
    width: W, height: 230,
    shapes: [
      ...['Opener', 'Discovery', 'Pitch', 'Close'].flatMap((txt, i) => {
        const x = 12 + i * 158;
        return [
          { t: 'box', x, y: 120, w: 140, h: 60, ...(i === 3 ? { fill: 'solid' } : {}) },
          { t: 'text', x: x + 70, y: 157, txt, size: 20, bold: i === 3, inv: i === 3 },
          ...(i < 3 ? [{ t: 'line', x1: x + 142, y1: 150, x2: x + 156, y2: 150, arrow: true }] : []),
        ];
      }),
      { t: 'box', x: 120, y: 14, w: 178, h: 44, c: 'rope' },
      { t: 'text', x: 209, y: 43, txt: '“too expensive”', size: 17, c: 'rope', bold: true },
      { t: 'line', x1: 209, y1: 62, x2: 240, y2: 114, arrow: true, c: 'rope' },
      { t: 'box', x: 380, y: 14, w: 196, h: 44, c: 'rope' },
      { t: 'text', x: 478, y: 43, txt: '“let me think on it”', size: 17, c: 'rope', bold: true },
      { t: 'line', x1: 478, y1: 62, x2: 540, y2: 114, arrow: true, c: 'rope' },
      { t: 'text', x: 320, y: 214, txt: 'clean screen · panic button costs points', size: 16 },
    ],
  },
  7: {
    title: 'Graduation: no script on screen, your script from memory, pass or fail',
    width: W, height: 240,
    shapes: [
      { t: 'box', x: 40, y: 34, w: 220, h: 150 },
      { t: 'line', x1: 60, y1: 60, x2: 240, y2: 60, dash: true },
      { t: 'line', x1: 60, y1: 110, x2: 240, y2: 110, dash: true },
      { t: 'line', x1: 60, y1: 160, x2: 240, y2: 160, dash: true },
      { t: 'text', x: 150, y: 214, txt: 'no script on screen', size: 17 },
      { t: 'line', x1: 272, y1: 110, x2: 362, y2: 110, arrow: true },
      { t: 'circle', x: 470, y: 108, d: 170, fill: 'solid', c: 'rope' },
      { t: 'text', x: 470, y: 108, txt: 'PASS', size: 40, bold: true, inv: true },
      { t: 'text', x: 470, y: 138, txt: 'ready for real calls', size: 14, inv: true },
      { t: 'text', x: 470, y: 222, txt: 'score 70+ and half your key lines', size: 16 },
    ],
  },
};
