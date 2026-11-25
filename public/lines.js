// Has the rep said this key line yet? Compared by WORDS, not meaning: a line counts as said
// when at least 70% of its content words show up in what the rep said.
// Shared: the call screen ticks lines live with it, and the server computes script adherence
// with it on the real transcript (not on what the browser reports).
// Known limit: the same idea in different words may not tick. That is why it is a guide and
// an informative metric, not an automatic penalty.

const STOP = new Set(('the and for you your are was were with that this have has had not but can our out about from they them their there what when where which who how will would could should just like into than then its it’s i’m we’re you’re yes yeah okay really very also some any all get got let’s me my mine his her him she he do does did been being am is be to of in on at as by or if so an a').split(' '));

export function norm(t) {
  return String(t ?? '')
    .replace(/\{[^}]*\}/g, ' ')
    .toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function contentWords(line) {
  return [...new Set(norm(line).split(' ').filter((w) => w.length >= 3 && !STOP.has(w)))];
}

/** Indexes of the key lines the rep has already said, given everything they said so far. */
export function linesSaid(lines, saidByRep, threshold = 0.7) {
  const said = new Set(norm(saidByRep).split(' '));
  const out = [];
  lines.forEach((l, i) => {
    const words = contentWords(l);
    if (!words.length) return;
    if (words.filter((w) => said.has(w)).length / words.length >= threshold) out.push(i);
  });
  return out;
}

/** First words of a line, for the "hints only" days. */
export function hint(line, words = 4) {
  const w = String(line).replace(/\{[^}]*\}/g, '…').replace(/\s+/g, ' ').trim().split(' ');
  return w.length <= words ? w.join(' ') : `${w.slice(0, words).join(' ')}…`;
}
