// Diagrams that look hand-drawn with a marker: two colors only, ink and rope red.
// A diagram is a list of shapes (see diagrams.js). rough.js draws them with a fixed seed,
// so the wobble is the same on every render. If rough.js fails to load, the same shapes
// are drawn with straight lines: the page never loses its diagrams.

const INK = '#17140F';
const ROPE = '#D9442B';
const PAPER = '#FBF8F2';
const NS = 'http://www.w3.org/2000/svg';
const HAND = "'Kalam', 'Comic Sans MS', cursive";

let roughLib = null;
const ready = import('https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.esm.js')
  .then((m) => { roughLib = m.default; })
  .catch(() => { /* straight-line fallback */ });

const el = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

// Minimal stand-in for rough.svg() when the library is unavailable.
const plain = {
  rectangle: (x, y, w, h, o) => el('rect', { x, y, width: w, height: h, rx: 6, fill: o.fill || 'none', stroke: o.stroke, 'stroke-width': o.strokeWidth }),
  circle: (x, y, d, o) => el('circle', { cx: x, cy: y, r: d / 2, fill: o.fill || 'none', stroke: o.stroke, 'stroke-width': o.strokeWidth }),
  line: (x1, y1, x2, y2, o) => el('line', { x1, y1, x2, y2, stroke: o.stroke, 'stroke-width': o.strokeWidth, 'stroke-dasharray': o.strokeLineDash ? o.strokeLineDash.join(' ') : '', 'stroke-linecap': 'round' }),
  path: (d, o) => el('path', { d, fill: 'none', stroke: o.stroke, 'stroke-width': o.strokeWidth, 'stroke-linecap': 'round' }),
};

export async function draw(host, diagram) {
  await ready;
  const { width, height, shapes, title } = diagram;
  const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': title, class: 'sketch' });
  const t = el('title');
  t.textContent = title;
  svg.appendChild(t);
  host.replaceChildren(svg);
  const rc = roughLib ? roughLib.svg(svg) : plain;
  const strokes = el('g');
  const words = el('g');
  svg.append(strokes, words);

  shapes.forEach((s, i) => {
    const color = s.c === 'rope' ? ROPE : INK;
    const o = { stroke: color, roughness: 1.5, bowing: 1.3, strokeWidth: 2.2, seed: 11 + i };
    // A filled shape with words on top is filled SOLID: hatching makes the words unreadable.
    const fill = s.fill === 'solid' ? { fill: color, fillStyle: 'solid' } : s.fill ? { fill: color, fillStyle: 'hachure', hachureGap: 7, fillWeight: 1.3 } : {};
    const arrow = (x1, y1, x2, y2) => {
      const a = Math.atan2(y2 - y1, x2 - x1);
      for (const d of [-0.5, 0.5]) strokes.appendChild(rc.line(x2, y2, x2 - 12 * Math.cos(a + d), y2 - 12 * Math.sin(a + d), o));
    };
    if (s.t === 'box') strokes.appendChild(rc.rectangle(s.x, s.y, s.w, s.h, { ...o, ...fill }));
    else if (s.t === 'circle') strokes.appendChild(rc.circle(s.x, s.y, s.d, { ...o, ...fill }));
    else if (s.t === 'line') {
      strokes.appendChild(rc.line(s.x1, s.y1, s.x2, s.y2, s.dash ? { ...o, strokeLineDash: [6, 8] } : o));
      if (s.arrow) arrow(s.x1, s.y1, s.x2, s.y2);
    } else if (s.t === 'path') {
      strokes.appendChild(rc.path(s.d, o));
      if (s.arrow) arrow(...s.arrow);
    } else if (s.t === 'underline') {
      strokes.appendChild(rc.line(s.x, s.y, s.x + s.w, s.y + 2, { ...o, roughness: 2.2 }));
    } else if (s.t === 'text') {
      const size = s.size || 18;
      const n = el('text', {
        x: s.x, y: s.y, 'text-anchor': s.anchor || 'middle',
        fill: s.inv ? PAPER : color,
        style: `font-family:${HAND};font-size:${size}px;font-weight:${s.bold ? 700 : 400}`,
      });
      String(s.txt).split('\n').forEach((line, j) => {
        const span = el('tspan', { x: s.x, dy: j ? size * 1.18 : 0 });
        span.textContent = line;
        n.appendChild(span);
      });
      words.appendChild(n);
    }
  });
  // On a phone the 640-wide drawing shrinks to half and its words get hard to read. Crop
  // the empty margin around the drawing so it fills the width: same shapes, bigger letters.
  if (host.clientWidth && host.clientWidth < 600) {
    await document.fonts?.ready;
    const b = svg.getBBox();
    const pad = 10;
    if (b.width > 0 && b.width < width - 2 * pad) svg.setAttribute('viewBox', `${b.x - pad} ${b.y - pad} ${b.width + 2 * pad} ${b.height + 2 * pad}`);
  }
}

/** Draw every [data-sketch] placeholder on the page from a name → diagram map. */
export function drawAll(root, library) {
  for (const host of root.querySelectorAll('[data-sketch]')) {
    const d = typeof library[host.dataset.sketch] === 'function' ? library[host.dataset.sketch](host.dataset) : library[host.dataset.sketch];
    if (d) draw(host, d);
  }
}
