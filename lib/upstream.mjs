// Every outside call goes through here.
//
// On a Sprite: calls go through the Sprites connector gateway. The ElevenLabs and
// OpenRouter keys live in the Fly org and never touch this machine.
//   https://api.sprites.dev/v1/gateway/<provider>/<connection_id>/<path>
// On a laptop (MODE=direct): calls go straight to the provider with keys from .env,
// so the app can be developed before the Sprite exists.

const GATEWAY = 'https://api.sprites.dev/v1/gateway';

const DIRECT = {
  elevenlabs: { base: 'https://api.elevenlabs.io', auth: () => ({ 'xi-api-key': need('ELEVENLABS_API_KEY') }) },
  openrouter: { base: 'https://openrouter.ai/api', auth: () => ({ Authorization: `Bearer ${need('OPENROUTER_API_KEY')}` }) },
};

function need(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export const mode = () => (process.env.MODE === 'direct' ? 'direct' : 'gateway');

// Gateway prefixes, discovered once from /v1/gateway/list (or forced with
// GATEWAY_ELEVENLABS / GATEWAY_OPENROUTER, e.g. ".../gateway/openrouter/conn_123/api").
let discovered = null;

async function prefix(provider) {
  const forced = process.env[`GATEWAY_${provider.toUpperCase()}`];
  if (forced) return forced.replace(/\/$/, '');
  if (!discovered) {
    const r = await fetch(`${GATEWAY}/list`, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`gateway list ${r.status}: ${(await r.text()).slice(0, 300)}`);
    discovered = await r.json();
  }
  const list = Array.isArray(discovered) ? discovered : discovered.connections ?? discovered.data ?? [];
  const c = list.find((x) => String(x.provider ?? x.slug ?? '').toLowerCase().includes(provider));
  if (!c) throw new Error(`No ${provider} connector visible to this Sprite. Add it in Fly dashboard → Sprites → Connectors.`);
  const id = c.connection_id ?? c.id;
  // OpenRouter's API lives under /api on its host; the gateway forwards paths verbatim.
  return `${GATEWAY}/${c.provider ?? provider}/${id}${provider === 'openrouter' ? '/api' : ''}`;
}

export async function call(provider, path, { method = 'GET', body, timeoutMs = 20000 } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  let url;
  if (mode() === 'direct') {
    url = DIRECT[provider].base + path;
    Object.assign(headers, DIRECT[provider].auth());
  } else {
    url = (await prefix(provider)) + path;
  }
  const r = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { ok: r.ok, status: r.status, json, text };
}

export async function gatewayList() {
  const r = await fetch(`${GATEWAY}/list`, { signal: AbortSignal.timeout(10000) });
  return { status: r.status, body: await r.text() };
}
