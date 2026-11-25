// Loaded only when a call starts, so the rest of the app works even if the CDN is slow or blocked.
const VOICE_SDK = 'https://cdn.jsdelivr.net/npm/@elevenlabs/client@1.37.1/+esm';
import { linesSaid, hint } from '/lines.js';
import { drawAll } from '/sketch.js';
import { HOW, LADDER, FOUR_PARTS, LOOP, GAP, DAY } from '/diagrams.js';

const SKETCHES = { how: HOW, ladder: LADDER, parts: FOUR_PARTS, loop: LOOP, gap: GAP, ...Object.fromEntries(Object.entries(DAY).map(([n, d]) => [`day-${n}`, d])) };
const sketch = (name, caption) => `<figure class="sketch-card"><div data-sketch="${name}"></div>${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;

const app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const LAST = 'sparring:last';
const remember = (id) => { try { localStorage.setItem(LAST, id); } catch { /* private mode */ } };
const recall = () => { try { return localStorage.getItem(LAST); } catch { return null; } };

async function api(method, path, body) {
  const r = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok && r.status !== 202) throw new Error(j.error || `Error ${r.status}`);
  return { status: r.status, ...j };
}

let meta = null;
let call = null; // the live voice session, if any

function render(html) {
  app.innerHTML = `<section class="view">${html}</section>`;
  drawAll(app, SKETCHES);
  window.scrollTo({ top: 0 });
}
const working = (msg) => `<div class="working"><i></i><div>${msg}</div></div>`;
const go = (h) => { location.hash = h; };

function steps(w, on) {
  const el = document.getElementById('steps');
  if (!w) { el.innerHTML = ''; return; }
  const items = [
    ['business', '1 · Business', !!w.business],
    ['script', '2 · Script', !!w.script?.locked],
    ['bootcamp', '3 · Bootcamp', w.days.some((d) => d.n === 7 && d.passed)],
  ];
  const reachable = { business: true, script: !!w.business, bootcamp: !!w.script?.locked };
  el.innerHTML = items.map(([k, label, done]) => reachable[k]
    ? `<a href="#/w/${w.id}/${k}" class="${k === on ? 'on' : done ? 'done' : ''}">${label}</a>`
    : `<span>${label}</span>`).join('');
}

// ---------------------------------------------------------------- router
async function route() {
  if (call) { await call.endSession().catch(() => {}); call = null; }
  meta ||= (await api('GET', '/api/meta'));
  const [, w, id, page, arg] = location.hash.split('/');
  try {
    if (w !== 'w' || !id) return home();
    const ws = await api('GET', `/api/w/${id}`);
    remember(id);
    if (!page) return go(`#/w/${id}/${!ws.business ? 'business' : !ws.script?.locked ? 'script' : 'bootcamp'}`);
    steps(ws, page === 'day' || page === 'result' ? 'bootcamp' : page);
    if (page === 'business') return business(ws);
    if (page === 'script') return script(ws);
    if (page === 'bootcamp') return bootcamp(ws);
    if (page === 'day') return dayPage(ws, Number(arg));
    if (page === 'result') return pastResult(ws, arg);
    go(`#/w/${id}`);
  } catch (e) {
    steps(null);
    render(`<h2>Something went wrong.</h2><p class="lede">${esc(e.message)}</p><a class="btn ghost" href="#/">Back to start</a>`);
  }
}
window.addEventListener('hashchange', route);
route();

// ---------------------------------------------------------------- home
function home() {
  steps(null);
  const last = recall();
  render(`
    <div class="hero">
      <div>
        <h1><span class="one-line">Write or improve your sales script.</span><br><em>Then earn it.</em></h1>
        <p class="lede">A sales coach that reviews your phone script line by line, then trains you on it for seven days against a voice prospect who gets harder every day. Your script stays on screen at first and disappears by day seven.</p>
        <div class="actions">
          <button class="btn" id="new">Start with my business</button>
          ${meta.demo_available ? '<button class="btn ghost" id="demo">Explore the demo company</button>' : ''}
          ${last ? `<a class="btn small ghost" href="#/w/${esc(last)}">Continue where I left off</a>` : ''}
        </div>
        <p class="err" id="err" role="alert"></p>
      </div>
      ${sketch('how')}
    </div>

    <div class="feature">
      <div>
        <span class="label">The script</span>
        <h2>Four parts. One of them decides the sale.</h2>
        <p>Paste the script you use today, messy is fine, or get a first draft. The coach checks every part against 16 rules and proposes concrete edits. You accept or reject each one, and only what you accept goes in, word for word.</p>
      </div>
      ${sketch('parts')}
    </div>

    <div class="feature flip">
      <div>
        <span class="label">The bootcamp</span>
        <h2>Seven calls. Harder every day. Less help every day.</h2>
        <p>One part of your script per day. Friendly prospects first, vague answers on day 3, hidden objections from day 5. Your key lines tick on screen as you say them, then turn into hints, then a panic button, then nothing. Score ${meta.pass_score} or more to unlock the next day.</p>
      </div>
      ${sketch('ladder')}
    </div>

    <div class="feature">
      <div>
        <span class="label">The coach</span>
        <h2>It remembers what beat you.</h2>
        <p>Every call is scored on your exact words: the coach quotes what you said, shows the line that cost you most and what to say instead. The objection you fumbled comes back on your next call, until you handle it.</p>
      </div>
      ${sketch('loop')}
    </div>

    <div class="actions center-actions">
      <button class="btn" id="new2">Start with my business</button>
      ${meta.demo_available ? '<button class="btn ghost" id="demo2">Explore the demo company</button>' : ''}
    </div>`);
  document.getElementById('new2').onclick = () => document.getElementById('new').click();
  const demo2 = document.getElementById('demo2');
  if (demo2) demo2.onclick = () => document.getElementById('demo').click();
  document.getElementById('new').onclick = async (e) => {
    e.target.disabled = true;
    try { go(`#/w/${(await api('POST', '/api/w')).id}/business`); } catch (x) { document.getElementById('err').textContent = x.message; e.target.disabled = false; }
  };
  const demo = document.getElementById('demo');
  if (demo) demo.onclick = async () => {
    demo.disabled = true;
    try { go(`#/w/${(await api('POST', '/api/w/demo')).id}/bootcamp`); } catch (x) { document.getElementById('err').textContent = x.message; demo.disabled = false; }
  };
}

// ---------------------------------------------------------------- 1. business
function business(w) {
  const b = w.business || {};
  render(`
    <span class="label">Step 1 of 3</span>
    <h2>Tell the coach about your business.</h2>
    <p class="lede">This is what the coach uses to review your script and to invent the prospect you will call.</p>
    <form class="fields card" id="f">
      <label>Company name<input name="company" maxlength="80" required value="${esc(b.company)}" placeholder="Bright Roof Solar"></label>
      <label>What you sell<input name="product" maxlength="300" required value="${esc(b.product)}" placeholder="Rooftop solar with $0-down financing, installed in 2 days"></label>
      <label>Who you call<small>Be specific: who they are and why they are expecting your call.</small><input name="customer" maxlength="300" required value="${esc(b.customer)}" placeholder="Homeowners in Phoenix who filled out a web form about solar"></label>
      <label>Price<small>Optional</small><input name="price" maxlength="120" value="${esc(b.price)}" placeholder="About $120/month on a 20-year loan"></label>
      <label>Why customers buy from you<small>Optional: proof, guarantees, what makes you different.</small><input name="proof" maxlength="300" value="${esc(b.proof)}" placeholder="Local since 2014, 25-year panel warranty"></label>
      <div class="actions"><button class="btn" type="submit">Continue to the script</button></div>
      <p class="err" id="err" role="alert"></p>
    </form>`);
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      await api('PUT', `/api/w/${w.id}/business`, Object.fromEntries(new FormData(e.target)));
      go(`#/w/${w.id}/script`);
    } catch (x) { document.getElementById('err').textContent = x.message; btn.disabled = false; }
  };
}

// ---------------------------------------------------------------- 2. script
function script(w) {
  if (!w.script) return scriptSource(w);
  if (w.script.locked) return scriptLocked(w);
  if (w.diagnosis && !w.diagnosis.decided) return review(w);
  return scriptEdit(w);
}

function scriptSource(w) {
  render(`
    <span class="label">Step 2 of 3</span>
    <h2>Start from your script, or from scratch.</h2>
    <p class="lede">Either way, the coach reviews it against 16 rules before you train on it.</p>
    ${sketch('parts', 'The coach splits your script into these four parts and checks each one.')}
    <div class="grid2" style="margin-top: var(--s5)">
      <button class="choice" data-k="paste" aria-pressed="true"><b>I have a script</b><span>Paste it as it is, messy is fine. The coach splits it into opener, discovery, pitch and close without rewriting a word.</span></button>
      <button class="choice" data-k="draft" aria-pressed="false"><b>Write a first draft for me</b><span>The coach writes one for ${esc(w.business.company)} that follows every rule. You edit it before locking it.</span></button>
    </div>
    <div class="fields" id="paste-box" style="margin-top: var(--s5)">
      <label>Your script<small>Up to ${8000} characters.</small><textarea id="raw" rows="12" maxlength="8000" placeholder="Hi, is this {name}? This is Alex with…"></textarea></label>
    </div>
    <div class="actions"><button class="btn" id="go">Split my script</button></div>
    <div id="busy"></div>
    <p class="err" id="err" role="alert"></p>`);
  let mode = 'paste';
  for (const c of document.querySelectorAll('.choice')) c.onclick = () => {
    mode = c.dataset.k;
    for (const x of document.querySelectorAll('.choice')) x.setAttribute('aria-pressed', String(x === c));
    document.getElementById('paste-box').hidden = mode !== 'paste';
    document.getElementById('go').textContent = mode === 'paste' ? 'Split my script' : 'Write my first draft';
  };
  document.getElementById('go').onclick = async (e) => {
    e.target.disabled = true;
    document.getElementById('err').textContent = '';
    document.getElementById('busy').innerHTML = working(mode === 'paste' ? 'Splitting your script into its four parts…' : `Writing a first draft for ${esc(w.business.company)}… about 15 seconds.`);
    try {
      await api('POST', `/api/w/${w.id}/script`, mode === 'paste' ? { mode, text: document.getElementById('raw').value } : { mode });
      route();
    } catch (x) {
      document.getElementById('busy').innerHTML = '';
      document.getElementById('err').textContent = x.message;
      e.target.disabled = false;
    }
  };
}

function scriptEdit(w) {
  const d = w.diagnosis;
  const note = d?.decided
    ? `<div class="banner calm">Applied ${d.applied?.length || 0} of ${d.changes.length} suggested changes. Edit anything you like, review again, or lock it to start training.</div>`
    : '';
  render(`
    <span class="label">Step 2 of 3 · Version ${w.script.version}</span>
    <h2>Your script, in four parts.</h2>
    <p class="lede">Edit freely. When it reads like you, run the review: it checks every part against the coach's 16 rules.</p>
    ${note}
    <form id="f">
      ${meta.parts.map((p) => `<div class="part"><div class="part-head"><h3>${meta.part_names[p]}</h3></div>
        <textarea name="${p}" rows="6">${esc(w.script.parts[p].text)}</textarea></div>`).join('')}
    </form>
    <div class="actions">
      <button class="btn ${d?.decided ? 'ghost' : ''}" id="review">${d?.decided ? 'Review again' : 'Review my script'}</button>
      ${d?.decided ? '<button class="btn" id="lock">Lock it and start the bootcamp</button>' : ''}
    </div>
    <div id="busy"></div>
    <p class="err" id="err" role="alert"></p>`);
  const form = document.getElementById('f');
  const dirty = () => meta.parts.some((p) => form.elements[p].value !== w.script.parts[p].text);
  const saveIfDirty = async () => {
    if (dirty()) await api('PUT', `/api/w/${w.id}/script`, { parts: Object.fromEntries(meta.parts.map((p) => [p, form.elements[p].value])) });
  };
  const busy = (msg) => { document.getElementById('busy').innerHTML = msg ? working(msg) : ''; for (const b of document.querySelectorAll('.actions .btn')) b.disabled = !!msg; };
  document.getElementById('review').onclick = async () => {
    busy('Reviewing all four parts against 16 rules… about 30 seconds.');
    try { await saveIfDirty(); await api('POST', `/api/w/${w.id}/diagnose`); route(); } catch (x) { busy(''); document.getElementById('err').textContent = x.message; }
  };
  const lock = document.getElementById('lock');
  if (lock) lock.onclick = async () => {
    busy('Locking your script: picking the key lines and building the prospect you will call… about 15 seconds.');
    try {
      await saveIfDirty();
      await api('POST', `/api/w/${w.id}/lock`);
      go(`#/w/${w.id}/bootcamp`);
    } catch (x) { busy(''); document.getElementById('err').textContent = x.message; }
  };
}

function review(w) {
  const d = w.diagnosis;
  const decision = Object.fromEntries(d.changes.map((c) => [c.id, true]));
  const crit = Object.fromEntries(meta.checklist.map((c) => [c.id, c]));
  const passed = d.criteria.filter((c) => c.pass).length;

  const changeCard = (c) => `
    <div class="change accepted" data-id="${c.id}">
      <div class="part-head">
        <span>${c.criteria.map((k) => `<span class="pill">${esc(crit[k]?.name || k)}</span>`).join(' ')}</span>
        <div class="toggle"><button class="yes" aria-pressed="true">Accept</button><button class="no" aria-pressed="false">Reject</button></div>
      </div>
      ${c.before ? `<div class="before">${esc(c.before)}</div>` : '<span class="label" style="margin-top: var(--s2)">Add at the end of this part</span>'}
      <div class="after">${esc(c.after)}</div>
      <div class="why">${esc(c.why)}</div>
    </div>`;

  render(`
    <span class="label">Step 2 of 3 · Script review</span>
    <div class="dark ring-score">
      <div class="big-num">${d.score}<small>/100</small></div>
      <div>
        <span class="verdict ${d.score >= 70 ? 'won' : 'lost'}">${passed} of ${d.criteria.length} rules met</span>
        <p style="margin: 0; color: #DCD3C6">${esc(d.summary)}</p>
      </div>
    </div>
    ${d.changes.length ? `<p class="lede" style="margin-top: var(--s5)">The coach suggests ${d.changes.length} edit${d.changes.length > 1 ? 's' : ''}. Accept or reject each one: only what you accept goes into your script, word for word.</p>` : '<p class="lede" style="margin-top: var(--s5)">No edits suggested. Lock it whenever you are ready.</p>'}
    ${meta.parts.map((p) => {
      const cs = d.criteria.filter((c) => c.part === p);
      const ch = d.changes.filter((c) => c.part === p);
      return `<div class="part card">
        <div class="part-head"><h3>${meta.part_names[p]}</h3><span class="pill ${cs.every((c) => c.pass) ? 'good' : 'bad'}">${cs.filter((c) => c.pass).length}/${cs.length}</span></div>
        <details class="fold"><summary>Show this part as written</summary><div class="script-text" style="margin-top: var(--s3)">${esc(w.script.parts[p].text) || '<span class="muted">(missing)</span>'}</div></details>
        <div class="checks">${cs.map((c) => `<div class="check ${c.pass ? 'pass' : 'fail'}"><span class="dot">${c.pass ? '✓' : '×'}</span><div>${esc(c.name)}${c.evidence ? `<q>${esc(c.evidence)}</q>` : ''}${c.note ? `<p>${esc(c.note)}</p>` : ''}</div></div>`).join('')}</div>
        ${p === 'discovery' && !cs.every((c) => c.pass) ? sketch('gap', 'Discovery measures this gap. Without it, the pitch has nothing to hold on to.') : ''}
        ${ch.length ? `<div class="stack" style="margin-top: var(--s4)">${ch.map(changeCard).join('')}</div>` : ''}
      </div>`;
    }).join('')}
    ${d.objections?.length ? `<div class="card part"><span class="label">Objections your prospects will likely raise</span>${d.objections.map((o) => `<div class="serif-q" style="font-size: 17px; margin-top: var(--s2)">“${esc(o)}”</div>`).join('')}<p class="note">Your bootcamp prospect will hide some of these from day 5 on.</p></div>` : ''}
    <div class="actions">
      <button class="btn" id="apply">${d.changes.length ? `Apply ${d.changes.length} accepted edits` : 'Continue'}</button>
    </div>
    <p class="err" id="err" role="alert"></p>`);

  const label = () => {
    const n = Object.values(decision).filter(Boolean).length;
    document.getElementById('apply').textContent = d.changes.length ? (n ? `Apply ${n} accepted edit${n > 1 ? 's' : ''}` : 'Keep my script as it is') : 'Continue';
  };
  for (const card of document.querySelectorAll('.change')) {
    const [yes, no] = card.querySelectorAll('.toggle button');
    const set = (v) => {
      decision[card.dataset.id] = v;
      yes.setAttribute('aria-pressed', String(v));
      no.setAttribute('aria-pressed', String(!v));
      card.classList.toggle('accepted', v);
      card.classList.toggle('rejected', !v);
      label();
    };
    yes.onclick = () => set(true);
    no.onclick = () => set(false);
  }
  document.getElementById('apply').onclick = async (e) => {
    e.target.disabled = true;
    try {
      await api('POST', `/api/w/${w.id}/apply`, { accepted: Object.keys(decision).filter((k) => decision[k]) });
      route();
    } catch (x) { document.getElementById('err').textContent = x.message; e.target.disabled = false; }
  };
}

function markKeyLines(text, lines) {
  let html = esc(text);
  for (const l of lines) {
    const e = esc(l);
    if (html.includes(e)) html = html.replace(e, `<mark>${e}</mark>`);
  }
  return html;
}

function scriptLocked(w) {
  render(`
    <span class="label">Step 2 of 3 · Locked · Version ${w.script.version}</span>
    <h2>Your script is locked.</h2>
    <p class="lede">The highlighted sentences are your key lines: the bootcamp listens for them on every call, and they tick on screen as you say them.</p>
    ${meta.parts.map((p) => `<div class="part card"><h3>${meta.part_names[p]}</h3><div class="script-text">${markKeyLines(w.script.parts[p].text, w.script.parts[p].key_lines)}</div></div>`).join('')}
    <div class="actions">
      <a class="btn" href="#/w/${w.id}/bootcamp">Go to the bootcamp</a>
      <button class="btn ghost" id="unlock">Unlock to improve it</button>
    </div>
    <p class="note">Unlocking keeps your progress. Lock it again to get new key lines.</p>`);
  document.getElementById('unlock').onclick = async () => { await api('POST', `/api/w/${w.id}/unlock`); route(); };
}

// ---------------------------------------------------------------- 3. bootcamp
async function bootcamp(w) {
  const { attempts } = await api('GET', `/api/w/${w.id}/attempts`);
  const levelMeter = (n) => `<div class="meter" aria-label="Difficulty ${n} of 4">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
  render(`
    <span class="label">Step 3 of 3</span>
    <h2>Your 7-day bootcamp.</h2>
    <p class="lede">You will be calling <b>${esc(w.persona?.name)}</b>, ${esc(w.persona?.role)}. One part of your script per day. Score ${w.pass_score} or more to unlock the next day.</p>
    ${sketch('ladder')}
    ${w.demo ? '<div class="banner calm">Demo company: every day is open so you can jump ahead. The rounds below marked “sample” were played by our test rep.</div>' : ''}
    ${w.weak_spot ? `<div class="banner"><div><b>Your coach remembers.</b> Last time this objection tripped you up: <span class="serif-q">“${esc(w.weak_spot)}”</span>. It comes back first on your next call with hidden objections.</div></div>` : ''}
    <div class="ladder">
      ${w.days.map((d) => {
        const open = d.n <= w.unlocked;
        const cls = d.passed ? 'passed' : open ? 'open' : 'locked';
        const inner = `<div class="n">${d.n}</div>
          <div><b>${esc(d.title)}</b><small>${esc(d.focus)}</small>${levelMeter(d.level)}<small>${esc(meta.aids[d.aid].name)} · ${meta.levels[d.level]} prospect${d.objections ? ` · ${d.objections} hidden objection${d.objections > 1 ? 's' : ''}` : ''}</small></div>
          <div class="best">${d.best !== null ? `${d.best}<small>${d.passed ? 'passed' : 'best so far'}</small>` : open ? '<small>Ready</small>' : '<small>Locked</small>'}</div>`;
        return open ? `<a class="rung ${cls}" href="#/w/${w.id}/day/${d.n}">${inner}</a>` : `<div class="rung ${cls}">${inner}</div>`;
      }).join('')}
    </div>
    ${attempts.length ? `<div style="margin-top: var(--s7)"><span class="label">Your rounds</span>
      ${attempts.slice(0, 8).map((a) => `<a class="rung" href="#/w/${w.id}/result/${a.id}" style="margin-top: var(--s2)">
        <div class="n" style="font-size: 26px">D${a.day}</div>
        <div><b>${esc(meta.days.find((d) => d.n === a.day)?.title)}</b><small>${new Date(a.created).toLocaleString()} · ${a.passed ? 'passed' : 'not passed'}${a.sample ? ' · sample' : ''}</small></div>
        <div class="best">${a.score}</div></a>`).join('')}</div>` : ''}
    <div class="actions"><a class="btn small ghost" href="#/w/${w.id}/script">See my locked script</a></div>`);
}

// ---------------------------------------------------------------- day + call
function dayPage(w, n) {
  const d = w.days.find((x) => x.n === n);
  if (!d) return go(`#/w/${w.id}/bootcamp`);
  if (n > w.unlocked) return render(`<h2>Day ${n} is locked.</h2><p class="lede">Pass day ${n - 1} with ${w.pass_score} or more first.</p><a class="btn" href="#/w/${w.id}/day/${w.unlocked}">Go to day ${w.unlocked}</a>`);
  render(`
    <span class="label">Day ${d.n} of 7 · ${esc(meta.aids[d.aid].name)}</span>
    <h2>${esc(d.title)}</h2>
    <p class="lede">${esc(d.focus)}</p>
    <div class="day-sketch">${sketch(`day-${d.n}`)}</div>
    <div class="grid2" style="margin-top: var(--s5)">
      <div class="card"><span class="label">Today's lesson</span><ol class="lesson">${d.lesson.map((l) => `<li>${esc(l)}</li>`).join('')}</ol></div>
      <div class="card">
        <span class="label">The call</span>
        <div class="facts">
          <div><b>${esc(w.persona?.name)}</b>${esc(w.persona?.role)}</div>
          <div><b>${meta.levels[d.level]}</b>prospect</div>
          <div><b>${d.minutes} min</b>time limit</div>
          <div><b>${w.pass_score}+</b>to pass</div>
        </div>
        <p style="margin-bottom: 0">${esc(meta.aids[d.aid].explain)}</p>
        ${d.objections ? `<p class="note">${esc(w.persona?.name)} is hiding ${d.objections} objection${d.objections > 1 ? 's' : ''}. Find ${d.objections > 1 ? 'them' : 'it'} with questions.</p>` : ''}
      </div>
    </div>
    <div class="actions">
      <button class="btn" id="start">Start the call</button>
      <a class="btn ghost" href="#/w/${w.id}/bootcamp">Back to the bootcamp</a>
    </div>
    <p class="note">Uses your microphone. Speak English, as if it were a real call.</p>
    <p class="err" id="err" role="alert"></p>`);
  document.getElementById('start').onclick = (e) => startCall(w, d, e.target);
}

async function startCall(w, d, btn) {
  btn.disabled = true;
  const err = document.getElementById('err');
  err.textContent = '';
  let s;
  try {
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    mic.getTracks().forEach((t) => t.stop());
    s = await api('POST', `/api/w/${w.id}/call`, { day: d.n });
  } catch (x) {
    err.textContent = x.name === 'NotAllowedError' ? 'Allow the microphone to start the call.' : x.message;
    btn.disabled = false;
    return;
  }

  const lines = s.aid.parts.flatMap((p) => p.key_lines);
  const aids = { reveals: 0, emergencies: 0 };
  let said = '';

  const aidPanel = () => {
    if (s.aid.level === 'none') return `<div class="memory"><div><b>From memory.</b>Nothing on screen today. You know this script.</div></div>`;
    if (s.aid.level === 'emergency') return `<span class="label">Under pressure</span>
      <p class="muted">Clean screen. If you freeze, the emergency button shows your next line. Every use costs points.</p>
      <button class="btn ink small" id="sos">Emergency: show my next line</button><div id="sos-line"></div>`;
    let i = -1;
    return s.aid.parts.map((p) => `<span class="label" style="margin-top: var(--s4)">${esc(p.name)}</span>
      ${s.aid.level === 'script' && p.text ? `<details class="fold"><summary>Full text of this part</summary><div class="script-text" style="margin: var(--s2) 0">${esc(p.text)}</div></details>` : ''}
      ${p.key_lines.map((l) => { i++; return `<div class="kl" data-i="${i}"><span class="tick"></span><div class="kl-text">${s.aid.level === 'hints' ? `${esc(hint(l))}<button data-reveal="${i}">show</button>` : esc(l)}</div></div>`; }).join('')}`).join('');
  };

  render(`
    <span class="label">Day ${d.n} · ${esc(d.title)}</span>
    <div class="call-grid">
      <div class="ring">
        <div class="orb" id="orb"></div>
        <div class="status" id="status">Dialing…</div>
        <div class="timer" id="timer">0:00 <small>/ ${s.minutes}:00</small></div>
        <p class="who">${esc(s.prospect.name)}, ${esc(s.prospect.role)}</p>
        <button class="btn ink" id="hangup">Hang up</button>
      </div>
      <div class="card aid" id="aid">${aidPanel()}</div>
    </div>`);

  const tick = () => {
    const done = new Set(linesSaid(lines, said));
    for (const el of document.querySelectorAll('.kl')) el.classList.toggle('said', done.has(Number(el.dataset.i)));
    return done;
  };
  document.getElementById('aid').addEventListener('click', (e) => {
    const r = e.target.closest('[data-reveal]');
    if (r) {
      aids.reveals++;
      r.parentElement.textContent = lines[Number(r.dataset.reveal)];
    }
  });
  const sos = document.getElementById('sos');
  if (sos) sos.onclick = () => {
    aids.emergencies++;
    const done = tick();
    const next = lines.find((_, i) => !done.has(i));
    document.getElementById('sos-line').innerHTML = `<div class="emergency-line">${esc(next || 'You have said every key line. Ask for the next step.')}</div>`;
    setTimeout(() => { const el = document.getElementById('sos-line'); if (el) el.innerHTML = ''; }, 7000);
  };

  let clock = null;
  let ended = false;
  const finish = async () => {
    if (ended) return;
    ended = true;
    clearInterval(clock);
    const conversation_id = call?.getId?.();
    call = null;
    await waitForResult(w, d, s.attempt, conversation_id, aids);
  };
  document.getElementById('hangup').onclick = () => (call ? call.endSession() : finish());

  try {
    const { Conversation } = await import(VOICE_SDK);
    call = await Conversation.startSession({
      conversationToken: s.token,
      connectionType: 'webrtc',
      overrides: s.overrides,
      onConnect: () => {
        const t0 = Date.now();
        clock = setInterval(() => {
          const el = document.getElementById('timer');
          if (el) el.firstChild.textContent = `${mmss((Date.now() - t0) / 1000)} `;
        }, 250);
      },
      onModeChange: ({ mode }) => {
        const orb = document.getElementById('orb');
        if (!orb) return;
        orb.className = `orb ${mode === 'speaking' ? 'speaking' : 'listening'}`;
        document.getElementById('status').textContent = mode === 'speaking' ? `${s.prospect.name} is talking` : 'Your turn';
      },
      onMessage: (m) => {
        if (m.source === 'user' || m.role === 'user') { said += ` ${m.message}`; tick(); }
      },
      onDisconnect: () => finish(),
      onError: (m) => console.error('voice error', m),
    });
  } catch (x) {
    ended = true;
    render(`<h2>The call could not start.</h2><p class="lede">${esc(x.message || x)}</p><a class="btn" href="#/w/${w.id}/day/${d.n}">Try again</a>`);
  }
}

async function waitForResult(w, d, attempt, conversation_id, aids) {
  render(`<div class="ring" style="position: static"><div class="orb listening"></div><div class="status">Your coach is scoring the call…</div></div><p class="err center" id="err" role="alert" style="text-align:center"></p>`);
  try {
    for (let i = 0; i < 40; i++) {
      const r = await api('POST', `/api/w/${w.id}/result`, { attempt, conversation_id, aids });
      if (r.status !== 202) {
        const fresh = await api('GET', `/api/w/${w.id}`);
        steps(fresh, 'bootcamp');
        return result(fresh, d, r);
      }
      await new Promise((ok) => setTimeout(ok, 3000));
    }
    throw new Error('The transcript is taking too long. Check your rounds on the bootcamp page in a minute.');
  } catch (x) {
    document.getElementById('err').innerHTML = `${esc(x.message)}<br><br><a class="btn ghost" href="#/w/${w.id}/bootcamp">Back to the bootcamp</a>`;
  }
}

async function pastResult(w, attemptId) {
  const { attempts } = await api('GET', `/api/w/${w.id}/attempts`);
  const a = attempts.find((x) => x.id === attemptId);
  if (!a) return go(`#/w/${w.id}/bootcamp`);
  result(w, w.days.find((d) => d.n === a.day), a);
}

function result(w, d, r) {
  const next = w.days.find((x) => x.n === d.n + 1);
  const nav = `<div class="actions">
      ${r.passed && next ? `<a class="btn" href="#/w/${w.id}/day/${next.n}">Go to day ${next.n}: ${esc(next.title)}</a>` : ''}
      ${r.passed && !next ? `<a class="btn" href="#/w/${w.id}/bootcamp">You graduated. Back to the bootcamp</a>` : ''}
      <a class="btn ${r.passed ? 'ghost' : ''}" href="#/w/${w.id}/day/${d.n}">${r.passed ? 'Play this day again' : 'Try this day again'}</a>
      <a class="btn ghost" href="#/w/${w.id}/bootcamp">Bootcamp</a>
    </div>`;
  if (r.empty) {
    return render(`<h2>That call was too short to score.</h2><p class="lede">Stay on for at least 20 seconds and say a few things. The prospect needs something to react to.</p>${nav}`);
  }
  const pips = (n) => `<div class="pips ${n === 2 ? 'full' : ''}"><i class="${n >= 1 ? 'on' : ''}"></i><i class="${n >= 2 ? 'on' : ''}"></i></div>`;
  const b = r.breakdown || {};
  render(`
    <span class="label">Day ${d.n} · ${esc(d.title)}${r.sample ? ' · sample round' : ''}</span>
    <div class="dark score-card">
      <div class="big-num">${r.score}<small>/100</small></div>
      <div>
        <span class="verdict ${r.passed ? 'won' : 'lost'}">${r.passed ? `Passed day ${d.n}` : `Need ${w.pass_score} to pass`}</span>
        ${d.parts.some((p) => p === 'pitch' || p === 'close') ? `<span class="verdict plain">${r.closed ? 'Next step booked' : 'No next step'}</span>` : ''}
        <div class="stats">
          ${b.adherence !== null && b.adherence !== undefined ? `<div><b>${b.adherence}%</b>key lines said</div>` : ''}
          <div><b>${r.talk_ratio}%</b>you talked</div>
          <div><b>${r.questions}</b>questions</div>
          <div><b>${mmss(r.seconds)}</b>call length</div>
        </div>
        <p class="note" style="color: #9C9184">Checklist ${b.judged}/100${b.adherence !== null && b.adherence !== undefined ? ` × 80% + script ${b.adherence}% × 20%` : ''}${b.aid_penalty ? ` − ${b.aid_penalty} for screen help` : ''}${d.aid === 'none' ? ' · graduation also needs 50% of key lines' : ''}</p>
      </div>
    </div>
    ${r.biggest_miss?.instead ? `<div class="card miss part"><span class="label">The line that cost you most</span>
      ${r.biggest_miss.quote ? `<div class="said-q">“${esc(r.biggest_miss.quote)}”</div>` : ''}
      <div class="instead">Say instead: “${esc(r.biggest_miss.instead)}”</div></div>` : ''}
    ${r.objection_missed ? `<div class="banner part"><div><b>Coach's note:</b> <span class="serif-q">“${esc(r.objection_missed)}”</span> got past you. It comes back first on your next call with hidden objections.</div></div>` : ''}
    <div class="stack part">
      ${r.criteria.map((c) => `<div class="card crit">${pips(c.score)}<div><b>${esc(c.name)}</b><p>${esc(c.why)}</p>${c.quote ? `<q>${esc(c.quote)}</q>` : ''}</div></div>`).join('')}
    </div>
    ${r.key_lines?.length ? `<div class="card part"><span class="label">Your key lines today</span>${r.key_lines.map((k) => `<div class="kl ${k.said ? 'said' : ''}"><span class="tick"></span><div>${esc(k.line)}</div></div>`).join('')}
      ${r.aids && (r.aids.reveals || r.aids.emergencies) ? `<p class="note">Screen help used: ${r.aids.reveals} hint reveal${r.aids.reveals === 1 ? '' : 's'}, ${r.aids.emergencies} emergency line${r.aids.emergencies === 1 ? '' : 's'}.</p>` : ''}</div>` : ''}
    ${r.drill ? `<div class="drill part"><span class="label">Next round, practice this</span>${esc(r.drill)}</div>` : ''}
    <details class="fold part"><summary>Full transcript</summary>
      ${r.turns.map((t) => `<div class="turn ${t.role}"><span>${t.role === 'rep' ? 'You' : esc(w.persona?.name || 'Prospect')}</span><div>${esc(t.text)}</div></div>`).join('')}
    </details>
    ${nav}`);
}
