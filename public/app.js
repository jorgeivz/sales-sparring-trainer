import { Conversation } from 'https://cdn.jsdelivr.net/npm/@elevenlabs/client@1.37.1/+esm';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const show = (id) => {
  for (const v of ['setup', 'call', 'wait', 'result']) $(v).hidden = v !== id;
  window.scrollTo({ top: 0 });
};

const state = { preset: null, level: 'skeptical', convo: null, call: null, tick: null };

async function api(path, body) {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const j = await r.json().catch(() => ({}));
  if (!r.ok && r.status !== 202) throw new Error(j.error || `Error ${r.status}`);
  return { status: r.status, ...j };
}

// ---------- setup ----------
const cfg = await api('/api/config');
$('presets').innerHTML = cfg.presets
  .map((p) => `<button class="preset" data-id="${p.id}" aria-pressed="false"><b>${esc(p.prospect.split(',')[0])}</b><span>${esc(p.product)}</span></button>`)
  .join('');
$('levels').innerHTML = Object.entries(cfg.levels)
  .map(([k, v]) => `<button data-level="${k}" aria-pressed="${k === state.level}">${esc(v)}</button>`)
  .join('');

function pickPreset(id) {
  state.preset = id;
  for (const b of document.querySelectorAll('.preset')) b.setAttribute('aria-pressed', String(b.dataset.id === id));
  if (id) $('custom').open = false;
}
pickPreset(cfg.presets[0].id);
$('presets').addEventListener('click', (e) => {
  const b = e.target.closest('.preset');
  if (b) pickPreset(b.dataset.id);
});
$('custom').addEventListener('toggle', () => { if ($('custom').open) pickPreset(null); });
$('levels').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.level = b.dataset.level;
  for (const x of $('levels').children) x.setAttribute('aria-pressed', String(x === b));
});

async function loadHistory() {
  const h = await fetch('/api/history').then((r) => r.json()).then((j) => j.calls || []).catch(() => []);
  $('history').hidden = !h.length;
  $('history-rows').innerHTML = h
    .map((c) => `<div class="hrow"><span>${esc(c.prospect.split(',')[0])} · ${esc(c.level)} · ${c.closed ? 'closed' : 'not closed'}</span><b>${c.score}</b></div>`)
    .join('');
}
loadHistory();

// ---------- call ----------
$('start').addEventListener('click', async () => {
  $('setup-err').textContent = '';
  const body = state.preset
    ? { preset: state.preset, level: state.level }
    : { product: $('f-product').value, prospect: $('f-prospect').value, concern: $('f-concern').value, level: state.level, voice: 'male' };
  $('start').disabled = true;
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => s.getTracks().forEach((t) => t.stop()));
    const s = await api('/api/session', body);
    state.call = s;
    $('who').textContent = `You are calling ${s.summary.prospect}. You sell: ${s.summary.product}.`;
    $('status').textContent = 'Dialing…';
    show('call');
    state.convo = await Conversation.startSession({
      conversationToken: s.token,
      connectionType: 'webrtc',
      overrides: s.overrides,
      onConnect: () => startTimer(),
      onModeChange: ({ mode }) => {
        $('orb').className = `orb ${mode === 'speaking' ? 'speaking' : 'listening'}`;
        $('status').textContent = mode === 'speaking' ? 'Prospect talking' : 'Your turn';
      },
      onDisconnect: () => finish(),
      onError: (m) => console.error('voice error', m),
    });
  } catch (e) {
    show('setup');
    $('setup-err').textContent = e.name === 'NotAllowedError' ? 'Allow the microphone to start the call.' : e.message;
  } finally {
    $('start').disabled = false;
  }
});

function startTimer() {
  const t0 = Date.now();
  clearInterval(state.tick);
  state.tick = setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    $('timer').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }, 250);
}

$('hangup').addEventListener('click', () => state.convo?.endSession());

let finishing = false;
async function finish() {
  if (finishing || !state.call) return;
  finishing = true;
  clearInterval(state.tick);
  const conversation_id = state.convo?.getId?.();
  state.convo = null;
  show('wait');
  $('wait-err').textContent = '';
  try {
    for (let i = 0; i < 40; i++) {
      const r = await api('/api/result', { id: state.call.id, conversation_id });
      if (r.status !== 202) return renderResult(r);
      await new Promise((ok) => setTimeout(ok, 3000));
    }
    throw new Error('The transcript is taking too long. Try again in a minute.');
  } catch (e) {
    $('wait-err').innerHTML = `${esc(e.message)} <button class="btn ghost" id="back">Back</button>`;
    $('back').onclick = () => show('setup');
  } finally {
    finishing = false;
  }
}

// ---------- result ----------
function renderResult(r) {
  const s = state.call.summary;
  const again = `<div class="actions">
      <button class="btn" id="again">Go again</button>
      <button class="btn ghost" id="harder">${state.level === 'brutal' ? 'New prospect' : 'Go again, harder'}</button>
    </div>`;
  if (r.empty) {
    $('result').innerHTML = `<h2>That call was too short to score.</h2>
      <p class="lede">Stay on for at least 20 seconds and say a few things. The prospect needs something to react to.</p>${again}`;
  } else {
    const pips = (n) => `<div class="pips ${n === 2 ? 'full' : ''}"><i class="${n >= 1 ? 'on' : ''}"></i><i class="${n >= 2 ? 'on' : ''}"></i></div>`;
    $('result').innerHTML = `
      <div class="score-card">
        <div class="score">${r.score}<small>/100</small></div>
        <div>
          <span class="verdict ${r.closed ? 'won' : 'lost'}">${r.closed ? 'Next step booked' : 'No next step'}</span>
          <div class="stats">
            <div><b>${r.talk_ratio}%</b>you talked</div>
            <div><b>${r.questions}</b>questions asked</div>
            <div><b>${Math.floor(r.seconds / 60)}:${String(Math.round(r.seconds % 60)).padStart(2, '0')}</b>call length</div>
          </div>
        </div>
      </div>
      ${r.biggest_miss?.instead ? `<div class="miss">
        <span class="label">The line that cost you most</span>
        ${r.biggest_miss.quote ? `<div class="said">“${esc(r.biggest_miss.quote)}”</div>` : ''}
        <div class="instead">Say instead: “${esc(r.biggest_miss.instead)}”</div>
      </div>` : ''}
      <div class="criteria">
        ${r.criteria.map((c) => `<div class="crit">${pips(c.score)}<div><b>${esc(c.name)}</b><p>${esc(c.why)}</p>${c.quote ? `<q>${esc(c.quote)}</q>` : ''}</div></div>`).join('')}
      </div>
      <div class="drill"><span class="label">Next round, practice this</span>${esc(r.drill)}</div>
      <p class="note">The hidden objection was: ${esc(s.concern)}</p>
      <details class="transcript"><summary>Full transcript</summary>
        ${r.turns.map((t) => `<div class="turn ${t.role}"><span>${t.role === 'rep' ? 'You' : 'Prospect'}</span><div>${esc(t.text)}</div></div>`).join('')}
      </details>
      ${again}`;
  }
  show('result');
  $('again').onclick = () => { show('setup'); loadHistory(); };
  $('harder').onclick = () => {
    const order = ['warm', 'skeptical', 'brutal'];
    const next = order[Math.min(order.indexOf(state.level) + 1, 2)];
    $('levels').querySelector(`[data-level="${next}"]`).click();
    if (state.level === 'brutal' && state.preset) {
      const i = cfg.presets.findIndex((p) => p.id === state.preset);
      pickPreset(cfg.presets[(i + 1) % cfg.presets.length].id);
    }
    show('setup');
    loadHistory();
  };
}
